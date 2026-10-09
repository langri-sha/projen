import { describe, expect, test } from '@langri-sha/vitest'

import { normalizeSkills, validateAgents } from './validate'

const SHA = '0b8fb22aaa7f82447d4befe1b6a95d30a5b279b8'

describe('normalizeSkills', () => {
  test('keeps git and npm entries', () => {
    expect(
      normalizeSkills([
        { source: 'vercel-labs/skills', ref: SHA, skills: ['find-skills'] },
        { source: 'npm:@scope/pkg', skills: ['one', 'two'] },
        {
          source: 'https://github.com/owner/repo.git',
          ref: SHA,
          skills: ['three'],
        },
      ]),
    ).toEqual([
      { source: 'vercel-labs/skills', ref: SHA, skills: ['find-skills'] },
      { source: 'npm:@scope/pkg', skills: ['one', 'two'] },
      {
        source: 'https://github.com/owner/repo.git',
        ref: SHA,
        skills: ['three'],
      },
    ])
  })

  test.each([
    './skills',
    '../skills',
    '/abs/skills',
    '~/skills',
    'file:skills',
  ])('rejects the local path %s', (source) => {
    expect(() =>
      normalizeSkills([{ source, ref: SHA, skills: ['a'] }]),
    ).toThrow(/local path/)
  })

  test.each([undefined, 'main', 'v1.0.0', SHA.slice(1), SHA.toUpperCase()])(
    'rejects the git ref %s',
    (ref) => {
      expect(() =>
        normalizeSkills([{ source: 'owner/repo', ref, skills: ['a'] }]),
      ).toThrow(/40-character commit SHA/)
    },
  )

  test('rejects a bare string, which cannot carry a ref or skills', () => {
    expect(() => normalizeSkills(['owner/repo'])).toThrow(/40-character/)
    expect(() => normalizeSkills(['npm:pkg'])).toThrow(/must list the `skills`/)
  })

  test.each(['npm:', 'owner', 'ftp://host/repo'])(
    'rejects the source %s',
    (source) => {
      expect(() =>
        normalizeSkills([{ source, ref: SHA, skills: ['a'] }]),
      ).toThrow(/not a skill source/)
    },
  )

  test('requires skill names', () => {
    expect(() => normalizeSkills([{ source: 'owner/repo', ref: SHA }])).toThrow(
      /must list the `skills`/,
    )
    expect(() =>
      normalizeSkills([{ source: 'owner/repo', ref: SHA, skills: [] }]),
    ).toThrow(/must list the `skills`/)
  })

  test.each(['', '..', '.hidden', 'a/b', 'a b'])(
    'rejects the skill name %j',
    (name) => {
      expect(() =>
        normalizeSkills([{ source: 'owner/repo', ref: SHA, skills: [name] }]),
      ).toThrow(/not a skill name/)
    },
  )

  test('rejects a skill declared twice', () => {
    expect(() =>
      normalizeSkills([
        { source: 'owner/one', ref: SHA, skills: ['a'] },
        { source: 'npm:two', skills: ['a'] },
      ]),
    ).toThrow(/declares the skill "a", which skills\[0\]/)
  })
})

describe('validateAgents', () => {
  test('drops repeats', () => {
    expect(validateAgents(['claude-code', 'cursor', 'claude-code'])).toEqual([
      'claude-code',
      'cursor',
    ])
  })

  test('rejects an unknown agent', () => {
    expect(() => validateAgents(['clod-code'])).toThrow(/Unknown agent/)
  })

  test('rejects an empty list', () => {
    expect(() => validateAgents([])).toThrow(/at least one agent/)
  })
})
