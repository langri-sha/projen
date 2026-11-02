import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, expect, test } from '@langri-sha/vitest'

const script = fileURLToPath(
  new URL('../../../scripts/build-jsii-models.mjs', import.meta.url),
)
const fixtures: string[] = []
const sources = {
  one: 'export interface Original { value: string | null }\nexport type Nonempty = [string, ...string[]]\n',
  two: 'export interface Open { [key: string]: unknown }\n',
}
const generate = `
  const fs = require('node:fs')
  fs.writeFileSync(process.argv.at(-1), 'export interface Model { readonly value: string }\\n')
`
const compile = `
  const fs = require('node:fs')
  const assert = require('node:assert/strict')
  for (const name of ['one', 'two']) assert.match(fs.readFileSync('src/' + name + '.ts', 'utf8'), /readonly value/)
  fs.mkdirSync('dist')
  fs.writeFileSync('dist/index.js', 'export const marker = Symbol.for("jsii.rtti")\\n')
  fs.writeFileSync('.jsii', '{"model":true}')
`
const declare = `
  const fs = require('node:fs')
  const assert = require('node:assert/strict')
  assert.ok(process.argv.includes('--emitDeclarationOnly'))
  for (const [name, source] of Object.entries(${JSON.stringify(sources)})) {
    assert.equal(fs.readFileSync('src/' + name + '.ts', 'utf8'), source)
    fs.writeFileSync('dist/' + name + '.d.ts', source)
  }
`

const fixture = (
  commands: {
    generator?: string
    compiler?: string
    declarations?: string
  } = {},
) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jsii-models-'))
  fixtures.push(directory)
  fs.mkdirSync(path.join(directory, 'src'))
  fs.mkdirSync(path.join(directory, 'bin'))
  for (const [name, source] of Object.entries(sources)) {
    fs.writeFileSync(path.join(directory, 'src', `${name}.ts`), source)
  }
  for (const [name, command] of Object.entries({
    'schemastore-to-typescript': commands.generator ?? generate,
    jsii: commands.compiler ?? compile,
    tsc: commands.declarations ?? declare,
  })) {
    fs.writeFileSync(
      path.join(directory, 'bin', name),
      `#!${process.execPath}\n${command}`,
      { mode: 0o755 },
    )
  }
  return directory
}

const run = (directory: string) =>
  execFileSync(
    process.execPath,
    [script, 'schema-one', 'src/one.ts', 'schema-two', 'src/two.ts'],
    {
      cwd: directory,
      env: {
        ...process.env,
        PATH: `${path.join(directory, 'bin')}${path.delimiter}${process.env.PATH}`,
      },
      stdio: 'pipe',
    },
  )

const expectRestoredSources = (directory: string) => {
  for (const [name, source] of Object.entries(sources)) {
    expect(fs.readFileSync(path.join(directory, 'src', `${name}.ts`))).toEqual(
      Buffer.from(source),
    )
  }
}

afterEach(() => {
  for (const directory of fixtures.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('build restores original declarations while retaining runtime and assembly output', () => {
  const directory = fixture()

  run(directory)

  expectRestoredSources(directory)
  for (const [name, source] of Object.entries(sources)) {
    expect(
      fs.readFileSync(path.join(directory, 'dist', `${name}.d.ts`), 'utf8'),
    ).toBe(source)
  }
  expect(
    fs.readFileSync(path.join(directory, 'dist', 'index.js'), 'utf8'),
  ).toBe('export const marker = Symbol.for("jsii.rtti")\n')
  expect(fs.readFileSync(path.join(directory, '.jsii'), 'utf8')).toBe(
    '{"model":true}',
  )
})

test('build restores both source files after a later generator fails', () => {
  const directory = fixture({
    generator:
      generate +
      "\nif (process.argv.includes('schema-two')) process.exit(23)\n",
  })

  expect(() => run(directory)).toThrow()
  expectRestoredSources(directory)
})

test('build restores original source bytes after the JSII compiler fails', () => {
  const directory = fixture({ compiler: 'process.exit(23)' })

  expect(() => run(directory)).toThrow()
  expectRestoredSources(directory)
})

test('build leaves original sources intact after declaration emission fails', () => {
  const directory = fixture({ declarations: 'process.exit(23)' })

  expect(() => run(directory)).toThrow()
  expectRestoredSources(directory)
  expect(fs.readFileSync(path.join(directory, '.jsii'), 'utf8')).toBe(
    '{"model":true}',
  )
})
