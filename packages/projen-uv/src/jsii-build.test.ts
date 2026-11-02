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
const source = 'export interface Original { value?: string | null }\n'
const original =
  JSON.stringify(
    {
      name: 'example',
      version: '0.0.0',
      type: 'module',
      dependencies: { 'smol-toml': '1.9.1' },
    },
    null,
    2,
  ) + '\n'
const stripped =
  JSON.stringify(
    { name: 'example', version: '0.0.0', type: 'module' },
    null,
    2,
  ) + '\n'
const inline = `
  const fs = require('node:fs')
  const assert = require('node:assert/strict')
  fs.appendFileSync('events', process.argv.at(-1) + '\\n')
  const manifest = 'package.json'
  const stash = 'node_modules/.inline-dependencies.package.json'
  const strip = (text) => {
    const value = JSON.parse(text)
    delete value.dependencies
    return JSON.stringify(value, null, 2) + '\\n'
  }
  if (process.argv.at(-1) === 'restore') {
    fs.renameSync(stash, manifest)
  } else {
    if (fs.existsSync(stash)) {
      assert.equal(fs.readFileSync(manifest, 'utf8'), strip(fs.readFileSync(stash, 'utf8')))
      fs.renameSync(stash, manifest)
    }
    const original = fs.readFileSync(manifest, 'utf8')
    assert.match(fs.readFileSync('src/config.ts', 'utf8'), /readonly value/)
    fs.mkdirSync('dist')
    fs.writeFileSync('dist/index.js', 'export const bundled = true\\n')
    fs.writeFileSync('.jsii', '{"model":true}')
    if (process.env.npm_command === 'publish') {
      fs.writeFileSync(stash, original)
      fs.writeFileSync(manifest, strip(original))
    }
  }
`

const fixture = (declarationsFail = false) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jsii-inline-'))
  fixtures.push(directory)
  for (const child of ['src', 'bin', 'node_modules']) {
    fs.mkdirSync(path.join(directory, child))
  }
  fs.writeFileSync(
    path.join(directory, 'bin/package.json'),
    '{"type":"commonjs"}',
  )
  fs.writeFileSync(path.join(directory, 'src/config.ts'), source)
  fs.writeFileSync(path.join(directory, 'package.json'), original)
  const commands = {
    'schemastore-to-typescript': `
      const fs = require('node:fs')
      const assert = require('node:assert/strict')
      assert.ok(process.argv.includes('--keep-null'))
      fs.appendFileSync('events', 'generate\\n')
      fs.writeFileSync(process.argv.at(-1), 'export interface Model { readonly value?: string | null }\\n')
    `,
    node: inline,
    tsc: declarationsFail
      ? "require('node:fs').appendFileSync('events', 'declare\\n'); process.exit(23)"
      : `
      const fs = require('node:fs')
      const assert = require('node:assert/strict')
      fs.appendFileSync('events', 'declare\\n')
      assert.equal(fs.readFileSync('src/config.ts', 'utf8'), ${JSON.stringify(source)})
      fs.writeFileSync('dist/config.d.ts', fs.readFileSync('src/config.ts'))
    `,
  }
  for (const [name, command] of Object.entries(commands)) {
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
    [script, '--keep-null', '--inline', 'schema', 'src/config.ts'],
    {
      cwd: directory,
      env: {
        ...process.env,
        npm_command: 'publish',
        PATH: `${path.join(directory, 'bin')}${path.delimiter}${process.env.PATH}`,
      },
      stdio: 'pipe',
    },
  )

const expectSource = (directory: string) =>
  expect(fs.readFileSync(path.join(directory, 'src/config.ts'))).toEqual(
    Buffer.from(source),
  )

afterEach(() => {
  for (const directory of fixtures.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('publishing retains the inliner transaction and strict nullable declarations', () => {
  const directory = fixture()

  run(directory)

  expectSource(directory)
  expect(
    fs.readFileSync(path.join(directory, 'dist/config.d.ts'), 'utf8'),
  ).toBe(source)
  expect(fs.readFileSync(path.join(directory, 'dist/index.js'), 'utf8')).toBe(
    'export const bundled = true\n',
  )
  expect(fs.readFileSync(path.join(directory, 'package.json'), 'utf8')).toBe(
    stripped,
  )
  expect(
    fs.readFileSync(
      path.join(directory, 'node_modules/.inline-dependencies.package.json'),
      'utf8',
    ),
  ).toBe(original)
})

test('failed declaration emission restores a newly stripped manifest', () => {
  const directory = fixture(true)

  expect(() => run(directory)).toThrow()

  expectSource(directory)
  expect(fs.readFileSync(path.join(directory, 'events'), 'utf8')).toBe(
    'generate\nbuild\ndeclare\nrestore\n',
  )
  expect(fs.readFileSync(path.join(directory, 'package.json'), 'utf8')).toBe(
    original,
  )
  expect(
    fs.existsSync(
      path.join(directory, 'node_modules/.inline-dependencies.package.json'),
    ),
  ).toBe(false)
})

test('failed declaration emission preserves the initial valid retry transaction', () => {
  const directory = fixture(true)
  fs.writeFileSync(path.join(directory, 'package.json'), stripped)
  fs.writeFileSync(
    path.join(directory, 'node_modules/.inline-dependencies.package.json'),
    original,
  )

  expect(() => run(directory)).toThrow()

  expectSource(directory)
  expect(fs.readFileSync(path.join(directory, 'events'), 'utf8')).toBe(
    'generate\nbuild\ndeclare\n',
  )
  expect(fs.readFileSync(path.join(directory, 'package.json'), 'utf8')).toBe(
    stripped,
  )
  expect(
    fs.readFileSync(
      path.join(directory, 'node_modules/.inline-dependencies.package.json'),
      'utf8',
    ),
  ).toBe(original)
})

test('a stale inliner stash cannot overwrite a newer manifest', () => {
  const directory = fixture()
  const stale = original.replace('0.0.0', '0.1.0')
  fs.writeFileSync(
    path.join(directory, 'node_modules/.inline-dependencies.package.json'),
    stale,
  )

  expect(() => run(directory)).toThrow()

  expectSource(directory)
  expect(fs.readFileSync(path.join(directory, 'events'), 'utf8')).toBe(
    'generate\nbuild\n',
  )
  expect(fs.readFileSync(path.join(directory, 'package.json'), 'utf8')).toBe(
    original,
  )
  expect(
    fs.readFileSync(
      path.join(directory, 'node_modules/.inline-dependencies.package.json'),
      'utf8',
    ),
  ).toBe(stale)
})
