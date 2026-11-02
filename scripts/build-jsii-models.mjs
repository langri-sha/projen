import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const options = new Set(
  process.argv
    .slice(2)
    .filter((argument) => ['--inline', '--keep-null'].includes(argument)),
)
const schemaArguments = process.argv
  .slice(2)
  .filter((argument) => !options.has(argument))

if (!schemaArguments.length || schemaArguments.length % 2) {
  throw new Error('Expected schema names paired with generated source paths.')
}

const schemas = []

for (let index = 0; index < schemaArguments.length; index += 2) {
  schemas.push({
    name: schemaArguments[index],
    file: schemaArguments[index + 1],
  })
}

const originals = new Map(
  schemas.map(({ file }) => [file, fs.readFileSync(file)]),
)
const inline = options.has('--inline')
const inliner = fileURLToPath(
  new URL('./inline-dependencies.mjs', import.meta.url),
)
const stash = 'node_modules/.inline-dependencies.package.json'
const hadStash = fs.existsSync(stash)
const runInline = (command) =>
  execFileSync('node', [inliner, command], { stdio: 'inherit' })

try {
  try {
    for (const { name, file } of schemas) {
      execFileSync(
        'schemastore-to-typescript',
        [
          '--no-cache',
          '--jsii',
          ...(options.has('--keep-null') ? ['--keep-null'] : []),
          name,
          file,
        ],
        { stdio: 'inherit' },
      )
    }

    if (inline) {
      runInline('build')
    } else {
      execFileSync('jsii', { stdio: 'inherit' })
    }
  } finally {
    for (const [file, contents] of originals) {
      fs.writeFileSync(file, contents)
    }
  }

  execFileSync(
    'tsc',
    ['--project', 'tsconfig.build.json', '--emitDeclarationOnly'],
    { stdio: 'inherit' },
  )
} catch (error) {
  if (inline && !hadStash && fs.existsSync(stash)) {
    runInline('restore')
  }

  throw error
}
