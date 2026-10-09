import { expect, test } from '@langri-sha/vitest'
import { Project, TomlFile } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import { parse } from 'smol-toml'

import {
  type EnvironmentOptions,
  type Rules,
  type SupportedPythonVersion,
  Ty,
} from './index'

test('defaults', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Ty(project)

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('writes a ty.toml the way one is written by hand', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Ty(project, {
    environment: {
      'python-version': '3.14',
    },
    src: {
      include: ['apps', 'packages'],
      exclude: ['**/.venv/'],
    },
    rules: {
      'possibly-unresolved-reference': 'warn',
    },
    overrides: [
      {
        include: ['tests/**'],
        rules: {
          'unresolved-import': 'ignore',
        },
      },
      {
        include: ['scripts/**'],
        rules: {
          'division-by-zero': 'error',
        },
      },
    ],
    terminal: {
      'error-on-warning': true,
    },
  })

  expect(parse(synthSnapshot(project)['ty.toml'])).toEqual(
    parse(`
[environment]
python-version = "3.14"

[src]
include = ["apps", "packages"]
exclude = ["**/.venv/"]

[rules]
possibly-unresolved-reference = "warn"

[[overrides]]
include = ["tests/**"]

[overrides.rules]
unresolved-import = "ignore"

[[overrides]]
include = ["scripts/**"]

[overrides.rules]
division-by-zero = "error"

[terminal]
error-on-warning = true
`),
  )
})

test('names the types its own options are written in', () => {
  const version: SupportedPythonVersion = '3.14'
  const environment: EnvironmentOptions = { 'python-version': version }
  const rules: Rules = { 'division-by-zero': 'error' }

  const project = new Project({
    name: 'test-project',
  })

  expect(new Ty(project, { environment, rules }).file).toBeInstanceOf(TomlFile)
})
