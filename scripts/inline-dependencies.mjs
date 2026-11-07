import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

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

// The dependencies that are not jsii modules are inlined.
const inlinedDependencies = (manifest) =>
  Object.keys(manifest.dependencies ?? {}).filter(
    (name) =>
      !fs.existsSync(path.join(packageDir, 'node_modules', name, '.jsii')),
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
const bundle = async (external) => {
  const exportsOf = async (query) =>
    Object.keys(await import(`${pathToFileURL(entry)}?${query}`)).sort()
  const before = await exportsOf('before')

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
        entry,
        experiments: { outputModule: true },
        output: {
          path: distDir,
          filename: 'index.js',
          module: true,
          library: { type: 'module' },
        },
        externals: ({ request }, callback) =>
          callback(
            undefined,
            external.some(
              (name) => request === name || request.startsWith(`${name}/`),
            )
              ? `module ${request}`
              : undefined,
          ),
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

  const after = await exportsOf('after')

  if (before.join() !== after.join()) {
    throw new Error(
      `The bundle exports ${after.join(', ') || 'nothing'}, not ${before.join(', ')}.`,
    )
  }

  // The inputs' source map comments point at maps that are not shipped.
  fs.writeFileSync(
    entry,
    fs
      .readFileSync(entry, 'utf8')
      .replace(/^\/\/# sourceMappingURL=.*\n/gm, ''),
  )
  // jsii's map describes the file the bundle replaced.
  fs.rmSync(`${entry}.map`, { force: true })

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
  const inlined = await bundle([
    ...Object.keys(manifest.dependencies ?? {}).filter(
      (name) => !skipped.has(name),
    ),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ])

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

const commands = {
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
      execSync(jsii, { stdio: 'inherit' })
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

const [command, jsii = 'jsii'] = process.argv.slice(2)

if (!Object.hasOwn(commands, command)) {
  throw new Error(`Expected ${Object.keys(commands).join(', ')}.`)
}

await commands[command]()
