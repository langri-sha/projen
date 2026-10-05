import { expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import {
  IssueTemplateChooser,
  type IssueTemplateChooserOptions,
} from './issue-template-chooser'

const path = '.github/ISSUE_TEMPLATE/config.yml'

const synth = (
  options?: IssueTemplateChooserOptions,
  configure?: (file: IssueTemplateChooser) => void,
) => {
  const project = new Project({ name: 'test-project' })

  const file = new IssueTemplateChooser(project, options)

  configure?.(file)

  return synthSnapshot(project)[path]
}

test('writes the chooser with GitHub keys', () => {
  expect(
    synth({
      blankIssuesEnabled: false,
      contactLinks: [
        {
          name: 'Questions and usage help',
          url: 'https://github.com/acme/acme/discussions',
          about: 'Ask here first — issues are for defects and proposals.',
        },
        {
          name: 'Report a security vulnerability',
          url: 'https://github.com/acme/acme/security/advisories/new',
          about: 'Please do not open a public issue for security reports.',
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('writes an empty chooser', () => {
  expect(synth()).toMatchSnapshot()
})

test('rejects a link that is not http', () => {
  expect(() =>
    synth({
      contactLinks: [{ name: 'Email', url: 'mailto:a@b.c', about: 'Write.' }],
    }),
  ).toThrow(
    `${path}: contact_links[0]: \`url\` must start with http:// or https://.`,
  )
})

test('rejects GitHub keys as options', () => {
  expect(() =>
    synth({ blank_issues_enabled: false } as IssueTemplateChooserOptions),
  ).toThrow(
    `${path}: \`blank_issues_enabled\` is not an option. Use \`blankIssuesEnabled\`, \`contactLinks\`.`,
  )
})

test('validates the chooser after overrides', () => {
  expect(() =>
    synth({}, (file) => file.addOverride('blank_issues_enabled', 'no')),
  ).toThrow(`${path}: \`blank_issues_enabled\` must be a Boolean.`)
})
