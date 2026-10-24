import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import { GitHubTemplates, loadTemplates } from 'projen-github-templates'

const templates = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'templates',
)

test('loads every template file', () => {
  expect(Object.keys(loadTemplates(templates))).toEqual([
    '.github/ISSUE_TEMPLATE/01-bug-report.yml',
    '.github/ISSUE_TEMPLATE/02-feature-request.yml',
    '.github/ISSUE_TEMPLATE/03-maintenance.yml',
    '.github/ISSUE_TEMPLATE/config.yml',
    '.github/pull_request_template.md',
  ])
})

test('validates and synthesizes every template', () => {
  const project = new Project({ name: 'test-project' })

  new GitHubTemplates(project, { files: loadTemplates(templates) })

  const synthesized = synthSnapshot(project)

  expect(
    Object.keys(synthesized)
      .filter((file) => file.startsWith('.github/'))
      .sort(),
  ).toEqual(Object.keys(loadTemplates(templates)).sort())
})

test.each(['type', 'assignees', 'projects'])(
  'leaves the %s key out of every form',
  (key) => {
    for (const template of Object.values(loadTemplates(templates))) {
      expect(template).not.toHaveProperty(key)
    }
  },
)
