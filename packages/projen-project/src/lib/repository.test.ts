import { expect, test } from '@langri-sha/vitest'

import { normalizeRepository } from './repository'

const FULL_URL = 'git+https://github.com/langri-sha/projen.git'

test.each([
  ['owner/repo shorthand', 'langri-sha/projen'],
  ['github: shorthand', 'github:langri-sha/projen'],
  ['https URL without a suffix', 'https://github.com/langri-sha/projen'],
  ['https URL with a suffix', 'https://github.com/langri-sha/projen.git'],
])('rewrites the %s to a full git URL', (_, repository) => {
  expect(normalizeRepository(repository)).toBe(FULL_URL)
})

test.each([
  [
    'gitlab: shorthand',
    'gitlab:langri-sha/projen',
    'git+https://gitlab.com/langri-sha/projen.git',
  ],
  [
    'bitbucket: shorthand',
    'bitbucket:langri-sha/projen',
    'git+https://bitbucket.org/langri-sha/projen.git',
  ],
  [
    'scp-style SSH URL',
    'git@github.com:langri-sha/projen.git',
    'git+ssh://git@github.com/langri-sha/projen.git',
  ],
  [
    'ssh URL',
    'ssh://git@github.com/langri-sha/projen.git',
    'git+ssh://git@github.com/langri-sha/projen.git',
  ],
])('rewrites the %s the way npm does', (_, repository, expected) => {
  expect(normalizeRepository(repository)).toBe(expected)
})

test.each([
  ['full git URL', FULL_URL],
  ['git+ssh URL', 'git+ssh://git@github.com/langri-sha/projen.git'],
  ['git protocol URL', 'git://github.com/langri-sha/projen.git'],
  ['URL on another host', 'https://example.com/langri-sha/projen.git'],
  ['host and path without a scheme', 'github.com/langri-sha/projen'],
  ['shorthand with a trailing slash', 'langri-sha/projen/'],
])('leaves the %s as it is', (_, repository) => {
  expect(normalizeRepository(repository)).toBe(repository)
})

test('passes an undefined repository through', () => {
  expect(normalizeRepository(undefined)).toBeUndefined()
})
