import { expect, test } from '@langri-sha/vitest'

import { parseGitHubRepository } from './github-repository'

test.each([
  'langri-sha/projen',
  'github:langri-sha/projen',
  'https://github.com/langri-sha/projen',
  'https://github.com/langri-sha/projen.git',
  'https://github.com/langri-sha/projen/',
  'git+https://github.com/langri-sha/projen.git',
  'git://github.com/langri-sha/projen.git',
  'ssh://git@github.com/langri-sha/projen.git',
  'git@github.com:langri-sha/projen.git',
])('reads %s', (repository) => {
  expect(parseGitHubRepository(repository)).toEqual({
    owner: 'langri-sha',
    repo: 'projen',
  })
})

test('keeps dots in the repository name', () => {
  expect(parseGitHubRepository('langri-sha/langri-sha.com')).toEqual({
    owner: 'langri-sha',
    repo: 'langri-sha.com',
  })
})

test.each([
  undefined,
  '',
  'projen',
  'gitlab:langri-sha/projen',
  'https://gitlab.com/langri-sha/projen.git',
  'https://example.com/github.com/langri-sha/projen',
  'langri-sha/projen/extra',
])('is not a GitHub repository: %s', (repository) => {
  expect(parseGitHubRepository(repository)).toBeUndefined()
})
