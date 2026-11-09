import { execFile, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)

const workspace = process.cwd()
const jsiiDiff = path.join(workspace, 'node_modules', '.bin', 'jsii-diff')
const concurrency = 8
const timeout = 300_000
const pause = Number(process.env.API_DIFF_RETRY_DELAY ?? 30_000)

const { withoutDependencies } = await import(
  pathToFileURL(path.join(workspace, 'scripts', 'inline-manifest.mjs'))
)

// Its runtime dependencies are not jsii modules, so jsii-reflect cannot load it.
const skipped = new Set(['@langri-sha/projen-project'])

const failures = []

const packages = JSON.parse(
  execFileSync(
    'pnpm',
    ['-r', '--include-workspace-root', 'ls', '--json', '--depth', '-1'],
    { encoding: 'utf8' },
  ),
).filter(({ name, version, path: directory, private: isPrivate }) => {
  if (!name || !version || isPrivate || skipped.has(name)) {
    return false
  }

  const { jsii } = JSON.parse(
    fs.readFileSync(path.join(directory, 'package.json'), 'utf8'),
  )

  if (jsii === undefined) {
    return false
  }

  const missing = ['.jsii', 'dist/index.js'].filter(
    (file) => !fs.existsSync(path.join(directory, file)),
  )

  if (missing.length) {
    failures.push(
      `${name}: has a jsii configuration but no ${missing.join(' or ')}. Build it`,
    )
    return false
  }

  return true
})

const changes = path.join(workspace, 'change')
const pending = fs.existsSync(changes)
  ? fs
      .readdirSync(changes)
      .filter((file) => file.endsWith('.json'))
      .flatMap((file) => {
        try {
          return [JSON.parse(fs.readFileSync(path.join(changes, file), 'utf8'))]
        } catch (error) {
          failures.push(`change/${file}: ${error.message}`)
          return []
        }
      })
  : []

// A break takes a minor while a package is below 1.0, and a major after.
const releasing = (version) =>
  Number(version.split('.')[0]) < 1 ? ['minor', 'major'] : ['major']

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'api-diff-'))

const rootOf = (index) => path.join(scratch, String(index), 'node_modules')

// What a publish ships: the assembly, the build, and the manifest without the
// dependencies that are inlined and with `publishConfig` applied.
const place = ({ name, path: directory }, index) => {
  const staged = path.join(rootOf(index), name)

  fs.mkdirSync(staged, { recursive: true })

  for (const file of ['.jsii', '.jsii.gz']) {
    if (fs.existsSync(path.join(directory, file))) {
      fs.copyFileSync(path.join(directory, file), path.join(staged, file))
    }
  }

  const manifest = JSON.parse(
    withoutDependencies(
      fs.readFileSync(path.join(directory, 'package.json'), 'utf8'),
      directory,
    ),
  )
  const { main, types } = manifest.publishConfig ?? {}

  fs.writeFileSync(
    path.join(staged, 'package.json'),
    JSON.stringify(
      {
        ...manifest,
        main: main ?? manifest.main,
        types: types ?? manifest.types,
      },
      null,
      2,
    ),
  )

  // jsii-reflect finds a dependency through the real path of its `main`, which
  // leads back to the workspace if `dist` is a link.
  fs.cpSync(path.join(directory, 'dist'), path.join(staged, 'dist'), {
    recursive: true,
  })

  return staged
}

const staging = (subject, step) => {
  try {
    return step()
  } catch (error) {
    failures.push(`${subject.name}: cannot be staged: ${error.message}`)
  }
}

const stagedDirs = packages.map((subject, index) =>
  staging(subject, () => place(subject, index)),
)
const stagedByDirectory = new Map(
  packages.flatMap(({ path: directory }, index) =>
    stagedDirs[index] ? [[fs.realpathSync(directory), stagedDirs[index]]] : [],
  ),
)

const linkModules = ({ path: directory }, index) => {
  const root = rootOf(index)
  const modules = path.join(directory, 'node_modules')

  if (!fs.existsSync(modules)) {
    return
  }

  const link = (entry, ...scope) => {
    const target = path.join(root, ...scope, entry)

    if (!fs.existsSync(target)) {
      const source = fs.realpathSync(path.join(modules, ...scope, entry))

      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.symlinkSync(stagedByDirectory.get(source) ?? source, target)
    }
  }

  for (const entry of fs.readdirSync(modules)) {
    if (entry.startsWith('@')) {
      for (const child of fs.readdirSync(path.join(modules, entry))) {
        link(child, entry)
      }
    } else if (!entry.startsWith('.')) {
      link(entry)
    }
  }
}

packages.forEach((subject, index) => {
  if (stagedDirs[index]) {
    staging(subject, () => linkModules(subject, index))
  }
})

// The line that says why a child failed, never one of npm's warnings.
const cause = (error) => {
  if (error.killed) {
    return `timed out after ${timeout / 1000}s (${error.signal})`
  }

  const lines = `${error.stderr ?? ''}\n${error.stdout ?? ''}`
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    lines.find((line) => /npm error|Error/.test(line)) ??
    lines[0] ??
    (error.signal
      ? `killed by ${error.signal}`
      : error.code != null
        ? `exited with ${error.code}`
        : error.message)
  )
}

const everything = (error) => `${error.stdout ?? ''}${error.stderr ?? ''}`

const compare = async ({ name, version }, staged) => {
  try {
    const { stdout, stderr } = await exec(
      jsiiDiff,
      [`npm:${name}@${version}`, staged],
      {
        timeout,
        env: {
          ...process.env,
          JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION: '1',
          // A packument cached before a release does not list the release.
          npm_config_prefer_online: 'true',
        },
      },
    )

    return { code: 0, output: `${stdout}${stderr}` }
  } catch (error) {
    return {
      code: error.killed ? null : error.code,
      output: everything(error).trim(),
      cause: cause(error),
    }
  }
}

const published = async ({ name }) => {
  try {
    const { stdout } = await exec('npm', ['view', name, 'versions', '--json'], {
      timeout,
    })

    return { versions: [JSON.parse(stdout)].flat() }
  } catch (error) {
    return /E404/.test(everything(error))
      ? { versions: [] }
      : { error: cause(error) }
  }
}

// A prerelease such as 0.0.0-stage is what a package holds before its first release.
const released = (versions) => versions.filter((v) => !v.includes('-'))

// jsii-diff skips the comparison, and succeeds, when it cannot find the
// release. That is right for a package that was never released, and only then.
const attempt = async (subject, staged) => {
  const result = await compare(subject, staged)

  return result.code === 0 && /Skipping analysis/.test(result.output)
    ? { ...result, registry: await published(subject) }
    : result
}

// The registry may lag right after a publish.
const lagging = ({ version }, { code, registry }) =>
  code === 100 ||
  (registry?.versions &&
    released(registry.versions).length > 0 &&
    !registry.versions.includes(version))

const verdict = async (subject, index) => {
  const { name, version } = subject
  const staged = stagedDirs[index]

  if (!staged) {
    return
  }

  let result = await attempt(subject, staged)

  if (lagging(subject, result)) {
    await new Promise((resolve) => setTimeout(resolve, pause))
    result = await attempt(subject, staged)
  }

  const { code, output, registry } = result

  if (code === 0 && !registry) {
    return
  }

  if (code === 0) {
    if (registry.error) {
      return `${name}: no comparison, since the registry did not answer: ${registry.error}`
    }

    const versions = released(registry.versions)

    if (!versions.length) {
      return
    }

    return `${name}: no comparison, since ${
      registry.versions.includes(version)
        ? `jsii-diff skipped the published ${name}@${version}`
        : `${name}@${version} is not among its ${versions.length} published versions`
    }`
  }

  if (code === 1) {
    const needed = releasing(version)

    if (
      pending.some(
        ({ packageName, type }) =>
          packageName === name && needed.includes(type),
      )
    ) {
      return
    }

    const [first] = output.match(/^err .*$/m) ?? ['an incompatible change']

    return `${name}: ${first.replace(/^err\s+-\s+/, '')}. Add a ${needed[0]} change file: pnpm change`
  }

  return `${name}: jsii-diff failed: ${result.cause}`
}

const started = Date.now()
let next = 0

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next < packages.length) {
      const index = next++
      const failure = await verdict(packages[index], index)

      if (failure) {
        failures.push(failure)
      }
    }
  }),
)

fs.rmSync(scratch, { recursive: true, force: true })

const seconds = ((Date.now() - started) / 1000).toFixed(1)

if (failures.length) {
  console.error(
    `The packages fail their comparison with the release:\n${failures.sort().join('\n')}`,
  )
  process.exit(1)
}

console.log(
  `Compared ${packages.length} packages with their releases in ${seconds}s.`,
)
