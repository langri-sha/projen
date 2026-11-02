import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, expect, test } from '@langri-sha/vitest'

const script = fileURLToPath(
  new URL('../../../scripts/dagger-schema-compatibility.mjs', import.meta.url),
)
const fixtures: string[] = []
const sources = {
  'dagger-module':
    'export interface Sdk { source: string; names?: readonly string[] }\n',
  'dagger-workspace':
    'export interface ModuleEntry { source?: string; settings?: { [key: string]: unknown } }\n',
}

const fixture = (compiler: string) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dagger-schema-'))
  fixtures.push(directory)
  fs.mkdirSync(path.join(directory, 'src'))
  fs.mkdirSync(path.join(directory, 'bin'))
  for (const [name, source] of Object.entries(sources)) {
    fs.writeFileSync(path.join(directory, 'src', `${name}.ts`), source)
  }
  fs.writeFileSync(
    path.join(directory, 'bin', 'jsii'),
    `#!${process.execPath}\n${compiler}`,
    { mode: 0o755 },
  )
  return directory
}

const run = (directory: string, command: string) =>
  execFileSync(process.execPath, [script, command], {
    cwd: directory,
    env: {
      ...process.env,
      PATH: `${path.join(directory, 'bin')}${path.delimiter}${process.env.PATH}`,
    },
    stdio: 'pipe',
  })

const expectRestoredSources = (directory: string) => {
  for (const [name, source] of Object.entries(sources)) {
    expect(
      fs.readFileSync(path.join(directory, 'src', `${name}.ts`), 'utf8'),
    ).toBe(source)
  }
}

afterEach(() => {
  for (const directory of fixtures.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('build preserves the assembly and source while restoring mutable declarations', () => {
  const directory = fixture(`
    const fs = require('node:fs')
    const assert = require('node:assert/strict')
    fs.mkdirSync('dist')
    for (const name of ['dagger-module', 'dagger-workspace']) {
      const text = fs.readFileSync('src/' + name + '.ts', 'utf8')
      assert.match(text, /readonly source/)
      fs.writeFileSync('dist/' + name + '.d.ts', text.replace('[key:', 'readonly [key:'))
    }
    fs.appendFileSync('dist/dagger-module.d.ts', 'export type Mutable<T> = { -readonly [K in keyof T]: T[K] }\\n')
    fs.writeFileSync('.jsii', '{"unchanged":true}')
  `)

  run(directory, 'build')

  expectRestoredSources(directory)
  expect(fs.readFileSync(path.join(directory, '.jsii'), 'utf8')).toBe(
    '{"unchanged":true}',
  )
  expect(
    fs.readFileSync(path.join(directory, 'dist', 'dagger-module.d.ts'), 'utf8'),
  ).toBe(
    sources['dagger-module'] +
      'export type Mutable<T> = { -readonly [K in keyof T]: T[K] }\n',
  )
  expect(
    fs.readFileSync(
      path.join(directory, 'dist', 'dagger-workspace.d.ts'),
      'utf8',
    ),
  ).toBe(sources['dagger-workspace'])
})

test('build restores source bytes when the compiler fails', () => {
  const directory = fixture(`
    const fs = require('node:fs')
    const assert = require('node:assert/strict')
    assert.match(fs.readFileSync('src/dagger-module.ts', 'utf8'), /readonly source/)
    assert.match(fs.readFileSync('src/dagger-workspace.ts', 'utf8'), /readonly source/)
    process.exit(23)
  `)

  expect(() => run(directory, 'build')).toThrow()
  expectRestoredSources(directory)
})
