import { describe, expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import YAML from 'yaml'

import { IssueForm, type IssueFormOptions } from './issue-form'

const path = '.github/ISSUE_TEMPLATE/01-bug-report.yml'

const bugReport: IssueFormOptions = {
  name: 'Bug report',
  description: 'Something is broken and you can reproduce it.',
  title: '[bug] ',
  labels: ['bug', 'needs triage'],
  body: [
    {
      type: 'markdown',
      attributes: {
        value: [
          'Thanks for taking the time to file this.',
          '',
          'Please search existing issues first — duplicates get closed.',
        ].join('\n'),
      },
    },
    {
      type: 'checkboxes',
      id: 'prerequisites',
      attributes: {
        label: 'Prerequisites',
        options: [
          { label: 'I searched the existing issues', required: true },
          { label: 'I am on the latest release', required: true },
        ],
      },
    },
    {
      type: 'input',
      id: 'version',
      attributes: {
        label: 'Version',
        description: 'Output of `acme --version`.',
        placeholder: '1.4.2',
      },
      validations: { required: true },
    },
    {
      type: 'dropdown',
      id: 'install-method',
      attributes: {
        label: 'How did you install it?',
        options: ['npm', 'pnpm', 'Homebrew', 'Built from source'],
        default: 1,
      },
      validations: { required: true },
    },
    {
      type: 'textarea',
      id: 'reproduction',
      attributes: {
        label: 'Reproduction steps',
        description: 'What did you run, and what happened?',
        value: '1.\n2.\n3.\n',
      },
      validations: { required: true, min_length: 10 },
    },
    {
      type: 'textarea',
      id: 'logs',
      attributes: { label: 'Relevant log output', render: 'shell' },
      validations: { required: false },
    },
    {
      type: 'upload',
      id: 'screenshots',
      attributes: { label: 'Screenshots' },
      validations: { accept: '.png,.jpg,.log' },
    },
  ],
}

const synth = (
  options: IssueFormOptions,
  configure?: (file: IssueForm) => void,
  filePath = path,
) => {
  const project = new Project({ name: 'test-project' })

  const file = new IssueForm(project, filePath, options)

  configure?.(file)

  return synthSnapshot(project)
}

test('writes an issue form', () => {
  expect(synth(bugReport)[path]).toMatchSnapshot()
})

test('writes keys in a fixed order', () => {
  const { body, name, ...rest } = bugReport
  const emitted = synth({ body, ...rest, name })[path]

  expect(Object.keys(YAML.parse(emitted))).toEqual([
    'name',
    'description',
    'title',
    'labels',
    'body',
  ])
})

test('survives a YAML 1.1 round trip', () => {
  const declared = [
    'Yes',
    'No',
    'y',
    'n',
    'on',
    'off',
    '1:20',
    '12:34:56',
    '2001-12-15',
    '2001-12-15T02:59:43.1Z',
    '12_000',
    'Maybe',
  ]

  const emitted = synth(
    {
      name: 'Poll',
      description: 'Pick one.',
      body: [
        {
          type: 'dropdown',
          attributes: { label: 'Answer', options: declared },
        },
      ],
    },
    undefined,
    '.github/ISSUE_TEMPLATE/poll.yml',
  )['.github/ISSUE_TEMPLATE/poll.yml']

  expect(
    YAML.parse(emitted, { version: '1.1' }).body[0].attributes.options,
  ).toEqual(declared)
})

describe('validation', () => {
  test('rejects an invalid form', () => {
    expect(() => synth({ ...bugReport, name: 'Bug' })).toThrow(
      `${path}: \`name\` must be more than 3 characters`,
    )
  })

  test('reports every problem', () => {
    expect(() => synth({ ...bugReport, name: 'Bug', description: '' })).toThrow(
      new RegExp(`${path}: \`name\`.*\\n${path}: \`description\``, 's'),
    )
  })

  test('rejects an option meant for another template', () => {
    expect(() =>
      synth({ ...bugReport, about: 'x' } as unknown as IssueFormOptions),
    ).toThrow(`${path}: \`about\` is not a permitted key.`)
  })

  test('validates the form after overrides', () => {
    expect(() =>
      synth(bugReport, (file) => file.addOverride('name', 'ab')),
    ).toThrow(`${path}: \`name\` must be more than 3 characters`)
  })

  test('accepts a form an override repairs', () => {
    expect(() =>
      synth(bugReport, (file) =>
        file.addOverride('body.0.attributes.value', 'Hi'),
      ),
    ).not.toThrow()
  })

  test.each([
    ['.github/ISSUE_TEMPLATE/bug.md', 'not an issue form location'],
    ['.github/ISSUE_TEMPLATE/config.yml', 'not an issue form location'],
    ['.github/ISSUE_TEMPLATE/bug.yaml', 'issue forms must use the `.yml`'],
  ])('rejects the path %s', (filePath, message) => {
    expect(() => synth(bugReport, undefined, filePath)).toThrow(
      `${filePath}: ${message}`,
    )
  })
})
