import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, expect, test } from '@langri-sha/vitest'

const script = fileURLToPath(
  new URL('../../../scripts/inline-dependencies.mjs', import.meta.url),
)
const fixtures: string[] = []
const fixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'preset-inline-'))
  fixtures.push(root)
  const directory = path.join(root, 'preset')
  const sibling = path.join(root, 'sibling')
  const thirdParty = path.join(directory, 'node_modules/fixture-inline')
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, text)
  }
  const json = (file: string, value: unknown) =>
    write(file, JSON.stringify(value, null, 2) + '\n')
  json(path.join(directory, 'package.json'), {
    name: 'preset',
    version: '2.3.4',
    type: 'module',
    main: 'src/index.ts',
    dependencies: {
      'fixture-sibling': 'workspace:*',
      'fixture-inline': '1.0.0',
    },
  })
  json(path.join(sibling, 'package.json'), {
    name: 'fixture-sibling',
    version: '1.2.3',
    type: 'module',
    main: 'src/index.ts',
    publishConfig: { main: 'dist/index.js' },
  })
  json(path.join(sibling, '.jsii'), {
    name: 'fixture-sibling',
    version: '1.2.3',
  })
  write(path.join(sibling, 'src/index.ts'), "export * from './missing.js'\n")
  write(path.join(sibling, 'dist/index.js'), 'export class Component {}\n')
  fs.mkdirSync(path.join(directory, 'node_modules'), { recursive: true })
  fs.symlinkSync(sibling, path.join(directory, 'node_modules/fixture-sibling'))
  json(path.join(thirdParty, 'package.json'), {
    name: 'fixture-inline',
    version: '1.0.0',
    license: 'MIT',
    type: 'module',
    main: 'index.js',
  })
  write(path.join(thirdParty, 'index.js'), 'export const suffix = "inline"\n')
  write(path.join(thirdParty, 'LICENSE'), 'Fixture license')
  write(path.join(directory, 'templates/default.txt'), 'relocated template')
  write(
    path.join(directory, 'compiled/index.js'),
    `
    import { createRequire } from 'node:module'
    import { suffix } from 'fixture-inline'
    import { readTemplate } from './lib/consumer.js'
    export { Component } from 'fixture-sibling'
    export const value = suffix
    export const version = createRequire(import.meta.url)('../package.json').version
    export const template = readTemplate()
  `,
  )
  write(
    path.join(directory, 'compiled/lib/consumer.js'),
    `
    import fs from 'node:fs'
    import { templatesDirectory } from './templates-directory.js'
    export const readTemplate = () => fs.readFileSync(templatesDirectory() + 'default.txt', 'utf8')
  `,
  )
  write(
    path.join(directory, 'compiled/lib/templates-directory.js'),
    `
    import { fileURLToPath } from 'node:url'
    export const templatesDirectory = () => fileURLToPath(new URL('../../templates/', import.meta.url))
  `,
  )
  json(path.join(directory, 'bin/package.json'), { type: 'commonjs' })
  write(
    path.join(directory, 'bin/jsii'),
    `#!${process.execPath}
    const fs = require('node:fs')
    fs.writeFileSync('compiler-manifest.json', fs.readFileSync('package.json'))
    if (process.env.FAIL_COMPILER) process.exit(23)
    fs.cpSync('compiled', 'dist', { recursive: true })
  `,
  )
  fs.chmodSync(path.join(directory, 'bin/jsii'), 0o755)
  return {
    directory,
    sibling,
    thirdParty,
    manifest: path.join(directory, 'package.json'),
    stash: path.join(
      directory,
      'node_modules/.inline-dependencies.package.json',
    ),
    original: fs.readFileSync(path.join(directory, 'package.json'), 'utf8'),
  }
}

const run = (
  directory: string,
  env: Record<string, string> = {},
  command = 'build',
  options: string[] = [],
) =>
  execFileSync(process.execPath, [script, command, ...options], {
    cwd: directory,
    env: {
      ...process.env,
      npm_command: 'run-script',
      PATH: `${path.join(directory, 'bin')}${path.delimiter}${process.env.PATH}`,
      ...env,
    },
    stdio: 'pipe',
  })

afterEach(() => {
  for (const directory of fixtures.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('inlines third parties while preserving workspace exports and relocated paths', () => {
  const { directory, sibling, manifest, stash, original } = fixture()

  run(directory)

  expect(fs.readFileSync(manifest, 'utf8')).toBe(original)
  expect(fs.existsSync(stash)).toBe(false)
  expect(
    fs.readFileSync(
      path.join(directory, 'dist/THIRD-PARTY-LICENSES.txt'),
      'utf8',
    ),
  ).toContain('fixture-inline@1.0.0 (MIT)')
  const relocated = path.join(directory, '../relocated')
  fs.cpSync(path.join(directory, 'dist'), path.join(relocated, 'dist'), {
    recursive: true,
  })
  fs.cpSync(
    path.join(directory, 'templates'),
    path.join(relocated, 'templates'),
    { recursive: true },
  )
  fs.cpSync(sibling, path.join(relocated, 'node_modules/fixture-sibling'), {
    recursive: true,
  })
  fs.writeFileSync(
    path.join(relocated, 'package.json'),
    JSON.stringify({
      name: 'preset',
      version: '2.3.4',
      type: 'module',
      main: 'dist/index.js',
    }),
  )
  fs.writeFileSync(
    path.join(relocated, 'node_modules/fixture-sibling/package.json'),
    JSON.stringify({
      name: 'fixture-sibling',
      version: '1.2.3',
      type: 'module',
      main: 'dist/index.js',
    }),
  )
  expect(
    execFileSync(
      process.execPath,
      [
        '-e',
        `
    const assert = require('node:assert/strict')
    const result = require('./dist/index.js')
    assert.equal(result.version, '2.3.4')
    assert.equal(result.value, 'inline')
    assert.equal(result.template, 'relocated template')
    assert.equal(typeof result.Component, 'function')
  `,
      ],
      { cwd: relocated },
    ).toString(),
  ).toBe('')
})

test.each(['.jsii', 'dist/index.js'])(
  'a missing workspace %s fails before manifest mutation',
  (file) => {
    const { directory, sibling, manifest, stash, original } = fixture()
    fs.rmSync(path.join(sibling, file))

    expect(() => run(directory)).toThrow()

    expect(fs.readFileSync(manifest, 'utf8')).toBe(original)
    expect(fs.existsSync(stash)).toBe(false)
    expect(fs.existsSync(path.join(directory, 'compiler-manifest.json'))).toBe(
      false,
    )
  },
)

test('an export guard failure restores the original manifest', () => {
  const { directory, manifest, stash, original } = fixture()
  fs.appendFileSync(
    path.join(directory, 'compiled/index.js'),
    '\nthrow new Error("export probe failed")\n',
  )

  expect(() => run(directory, { npm_command: 'publish' })).toThrow()

  expect(fs.readFileSync(manifest, 'utf8')).toBe(original)
  expect(fs.existsSync(stash)).toBe(false)
})

test('a Webpack warning fails without leaving a publish transaction', () => {
  const { directory, thirdParty, manifest, stash, original } = fixture()
  fs.writeFileSync(
    path.join(thirdParty, 'index.js'),
    'import { createRequire } from "node:module"; const require = createRequire(import.meta.url); export const suffix = "inline"; export const lookup = (name) => require(name)\n',
  )

  expect(() => run(directory, { npm_command: 'publish' })).toThrow()

  expect(fs.readFileSync(manifest, 'utf8')).toBe(original)
  expect(fs.existsSync(stash)).toBe(false)
})

test('preserved modules keep subpath classes identical and inline their own dependencies', () => {
  const { directory, sibling, manifest, original } = fixture()
  fs.appendFileSync(
    path.join(directory, 'compiled/index.js'),
    "export { OwnComponent } from './lib/component.js'\n",
  )
  fs.writeFileSync(
    path.join(directory, 'compiled/lib/component.js'),
    "import { suffix } from 'fixture-inline'; export class OwnComponent { value = suffix }\n",
  )

  run(directory, {}, 'build', ['--preserve-modules'])

  expect(fs.readFileSync(manifest, 'utf8')).toBe(original)
  const relocated = path.join(directory, '../relocated')
  fs.cpSync(path.join(directory, 'dist'), path.join(relocated, 'dist'), {
    recursive: true,
  })
  fs.cpSync(
    path.join(directory, 'templates'),
    path.join(relocated, 'templates'),
    { recursive: true },
  )
  fs.cpSync(sibling, path.join(relocated, 'node_modules/fixture-sibling'), {
    recursive: true,
  })
  fs.writeFileSync(
    path.join(relocated, 'package.json'),
    JSON.stringify({
      name: 'preset',
      version: '2.3.4',
      type: 'module',
      main: 'dist/index.js',
    }),
  )
  fs.writeFileSync(
    path.join(relocated, 'node_modules/fixture-sibling/package.json'),
    JSON.stringify({
      name: 'fixture-sibling',
      version: '1.2.3',
      type: 'module',
      main: 'dist/index.js',
    }),
  )
  expect(
    execFileSync(
      process.execPath,
      [
        '-e',
        `
    const assert = require('node:assert/strict')
    const root = require('./dist/index.js')
    const subpath = require('./dist/lib/component.js')
    assert.equal(root.OwnComponent, subpath.OwnComponent)
    assert.equal(new subpath.OwnComponent().value, 'inline')
    assert.equal(root.template, 'relocated template')
    assert.equal(root.version, '2.3.4')
  `,
      ],
      { cwd: relocated },
    ).toString(),
  ).toBe('')
})
