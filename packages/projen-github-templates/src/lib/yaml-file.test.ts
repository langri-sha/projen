import { expect, test } from '@langri-sha/vitest'
import { JsonPatch, Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import YAML from 'yaml'

import { GitHubYamlFile } from './yaml-file'

class Fixture extends GitHubYamlFile {
  protected validate(obj: Record<string, unknown>) {
    return obj.name === 'ab' ? ['name is too short.'] : []
  }
}

const synth = (obj: object, configure?: (file: Fixture) => void) => {
  const project = new Project({ name: 'test-project' })
  const file = new Fixture(project, 'fixture.yml', { obj })

  configure?.(file)

  return synthSnapshot(project)['fixture.yml'] as string
}

test('survives a YAML 1.1 round trip', () => {
  const declared = [
    'Yes',
    'No',
    'y',
    'n',
    'on',
    'off',
    '1:20',
    '12:34:56',
    '2001-12-15',
    '2001-12-15T02:59:43.1Z',
    '12_000',
    '0x1A',
    '.inf',
    '~',
    'null',
    '012',
    '+12',
    '1e3',
    'Maybe',
  ]

  const emitted = synth({ options: declared })

  expect(YAML.parse(emitted, { version: '1.1' }).options).toEqual(declared)
})

test('keeps keys strings under YAML 1.1', () => {
  const emitted = synth({ yes: 'y', on: 'off' })

  expect(Object.keys(YAML.parse(emitted, { version: '1.1' }))).toEqual([
    'yes',
    'on',
  ])
})

test.each([
  ['a Markdown heading', '# Steps'],
  ['a mapping indicator', 'Output of `acme --version`: paste it here.'],
  ['a flow sequence indicator', '[BUG] <title>'],
  ['a trailing space', '[bug] '],
  ['a comment indicator', 'issue #123'],
  ['a leading dash', '- item'],
])('preserves %s', (_, value) => {
  expect(YAML.parse(synth({ value }), { version: '1.1' }).value).toBe(value)
})

test('writes multi-line values as block scalars', () => {
  expect(synth({ value: '1.\n2.\n3.\n', text: 'a\n\nb' })).toMatchSnapshot()
})

test('does not fold long lines', () => {
  const description = 'word '.repeat(40).trim()

  expect(synth({ description }).trim().split('\n').at(-1)).toBe(
    `description: ${description}`,
  )
})

test('omits undefined keys', () => {
  expect(synth({ title: undefined, name: 'Bug report' })).not.toContain('title')
})

test('leads with the marker', () => {
  expect(synth({ name: 'Bug report' })).toMatchSnapshot()
})

test('is stable across synths', () => {
  const obj = { name: 'Bug report', options: ['Yes', 'No'], value: 'a\nb\n' }

  expect(synth(obj)).toBe(synth(obj))
})

test('validates the object after overrides', () => {
  expect(() =>
    synth({ name: 'Bug report' }, (file) => file.addOverride('name', 'ab')),
  ).toThrow('fixture.yml: name is too short.')
})

test('validates the object after patches', () => {
  expect(() =>
    synth({ name: 'Bug report' }, (file) =>
      file.patch(JsonPatch.replace('/name', 'ab')),
    ),
  ).toThrow('fixture.yml: name is too short.')
})

test('resolves the object as it will be written', () => {
  const project = new Project({ name: 'test-project' })
  const file = new Fixture(project, 'fixture.yml', {
    obj: { name: 'Bug report', body: [] },
  })

  file.addOverride('title', '[bug] ')
  file.addDeletionOverride('body')

  expect(file.resolve()).toEqual({ name: 'Bug report', title: '[bug] ' })
})
