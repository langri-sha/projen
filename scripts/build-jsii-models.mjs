import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const arguments_ = process.argv.slice(2)

if (!arguments_.length || arguments_.length % 2) {
  throw new Error('Expected schema names paired with generated source paths.')
}

const schemas = []

for (let index = 0; index < arguments_.length; index += 2) {
  schemas.push({ name: arguments_[index], file: arguments_[index + 1] })
}

const originals = new Map(
  schemas.map(({ file }) => [file, fs.readFileSync(file)]),
)

try {
  for (const { name, file } of schemas) {
    execFileSync(
      'schemastore-to-typescript',
      ['--no-cache', '--jsii', name, file],
      { stdio: 'inherit' },
    )
  }

  execFileSync('jsii', { stdio: 'inherit' })
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
