import { expect, test } from '@langri-sha/vitest'
import { Project, TomlFile } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import { parse } from 'smol-toml'

import {
  type LintOptions,
  type LintRuffOptions,
  Ruff,
  type RuleSelector,
} from './index'

test('defaults', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Ruff(project)

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('writes a ruff.toml the way one is written by hand', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Ruff(project, {
    'line-length': 120,
    lint: {
      select: ['E', 'F', 'W', 'ANN'],
      ignore: ['E501', 'ANN401', 'ANN204'],
      'per-file-ignores': {
        'tests/**': ['ANN'],
      },
    },
    format: {
      'quote-style': 'double',
    },
  })

  expect(parse(synthSnapshot(project)['ruff.toml'])).toEqual(
    parse(`
line-length = 120

[lint]
select = ["E", "F", "W", "ANN"]
ignore = ["E501", "ANN401", "ANN204"]

[lint.per-file-ignores]
"tests/**" = ["ANN"]

[format]
quote-style = "double"
`),
  )
})

test('names the types its own options are written in', () => {
  const select: RuleSelector[] = ['E', 'F']
  const ruff: LintRuffOptions = { 'parenthesize-tuple-in-subscript': true }
  const lint: LintOptions = { select, ruff }

  const project = new Project({
    name: 'test-project',
  })

  expect(new Ruff(project, { lint }).file).toBeInstanceOf(TomlFile)
})

test('refuses a rule Ruff has removed', () => {
  // @ts-expect-error Removed in Ruff 0.8.
  const removed: RuleSelector = 'ANN101'

  expect(removed).toBe('ANN101')
})
