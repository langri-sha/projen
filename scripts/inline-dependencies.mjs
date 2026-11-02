import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import webpack from '@langri-sha/webpack'

const packageDir = process.cwd()
const distDir = path.join(packageDir, 'dist')
const manifestPath = path.join(packageDir, 'package.json')
const stashPath = path.join(
  packageDir,
  'node_modules',
  '.inline-dependencies.package.json',
)
const entry = path.join(distDir, 'index.js')

const readManifest = () => fs.readFileSync(manifestPath, 'utf8')

const workspaceEntries = (manifest) => {
  const entries = {}

  for (const [name, spec] of Object.entries(manifest.dependencies ?? {})) {
    const directory = path.join(packageDir, 'node_modules', name)
    const local =
      fs.existsSync(directory) &&
      path.dirname(fs.realpathSync(directory)) === path.dirname(packageDir)

    if (!spec.startsWith('workspace:') && !local) {
      continue
    }

    const dependency = JSON.parse(
      fs.readFileSync(path.join(directory, 'package.json'), 'utf8'),
    )
    const built = path.resolve(
      directory,
      dependency.publishConfig?.main ?? dependency.main,
    )

    if (
      !fs.existsSync(path.join(directory, '.jsii')) ||
      !fs.existsSync(built)
    ) {
      throw new Error(`Build the workspace dependency ${name} before inlining.`)
    }

    entries[name] = built
  }

  return entries
}

// A missing workspace assembly is a build failure, never an inlining request.
const inlinedDependencies = (manifest) => {
  const workspace = workspaceEntries(manifest)
  return Object.keys(manifest.dependencies ?? {}).filter(
    (name) =>
      !Object.hasOwn(workspace, name) &&
      !fs.existsSync(path.join(packageDir, 'node_modules', name, '.jsii')),
  )
}

const exportsOf = (workspace, file = entry) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
    import { registerHooks } from 'node:module'
    import { pathToFileURL } from 'node:url'
    const [entry, workspace] = process.argv.slice(1).map(JSON.parse)
    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (Object.hasOwn(workspace, specifier)) {
          return { url: pathToFileURL(workspace[specifier]).href, shortCircuit: true }
        }
        return nextResolve(specifier, context)
      },
    })
    const names = Object.keys(await import(pathToFileURL(entry))).sort()
    process.stdout.write(JSON.stringify(names))
  `,
        JSON.stringify(file),
        JSON.stringify(workspace),
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
    ),
  )

const withoutDependencies = (text) => {
  const manifest = JSON.parse(text)

  for (const name of inlinedDependencies(manifest)) {
    delete manifest.dependencies[name]
  }

  if (!Object.keys(manifest.dependencies ?? {}).length) {
    delete manifest.dependencies
  }

  return `${JSON.stringify(manifest, null, 2)}\n`
}

// Inlines everything `dist/index.js` imports but `external`, and returns the
// name of each package it inlined, by directory, since versions differ.
const bundle = async (external, workspace) => {
  const entries = preserveModules
    ? Object.fromEntries(
        fs
          .readdirSync(distDir, { recursive: true })
          .filter((file) => file.endsWith('.js'))
          .sort()
          .map((file) => [file.slice(0, -3), path.join(distDir, file)]),
      )
    : { index: entry }
  const before = Object.fromEntries(
    Object.values(entries).map((file) => [file, exportsOf(workspace, file)]),
  )

  const stats = await new Promise((resolve, reject) => {
    webpack(
      {
        mode: 'none',
        optimization: {
          concatenateModules: true,
          usedExports: true,
          sideEffects: true,
        },
        target: 'node',
        entry: entries,
        experiments: { outputModule: true },
        output: {
          path: distDir,
          filename: '[name].js',
          module: true,
          library: { type: 'module' },
        },
        module: {
          rules: [
            {
              include: distDir,
              parser: { importMeta: false, createRequire: false, url: false },
            },
          ],
        },
        externals: ({ context, request }, callback) => {
          const resolved = path.resolve(context, request)
          if (
            preserveModules &&
            request.startsWith('.') &&
            Object.values(entries).includes(resolved)
          ) {
            callback(undefined, `module ${request}`)
            return
          }
          if (
            !preserveModules &&
            resolved === path.join(distDir, 'lib/templates-directory.js')
          ) {
            callback(undefined, 'module ./lib/templates-directory.js')
            return
          }
          callback(
            undefined,
            external.some(
              (name) => request === name || request.startsWith(`${name}/`),
            )
              ? `module ${request}`
              : undefined,
          )
        },
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    )
  })

  // A warning can mean a bundle that breaks at runtime, such as a `require`
  // of an expression.
  if (stats.hasErrors() || stats.hasWarnings()) {
    throw new Error(
      stats.toString({ all: false, errors: true, warnings: true }),
    )
  }

  for (const file of Object.values(entries)) {
    const after = exportsOf(workspace, file)
    if (before[file].join() !== after.join()) {
      throw new Error(
        `The bundle ${path.relative(distDir, file)} exports ${after.join(', ') || 'nothing'}, not ${before[file].join(', ')}.`,
      )
    }
    fs.writeFileSync(
      file,
      fs
        .readFileSync(file, 'utf8')
        .replace(/^\/\/# sourceMappingURL=.*\n/gm, ''),
    )
    fs.rmSync(`${file}.map`, { force: true })
  }

  const inlined = new Map()

  for (const module of stats.compilation.modules) {
    const resource = module.nameForCondition?.()

    if (!resource) {
      continue
    }

    const match = resource.match(/^(.*\/node_modules\/((?:@[^/]+\/)?[^/]+))\//)

    if (match) {
      inlined.set(match[1], match[2])
    } else if (!resource.startsWith(`${distDir}${path.sep}`)) {
      throw new Error(`Inlined a file outside node_modules: ${resource}`)
    }
  }

  return inlined
}

const inline = async (manifest) => {
  const skipped = new Set(inlinedDependencies(manifest))
  // shortcut: a value import of a peer moved to devDependencies (#549) is
  // inlined too; keep those imports type-only.
  const inlined = await bundle(
    [
      ...Object.keys(manifest.dependencies ?? {}).filter(
        (name) => !skipped.has(name),
      ),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ],
    workspaceEntries(manifest),
  )

  if (!inlined.size) {
    throw new Error('Nothing was inlined: remove the inlining step.')
  }

  const notices = [...inlined.keys()].map((dir) => {
    const { name, version, license } = JSON.parse(
      fs.readFileSync(path.join(dir, 'package.json'), 'utf8'),
    )
    const files = fs
      .readdirSync(dir)
      .filter((file) => /^(licen[cs]e|copying|notice)(\..*)?$/i.test(file))
      .sort()

    if (!files.length) {
      throw new Error(`${name}@${version} ships no licence file.`)
    }

    const texts = files.map((file) =>
      fs.readFileSync(path.join(dir, file), 'utf8').trim(),
    )

    return `${name}@${version} (${license})\n\n${texts.join('\n\n')}`
  })

  notices.sort()

  fs.writeFileSync(
    path.join(distDir, 'THIRD-PARTY-LICENSES.txt'),
    `${notices.join(`\n\n${'-'.repeat(72)}\n\n`)}\n`,
  )

  console.log(`Inlined ${[...new Set(inlined.values())].sort().join(', ')}.`)
}

const compile = () => {
  const original = readManifest()
  fs.writeFileSync(manifestPath, withoutDependencies(original))
  try {
    execFileSync('jsii', { stdio: 'inherit' })
  } finally {
    fs.writeFileSync(manifestPath, original)
  }
}

const commands = {
  compile,
  // jsii accepts only jsii modules as dependencies. A publish then goes on
  // without them: npm sends the registry the manifest it reads after packing,
  // so the stripped one stays until `postpublish` restores it.
  async build() {
    // A publish that failed, and is being retried, left its own.
    if (fs.existsSync(stashPath)) {
      if (
        readManifest() !==
        withoutDependencies(fs.readFileSync(stashPath, 'utf8'))
      ) {
        throw new Error(
          `${stashPath} is not of this manifest: delete it, since restoring it would overwrite a newer one.`,
        )
      }

      commands.restore()
    }

    const original = readManifest()
    const stripped = withoutDependencies(original)

    fs.writeFileSync(manifestPath, stripped)

    try {
      execFileSync('jsii', { stdio: 'inherit' })
    } finally {
      fs.writeFileSync(manifestPath, original)
    }

    await inline(JSON.parse(original))

    if (process.env.npm_command === 'publish') {
      fs.writeFileSync(stashPath, original)
      fs.writeFileSync(manifestPath, stripped)
    }
  },

  restore() {
    fs.renameSync(stashPath, manifestPath)
  },
}

const [command, ...options] = process.argv.slice(2)
const preserveModules = options.includes('--preserve-modules')

if (options.some((option) => option !== '--preserve-modules')) {
  throw new Error('Expected --preserve-modules as the only build option.')
}

if (!Object.hasOwn(commands, command)) {
  throw new Error(`Expected ${Object.keys(commands).join(', ')}.`)
}

await commands[command]()
