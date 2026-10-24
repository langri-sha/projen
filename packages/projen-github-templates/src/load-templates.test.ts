import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import { GitHubTemplates, loadTemplates } from './index'

const fixture = (name: string) =>
  path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__', name)

describe('loadTemplates', () => {
  test('keys templates by repository path', () => {
    expect(Object.keys(loadTemplates(fixture('templates')))).toEqual([
      '.github/ISSUE_TEMPLATE/01-bug-report.yml',
      '.github/ISSUE_TEMPLATE/02-proposal.md',
      '.github/ISSUE_TEMPLATE/config.yml',
      '.github/PULL_REQUEST_TEMPLATE/release.md',
      '.github/pull_request_template.md',
    ])
  })

  test('reads an issue form as written', () => {
    expect(
      loadTemplates(fixture('templates'))[
        '.github/ISSUE_TEMPLATE/01-bug-report.yml'
      ],
    ).toEqual({
      name: 'Bug report',
      description: 'Something is broken.',
      labels: ['bug'],
      body: [
        {
          type: 'textarea',
          id: 'what',
          attributes: { label: 'What happened?' },
          validations: { required: true },
        },
        {
          type: 'textarea',
          id: 'logs',
          attributes: { label: 'Logs', render: 'shell' },
        },
      ],
    })
  })

  test('reads front matter and the rest of a Markdown issue template', () => {
    expect(
      loadTemplates(fixture('templates'))[
        '.github/ISSUE_TEMPLATE/02-proposal.md'
      ],
    ).toEqual({
      name: 'Proposal',
      about: 'Suggest a change that needs discussion first.',
      labels: 'enhancement',
      body: '## Problem\n\n## Proposed change\n',
    })
  })

  test('reads the chooser with camelCase keys', () => {
    expect(
      loadTemplates(fixture('templates'))['.github/ISSUE_TEMPLATE/config.yml'],
    ).toEqual({
      blankIssuesEnabled: false,
      contactLinks: [
        {
          name: 'Questions',
          url: 'https://github.com/acme/acme/discussions',
          about: 'Ask here first.',
        },
      ],
    })
  })

  test('omits chooser keys the file leaves out', () => {
    expect(
      loadTemplates(fixture('chooser-only'))[
        '.github/ISSUE_TEMPLATE/config.yml'
      ],
    ).toEqual({ blankIssuesEnabled: true })
  })

  test('reads pull request templates whole', () => {
    const templates = loadTemplates(fixture('templates'))

    expect(templates['.github/pull_request_template.md']).toEqual({
      body: '## What does this PR do?\n\n## Recommendations for testing\n',
    })
    expect(templates['.github/PULL_REQUEST_TEMPLATE/release.md']).toEqual({
      body: '## Release notes\n',
    })
  })

  test('rejects a file that is not at a template location', () => {
    expect(() => loadTemplates(fixture('invalid-path'))).toThrow(
      '.github/readme.md: not a template location.',
    )
  })

  test('rejects a Markdown issue template without front matter', () => {
    expect(() => loadTemplates(fixture('no-front-matter'))).toThrow(
      '.github/ISSUE_TEMPLATE/01-proposal.md: missing YAML front matter.',
    )
  })

  test('names the file when YAML does not parse', () => {
    expect(() => loadTemplates(fixture('malformed-yaml'))).toThrow(
      /^\.github\/ISSUE_TEMPLATE\/01-bug\.yml: /,
    )
  })

  test('rejects YAML that is not a mapping', () => {
    expect(() => loadTemplates(fixture('not-a-mapping'))).toThrow(
      '.github/ISSUE_TEMPLATE/01-bug.yml: expected a YAML mapping.',
    )
  })

  test('feeds GitHubTemplates and synthesizes every file', () => {
    const project = new Project({ name: 'test-project' })

    new GitHubTemplates(project, { files: loadTemplates(fixture('templates')) })

    const synthesized = synthSnapshot(project)

    expect(
      Object.fromEntries(
        Object.entries(synthesized).filter(([file]) =>
          /^\.github\/(ISSUE_TEMPLATE|PULL_REQUEST_TEMPLATE|pull_request)/.test(
            file,
          ),
        ),
      ),
    ).toMatchSnapshot()
  })
})
