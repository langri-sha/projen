import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const packageDir = process.cwd()
const require = createRequire(path.join(packageDir, 'package.json'))
const esbuild = require('esbuild')

const manifest = JSON.parse(
  fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'),
)
// shortcut: a value import of a peer moved to devDependencies (#549) is
// inlined too; keep those imports type-only.
const external = [
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
]

const entry = path.join(packageDir, 'dist', 'index.js')

const { metafile } = await esbuild.build({
  entryPoints: [entry],
  outfile: entry,
  allowOverwrite: true,
  bundle: true,
  format: 'esm',
  platform: 'node',
  metafile: true,
  external,
  // CommonJS dependencies call `require` for Node's own modules.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
})

// jsii's map describes the file the bundle replaced.
fs.rmSync(`${entry}.map`, { force: true })

const inlined = new Map()

for (const input of Object.keys(metafile.inputs)) {
  const match = input.match(/^(.*\/node_modules\/((?:@[^/]+\/)?[^/]+))\//)

  if (match) {
    inlined.set(match[1], match[2])
  } else if (!input.startsWith('dist/')) {
    throw new Error(`Inlined a file outside node_modules: ${input}`)
  }
}

if (!inlined.size) {
  throw new Error('Nothing was inlined: remove the inlining step.')
}

const notices = [...inlined].map(([dir]) => {
  const { name, version, license } = JSON.parse(
    fs.readFileSync(path.join(packageDir, dir, 'package.json'), 'utf8'),
  )
  const files = fs
    .readdirSync(path.join(packageDir, dir))
    .filter((file) => /^(licen[cs]e|copying|notice)(\..*)?$/i.test(file))
    .sort()

  if (!files.length) {
    throw new Error(`${name}@${version} ships no licence file.`)
  }

  const texts = files.map((file) =>
    fs.readFileSync(path.join(packageDir, dir, file), 'utf8').trim(),
  )

  return `${name}@${version} (${license})\n\n${texts.join('\n\n')}`
})

fs.writeFileSync(
  path.join(packageDir, 'dist', 'THIRD-PARTY-LICENSES.txt'),
  `${notices.join(`\n\n${'-'.repeat(72)}\n\n`)}\n`,
)

console.log(`Inlined ${[...inlined.values()].sort().join(', ')}.`)
