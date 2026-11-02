import { expect, expectTypeOf, test } from '@langri-sha/vitest'

import type {
  CheckboxesAttributes,
  DropdownAttributes,
  GitHubTemplatesOptions,
  IssueFormOptions,
  IssueTemplateChooserOptions,
  IssueTemplateOptions,
  PullRequestTemplateOptions,
} from './index.js'

test('readonly template collections and bodies retain their strict types', () => {
  const choices = ['One', 'Two'] as const
  const dropdown: DropdownAttributes = { label: 'Version', options: choices }
  const checkboxes: CheckboxesAttributes = {
    label: 'Checks',
    options: [{ label: 'Read the docs' }] as const,
  }
  const form: IssueFormOptions = {
    name: 'Bug report',
    description: 'Report a bug',
    labels: choices,
    assignees: choices,
    projects: choices,
    body: [{ type: 'input', attributes: { label: 'Version' } }] as const,
  }
  const issue: IssueTemplateOptions = {
    name: 'Bug report',
    about: 'Report a bug',
    body: choices,
    labels: choices,
    assignees: choices,
  }
  const pullRequest: PullRequestTemplateOptions = { body: choices }
  const chooser: IssueTemplateChooserOptions = {
    contactLinks: [
      { name: 'Help', url: 'https://example.com', about: 'Get help' },
    ] as const,
  }
  const templates: GitHubTemplatesOptions = {
    files: { '.github/ISSUE_TEMPLATE/bug.yml': form },
    unmanaged: ['.github/pull_request_template.md'] as const,
  }

  expect(dropdown.options).toBe(choices)
  expect(checkboxes.options).toHaveLength(1)
  expect(issue.body).toBe(choices)
  expect(pullRequest.body).toBe(choices)
  expect(chooser.contactLinks).toHaveLength(1)
  expect(templates.unmanaged).toHaveLength(1)
  expectTypeOf<{
    name: string
    description: string
    body: number
  }>().not.toExtend<IssueFormOptions>()
  expectTypeOf<{
    name: string
    description: string
  }>().not.toExtend<IssueFormOptions>()
  expectTypeOf<{
    body: readonly number[]
  }>().not.toExtend<PullRequestTemplateOptions>()
  expectTypeOf<{
    label: string
    options: readonly number[]
  }>().not.toExtend<DropdownAttributes>()
  expectTypeOf<{
    contactLinks: readonly string[]
  }>().not.toExtend<IssueTemplateChooserOptions>()
  expectTypeOf<{
    unmanaged: readonly number[]
  }>().not.toExtend<GitHubTemplatesOptions>()
})
