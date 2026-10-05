import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import * as path from 'node:path'

import { describe, expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import YAML from 'yaml'

import { IssueTemplate, type IssueTemplateOptions } from './issue-template'

const filePath = '.github/ISSUE_TEMPLATE/02-proposal.md'

const proposal: IssueTemplateOptions = {
  name: 'Proposal',
  about: 'Suggest a change that needs discussion before implementation.',
  title: '[proposal] ',
  labels: ['proposal'],
  body: [
    '## Problem',
    '',
    'What is currently hard, and for whom?',
    '',
    '## Proposed change',
    '',
    'What would you do instead?',
    '',
    '## Alternatives considered',
    '',
    '## Out of scope',
  ],
}

const synth = (options: IssueTemplateOptions, at = filePath) => {
  const project = new Project({ name: 'test-project' })

  new IssueTemplate(project, at, options)

  return synthSnapshot(project)
}

test('writes a Markdown issue template', () => {
  expect(synth(proposal)[filePath]).toMatchSnapshot()
})

test('writes front matter as YAML 1.1', () => {
  const content: string = synth({
    ...proposal,
    title: 'Yes',
    labels: ['on', '1:20'],
    assignees: 'octocat, hubot',
    type: 'Feature',
  })[filePath]

  expect(YAML.parse(content.split('---\n')[1]!, { version: '1.1' })).toEqual({
    name: 'Proposal',
    about: proposal.about,
    title: 'Yes',
    labels: ['on', '1:20'],
    assignees: 'octocat, hubot',
    type: 'Feature',
  })
})

test('takes the body as a string', () => {
  expect(synth({ ...proposal, body: '## Problem\n' })[filePath]).toMatch(
    /---\n\n## Problem\n$/,
  )
})

test('writes a template with no body', () => {
  expect(synth({ ...proposal, body: '' })[filePath]).toMatch(/---\n\n$/)
})

test('marks the file on request', () => {
  expect(synth({ ...proposal, marker: true })[filePath]).toMatchSnapshot()
})

describe('seeded', () => {
  test('writes the file once', () => {
    const first = new Project({ name: 'test-project' })

    new IssueTemplate(first, filePath, { ...proposal, managed: false })
    first.synth()

    const file = path.join(first.outdir, filePath)

    try {
      writeFileSync(file, 'edited\n')

      const second = new Project({ name: 'test-project', outdir: first.outdir })

      new IssueTemplate(second, filePath, { ...proposal, managed: false })
      second.synth()

      expect(readFileSync(file, 'utf8')).toBe('edited\n')
    } finally {
      rmSync(first.outdir, { force: true, recursive: true })
    }
  })

  test('is left out of the manifest', () => {
    const files = synth({ ...proposal, managed: false })

    expect(files[filePath]).toContain('## Problem')
    expect(files['.projen/files.json'].files).not.toContain(filePath)
  })

  test('refuses a marker', () => {
    expect(() => synth({ ...proposal, managed: false, marker: true })).toThrow(
      `${filePath}: \`marker\` needs \`managed\`.`,
    )
  })
})

describe('validation', () => {
  test.each([
    [{ name: 'RFC' }, '`name` must be more than 3 characters'],
    [{ about: '' }, '`about` must not be empty or whitespace.'],
    [{ description: 'x' }, '`description` is not a permitted key.'],
    [{ body: [1] }, '`body` must be a string, or a list of lines.'],
  ])('rejects %o', (overrides, message) => {
    expect(() =>
      synth({ ...proposal, ...overrides } as IssueTemplateOptions),
    ).toThrow(`${filePath}: ${message}`)
  })

  test.each([
    [
      '.github/ISSUE_TEMPLATE/02-proposal.yml',
      'not a Markdown issue template location',
    ],
    [
      '.github/pull_request_template.md',
      'not a Markdown issue template location',
    ],
    ['ISSUE_TEMPLATE.md', 'retired the single ISSUE_TEMPLATE.md'],
  ])('rejects the path %s', (at, message) => {
    expect(() => synth(proposal, at)).toThrow(`${at}: `)
    expect(() => synth(proposal, at)).toThrow(message)
  })
})
