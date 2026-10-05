import { expect, test } from '@langri-sha/vitest'
import { Project, github } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import { GitHubTemplates, type GitHubTemplatesOptions } from './index'

const options: GitHubTemplatesOptions = {
  files: {
    '.github/ISSUE_TEMPLATE/01-bug-report.yml': {
      name: 'Bug report',
      description: 'Something is broken and you can reproduce it.',
      title: '[bug] ',
      labels: ['bug', 'needs triage'],
      body: [
        {
          type: 'markdown',
          attributes: { value: 'Thanks for taking the time to file this.' },
        },
        {
          type: 'input',
          id: 'version',
          attributes: { label: 'Version', placeholder: '1.4.2' },
          validations: { required: true },
        },
      ],
    },
    '.github/ISSUE_TEMPLATE/02-proposal.md': {
      name: 'Proposal',
      about: 'Suggest a change that needs discussion before implementation.',
      title: '[proposal] ',
      labels: ['proposal'],
      body: ['## Problem', '', '## Proposed change'],
    },
    '.github/ISSUE_TEMPLATE/config.yml': {
      blankIssuesEnabled: false,
      contactLinks: [
        {
          name: 'Questions and usage help',
          url: 'https://github.com/acme/acme/discussions',
          about: 'Ask here first — issues are for defects and proposals.',
        },
      ],
    },
    '.github/pull_request_template.md': {
      body: ['## What changed', '', '## Checklist', '', '- [ ] Tests'],
    },
    'docs/PULL_REQUEST_TEMPLATE/release.md': {
      body: ['## Release', '', '- [ ] Change files present'],
      managed: false,
    },
  },
  unmanaged: ['.github/ISSUE_TEMPLATE/00-security.md'],
}

test('defaults', () => {
  const project = new Project({ name: 'test-project' })

  new GitHubTemplates(project)

  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('templates', () => {
  const project = new github.GitHubProject({
    name: 'test-project',
    github: false,
  })

  new GitHubTemplates(project, options)

  const files = synthSnapshot(project)

  expect(files['.github/ISSUE_TEMPLATE/00-security.md']).toBeUndefined()
  expect(
    Object.fromEntries(
      Object.entries(files).filter(([filePath]) =>
        /^(\.gitattributes|\.github\/|docs\/)/.test(filePath),
      ),
    ),
  ).toMatchSnapshot()
})
