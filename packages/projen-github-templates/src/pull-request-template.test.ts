import { describe, expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import {
  PullRequestTemplate,
  type PullRequestTemplateOptions,
} from './pull-request-template'

const checklist: PullRequestTemplateOptions = {
  body: [
    '## What changed',
    '',
    '<!-- One paragraph. The diff shows how; say why. -->',
    '',
    '## Checklist',
    '',
    '- [ ] `pnpm exec projen` run and the tree is clean',
    '- [ ] Change file written (`pnpm change`) for every package touched',
  ],
}

const synth = (filePath: string, options = checklist) => {
  const project = new Project({ name: 'test-project' })

  new PullRequestTemplate(project, filePath, options)

  return synthSnapshot(project)
}

test.each([
  'pull_request_template.md',
  '.github/pull_request_template.md',
  'docs/pull_request_template.md',
  'PULL_REQUEST_TEMPLATE/release.md',
  '.github/PULL_REQUEST_TEMPLATE/release.md',
  'docs/PULL_REQUEST_TEMPLATE/release.md',
])('writes %s', (filePath) => {
  expect(synth(filePath)[filePath]).toBe([...checklist.body, ''].join('\n'))
})

test('marks the file on request', () => {
  expect(
    synth('.github/pull_request_template.md', { ...checklist, marker: true })[
      '.github/pull_request_template.md'
    ],
  ).toMatchSnapshot()
})

test('seeds the file', () => {
  const files = synth('docs/PULL_REQUEST_TEMPLATE/release.md', {
    ...checklist,
    managed: false,
  })

  expect(files['docs/PULL_REQUEST_TEMPLATE/release.md']).toContain(
    '## Checklist',
  )
  expect(files['.projen/files.json'].files).not.toContain(
    'docs/PULL_REQUEST_TEMPLATE/release.md',
  )
})

describe('validation', () => {
  test.each([
    [{ body: '' }, 'the body is empty. Write the template, or remove it.'],
    [{ body: ['', ' '] }, 'the body is empty.'],
    [{ body: undefined }, '`body` must be a string, or a list of lines.'],
    [
      { name: 'Checklist' },
      '`name` is not an option. Use `body`, `managed`, `marker`.',
    ],
    [{ managed: false, marker: true }, '`marker` needs `managed`.'],
  ])('rejects %o', (overrides, message) => {
    expect(() =>
      synth('.github/pull_request_template.md', {
        ...checklist,
        ...overrides,
      } as PullRequestTemplateOptions),
    ).toThrow(`.github/pull_request_template.md: ${message}`)
  })

  test.each([
    ['.github/ISSUE_TEMPLATE/bug.md', 'not a pull request template location'],
    ['.github/pull_request_template.txt', 'writes Markdown only'],
  ])('rejects the path %s', (filePath, message) => {
    expect(() => synth(filePath)).toThrow(`${filePath}: `)
    expect(() => synth(filePath)).toThrow(message)
  })
})
