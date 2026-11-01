import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'

const run = (command, args, options = {}) =>
  execFileSync(command, args, { encoding: 'utf8', stdio: 'pipe', ...options })

const reason = (error) => String(error.stderr || error.message).trim()

const setup = (step, action) => {
  try {
    return action()
  } catch (error) {
    console.error(`smoke setup failed: ${step}: ${reason(error)}`)
    process.exit(1)
  }
}

const workspace = process.cwd()
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'))
const tarballs = path.join(scratch, 'tarballs')
const consumer = path.join(scratch, 'consumer')

fs.mkdirSync(tarballs)
fs.mkdirSync(consumer)

const packages = setup('listing the workspace packages', () =>
  JSON.parse(
    run('pnpm', [
      '-r',
      '--include-workspace-root',
      'ls',
      '--json',
      '--depth',
      '-1',
    ]),
  ).filter(
    ({ name, version, private: isPrivate }) => name && version && !isPrivate,
  ),
)

const projen = JSON.parse(
  fs.readFileSync(path.join(workspace, 'package.json'), 'utf8'),
).devDependencies?.projen

const hasSmoke = ({ path: directory }) =>
  fs.existsSync(path.join(directory, 'smoke.mjs'))

// A package that ships an assembly has to say how to smoke it.
const unscripted = packages
  .filter(
    (subject) =>
      !hasSmoke(subject) && fs.existsSync(path.join(subject.path, '.jsii')),
  )
  .map(({ name }) => name)

// A canary goes through the pipeline too, packed with npm since it has no
// workspace. If it fails, the check is broken, and no package is to blame.
const canary = path.join(scratch, 'canary')

fs.mkdirSync(canary)
fs.writeFileSync(
  path.join(canary, 'package.json'),
  JSON.stringify({
    name: 'smoke-canary',
    version: '0.0.0',
    type: 'module',
    main: 'index.js',
  }),
)
fs.writeFileSync(path.join(canary, 'index.js'), 'export const canary = true\n')
fs.writeFileSync(
  path.join(canary, 'smoke.mjs'),
  [
    "import assert from 'node:assert/strict'",
    "import { canary } from 'smoke-canary'",
    '',
    'assert.equal(canary, true)',
    '',
  ].join('\n'),
)

const subjects = [
  { name: 'smoke-canary', path: canary, canary: true },
  ...packages.filter(hasSmoke),
]

const manifestOf = (directory) =>
  JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))

// A publish builds the inlining packages afresh, with `npm_command=publish`,
// which leaves what they inline out of the manifest they publish. Their build
// runs the same way here and restores the manifest after the pack.
const pack = ({ name, path: directory, canary }) => {
  const before = new Set(fs.readdirSync(tarballs))
  const { scripts = {}, dependencies = {} } = manifestOf(directory)
  const inlines = /inline-dependencies/.test(scripts.postpublish ?? '')

  if (inlines) {
    run(
      'pnpm',
      [
        '--config.verify-deps-before-run=false',
        'exec',
        'sh',
        '-c',
        `export npm_command=publish; ${scripts.prepublishOnly}`,
      ],
      {
        cwd: directory,
      },
    )
  }

  try {
    if (canary) {
      run('npm', ['pack', '--pack-destination', tarballs], { cwd: directory })
    } else {
      run('pnpm', ['pack', '--pack-destination', tarballs], { cwd: directory })
    }
  } finally {
    if (inlines) {
      run(
        'pnpm',
        [
          '--config.verify-deps-before-run=false',
          'exec',
          'sh',
          '-c',
          scripts.postpublish,
        ],
        { cwd: directory },
      )
    }
  }

  const [tarball] = fs.readdirSync(tarballs).filter((file) => !before.has(file))
  const published =
    JSON.parse(
      run('tar', [
        '-xzOf',
        path.join(tarballs, tarball),
        'package/package.json',
      ]),
    ).dependencies ?? {}

  return {
    name,
    file: `file:${path.join(tarballs, tarball)}`,
    inlined: Object.keys(dependencies).filter(
      (dependency) => !(dependency in published),
    ),
  }
}

// A tarball's `workspace:*` dependencies become exact versions that may not be
// on the registry, so every sibling resolves to its own tarball.
const packed = setup('packing', () => [subjects[0], ...packages].map(pack))
const files = Object.fromEntries(packed.map(({ name, file }) => [name, file]))
const installed = Object.fromEntries(
  subjects.map(({ name }) => [name, files[name]]),
)

setup('installing the tarballs', () => {
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: { ...(projen && { projen }), ...installed },
      overrides: files,
    }),
  )

  run('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts'], {
    cwd: consumer,
  })
})

const plain = { ...process.env, NODE_OPTIONS: '' }

const smoke = ({ name, path: directory }) => {
  const script = path.join(consumer, `smoke-${name.replace(/\W/g, '-')}.mjs`)

  fs.copyFileSync(path.join(directory, 'smoke.mjs'), script)
  run('node', [script], { cwd: consumer, env: plain })
}

// An assembly may be a redirect to a compressed file beside it.
const readAssembly = (file) => {
  const contents = JSON.parse(fs.readFileSync(file, 'utf8'))

  if (contents.schema !== 'jsii/file-redirect') {
    return contents
  }

  return JSON.parse(
    zlib
      .gunzipSync(
        fs.readFileSync(path.join(path.dirname(file), contents.filename)),
      )
      .toString('utf8'),
  )
}

// Every class and enum the assembly lists has to be an export of the package.
const exportsOf = ({ name, path: directory }) => {
  const probe = `
    const namespace = await import(process.argv[1])
    console.log(JSON.stringify(Object.keys(namespace)))
  `
  const exported = JSON.parse(
    run('node', ['--input-type=module', '-e', probe, name], {
      cwd: consumer,
      env: plain,
    }),
  )
  const assembly = path.join(consumer, 'node_modules', name, '.jsii')

  if (!fs.existsSync(assembly)) {
    // A package that declares jsii has to ship what jsii writes.
    if ('jsii' in manifestOf(directory)) {
      throw new Error('ships no assembly')
    }

    if (!exported.length) {
      throw new Error('exports nothing')
    }

    return
  }

  const { name: prefix, types } = readAssembly(assembly)
  const missing = [
    ...new Set(
      Object.entries(types)
        .filter(([, { kind }]) => kind === 'class' || kind === 'enum')
        .map(([fqn]) => fqn.slice(prefix.length + 1).split('.')[0])
        .filter((exportName) => !exported.includes(exportName)),
    ),
  ]

  if (missing.length) {
    throw new Error(`does not export ${missing.join(', ')}`)
  }
}

const verdict = (subject) => {
  try {
    smoke(subject)
    exportsOf(subject)

    return []
  } catch (error) {
    return [`${subject.name}: ${reason(error)}`]
  }
}

const [canaryFailure] = verdict(subjects[0])

if (canaryFailure) {
  console.error(
    `the smoke check is broken, and no package is to blame: ${canaryFailure}`,
  )
  process.exit(1)
}

const failures = [
  ...unscripted.map((name) => `${name}: has no smoke.mjs`),
  ...subjects.slice(1).flatMap(verdict),
]

if (failures.length) {
  console.error(
    `The published packages fail their smoke test:\n${failures.join('\n')}`,
  )
  process.exit(1)
}

console.log(
  `Smoked ${subjects
    .slice(1)
    .map(({ name }) => name)
    .join(', ')}.`,
)

for (const { name, inlined } of packed.filter(
  ({ inlined }) => inlined.length,
)) {
  console.log(`${name} publishes without ${inlined.join(', ')}.`)
}

const unsmoked = packages
  .filter((subject) => !hasSmoke(subject))
  .map(({ name }) => name)

if (unsmoked.length) {
  console.log(`Not smoked, with no assembly: ${unsmoked.join(', ')}.`)
}
