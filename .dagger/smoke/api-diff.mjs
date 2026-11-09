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

const failures = []

const packages = JSON.parse(
  execFileSync(
    'pnpm',
    ['-r', '--include-workspace-root', 'ls', '--json', '--depth', '-1'],
    { encoding: 'utf8' },
  ),
).filter(({ name, version, path: directory, private: isPrivate }) => {
  if (!name || !version || isPrivate) {
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
          const change = JSON.parse(
            fs.readFileSync(path.join(changes, file), 'utf8'),
          )

          return (
            Array.isArray(change.changes) ? change.changes : [change]
          ).filter((entry) => {
            if (entry !== null && typeof entry === 'object') {
              return true
            }

            failures.push(`change/${file}: has an entry that is not a change`)
            return false
          })
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

// jsii-reflect loads the peers like the dependencies, and only jsii modules.
const withoutPeers = (manifest, directory) => {
  for (const name of Object.keys(manifest.peerDependencies ?? {})) {
    if (!fs.existsSync(path.join(directory, 'node_modules', name, '.jsii'))) {
      delete manifest.peerDependencies[name]
    }
  }

  if (!Object.keys(manifest.peerDependencies ?? {}).length) {
    delete manifest.peerDependencies
  }

  return manifest
}

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

  withoutPeers(manifest, directory)

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
      : typeof error.code === 'number'
        ? `exited with ${error.code}`
        : error.message)
  )
}

const everything = (error) => `${error.stdout ?? ''}${error.stderr ?? ''}`

const npmEnv = {
  ...process.env,
  // A packument cached before a release does not list the release.
  npm_config_prefer_online: 'true',
}

const fetchRelease = async ({ name, version, path: directory }, index) => {
  const unpacked = path.join(scratch, `${index}-release`)
  const root = path.join(unpacked, 'node_modules')
  const staged = path.join(root, name)

  try {
    fs.rmSync(unpacked, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(staged), { recursive: true })

    await exec(
      'npm',
      ['pack', `${name}@${version}`, '--pack-destination', unpacked],
      { timeout, env: npmEnv },
    )

    const tarball = fs.readdirSync(unpacked).find((f) => f.endsWith('.tgz'))

    await exec('tar', ['-xzf', path.join(unpacked, tarball), '-C', unpacked])
    fs.renameSync(path.join(unpacked, 'package'), staged)

    if (!fs.existsSync(path.join(staged, '.jsii'))) {
      throw new Error(`${name}@${version} ships no .jsii`)
    }

    const manifestPath = path.join(staged, 'package.json')

    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        withoutPeers(
          JSON.parse(
            withoutDependencies(
              fs.readFileSync(manifestPath, 'utf8'),
              directory,
            ),
          ),
          directory,
        ),
        null,
        2,
      ),
    )

    const workingRoot = rootOf(index)
    const link = (entry, ...scope) => {
      const target = path.join(root, ...scope, entry)

      if (!fs.existsSync(target)) {
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.symlinkSync(
          fs.realpathSync(path.join(workingRoot, ...scope, entry)),
          target,
        )
      }
    }

    for (const entry of fs.readdirSync(workingRoot)) {
      if (entry.startsWith('@')) {
        for (const child of fs.readdirSync(path.join(workingRoot, entry))) {
          link(child, entry)
        }
      } else {
        link(entry)
      }
    }
  } catch (error) {
    return { error: cause(error) }
  }

  return { directory: staged }
}

const published = async ({ name }) => {
  try {
    const { stdout } = await exec('npm', ['view', name, 'versions', '--json'], {
      timeout,
      env: npmEnv,
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

// Without the release there is nothing to compare with, which passes for a
// package that was never released, and only then.
const attempt = async (subject, index) => {
  const release = await fetchRelease(subject, index)

  if (release.error) {
    return { missing: release.error, registry: await published(subject) }
  }

  try {
    const { stdout, stderr } = await exec(
      jsiiDiff,
      [release.directory, stagedDirs[index]],
      {
        timeout,
        env: {
          ...process.env,
          JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION: '1',
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

// The registry may lag right after a publish.
const lagging = ({ code, missing, registry }) =>
  code === 100 || (missing && released(registry.versions ?? []).length > 0)

const verdict = async (subject, index) => {
  const { name, version } = subject

  if (!stagedDirs[index]) {
    return
  }

  let result = await attempt(subject, index)

  if (lagging(result)) {
    await new Promise((resolve) => setTimeout(resolve, pause))
    result = await attempt(subject, index)
  }

  const { code, output, missing, registry } = result

  if (missing) {
    if (registry.error) {
      return `${name}: no comparison, since the registry did not answer: ${registry.error}`
    }

    const versions = released(registry.versions)

    if (!versions.length) {
      return
    }

    return `${name}: no comparison, since ${
      registry.versions.includes(version)
        ? `the published ${name}@${version} cannot be used`
        : `${name}@${version} is not among its ${versions.length} published versions`
    } (${missing})`
  }

  if (code === 0) {
    return
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
