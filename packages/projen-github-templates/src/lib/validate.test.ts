import { describe, expect, test } from '@langri-sha/vitest'

import {
  validateBody,
  validateChooser,
  validateIssueForm,
  validateIssueTemplate,
  validateOptions,
} from './validate'

const input = { type: 'input', attributes: { label: 'Version' } }

const form = (overrides: Record<string, unknown> = {}) => ({
  name: 'Bug report',
  description: 'Something is broken.',
  body: [input],
  ...overrides,
})

const withBody = (...body: unknown[]) => validateIssueForm(form({ body }))

describe('validateIssueForm', () => {
  test('passes a form using every element type', () => {
    expect(
      validateIssueForm(
        form({
          title: '[bug] ',
          labels: ['bug', 'needs triage'],
          assignees: 'octocat, hubot',
          type: 'Bug',
          projects: ['octo-org/1'],
          body: [
            { type: 'markdown', attributes: { value: 'Thanks!' } },
            {
              type: 'input',
              id: 'version',
              attributes: {
                label: 'Version',
                description: 'Output of `acme --version`.',
                placeholder: '1.4.2',
                value: '1.0.0',
              },
              validations: { required: true, min_length: 0 },
            },
            {
              type: 'textarea',
              id: 'logs',
              attributes: { label: 'Logs', render: 'shell' },
              validations: { required: false, min_length: 10 },
            },
            {
              type: 'dropdown',
              id: 'install_method',
              attributes: {
                label: 'Install method',
                multiple: false,
                options: ['npm', 'pnpm'],
                default: 1,
              },
              validations: { required: true },
            },
            {
              type: 'checkboxes',
              attributes: {
                label: 'Prerequisites',
                options: [
                  { label: 'I searched the issues', required: true },
                  { label: 'I am on the latest release' },
                ],
              },
            },
            {
              type: 'upload',
              id: 'screenshots',
              attributes: { label: 'Screenshots' },
              validations: { accept: '.png,.log' },
            },
          ],
        }),
      ),
    ).toEqual([])
  })

  test.each([
    [{ hello: 'world' }, '`hello` is not a permitted key. Use `name`,'],
    [{ yes: 'y' }, '`yes` is not a permitted key.'],
    [{ name: undefined }, '`name` is required.'],
    [{ name: true }, '`name` must be a string.'],
    [{ name: 'Bug' }, '`name` must be more than 3 characters'],
    [{ name: ' Bug ' }, '`name` must be more than 3 characters'],
    [{ description: undefined }, '`description` is required.'],
    [{ description: '  ' }, '`description` must not be empty or whitespace.'],
    [
      { title: '' },
      '`title` must not be empty or whitespace. Omit it instead.',
    ],
    [{ type: 1 }, '`type` must be a string.'],
    [{ labels: { bug: true } }, '`labels` must be a list of strings'],
    [{ assignees: '      ' }, '`assignees` must not be empty or whitespace.'],
    [{ projects: ['octo-org/1', ''] }, '`projects[1]` must be a non-empty'],
    [{ body: undefined }, '`body` cannot be empty.'],
    [{ body: [] }, '`body` cannot be empty.'],
  ])('rejects %o', (overrides, message) => {
    expect(validateIssueForm(form(overrides))).toEqual([
      expect.stringContaining(message),
    ])
  })

  test('requires a non-markdown field', () => {
    expect(
      withBody({
        type: 'markdown',
        attributes: { value: 'Bugs are the worst!' },
      }),
    ).toEqual([
      '`body` must contain at least one non-markdown field, or the form accepts no input.',
    ])
  })

  describe('elements', () => {
    test.each([
      ['a non-object', 'input', 'body[0]: must be a form element object.'],
      [
        'a missing type',
        { attributes: { label: 'Name' } },
        'body[0]: required key `type` is missing.',
      ],
      [
        'an unknown type',
        { type: 'x', attributes: { label: 'Name' } },
        'body[0]: `x` is not a valid input type. Use `markdown`, `input`,',
      ],
      [
        'an unknown key',
        { ...input, x: 'woof' },
        'body[0]: `x` is not a permitted key.',
      ],
      [
        'missing attributes',
        { type: 'input' },
        'body[0]: required key `attributes` is missing.',
      ],
      [
        'an unknown attribute',
        { type: 'input', attributes: { label: 'Name', x: 'a random key!' } },
        'body[0]: `x` is not a permitted attribute. Use `label`,',
      ],
      [
        'a missing label',
        { type: 'textarea', attributes: {} },
        'body[0]: `label` is required.',
      ],
      [
        'a Boolean label',
        { type: 'textarea', attributes: { label: true } },
        'body[0]: `label` must be a string.',
      ],
      [
        'a blank label',
        { type: 'textarea', attributes: { label: '     ' } },
        'body[0]: `label` must not be empty or whitespace.',
      ],
      [
        'a blank description',
        { type: 'input', attributes: { label: 'Name', description: '' } },
        'body[0]: `description` must not be empty or whitespace.',
      ],
      [
        'a blank value',
        { type: 'input', attributes: { label: 'Name', value: ' ' } },
        'body[0]: `value` must not be empty or whitespace.',
      ],
      [
        'a blank placeholder',
        { type: 'input', attributes: { label: 'Name', placeholder: '' } },
        'body[0]: `placeholder` must not be empty or whitespace.',
      ],
      [
        'an id with a space',
        { ...input, id: 'first name' },
        'body[0]: `id` can only contain letters, digits, `-` and `_`.',
      ],
      [
        'a password label on an input',
        { type: 'input', attributes: { label: 'Password' } },
        'body[0]: `label` contains the forbidden word "password".',
      ],
      [
        'a password label on a textarea',
        { type: 'textarea', attributes: { label: 'Your password hint' } },
        'body[0]: `label` contains the forbidden word "password".',
      ],
      [
        'an unknown validation',
        { ...input, validations: { accept: '.png' } },
        'body[0]: validations: `accept` is not a permitted key.',
      ],
      [
        'a non-Boolean required',
        { ...input, validations: { required: 'yes' } },
        'body[0]: validations: `required` must be a Boolean.',
      ],
      [
        'a negative min_length',
        { ...input, validations: { min_length: -1 } },
        'body[0]: validations: `min_length` must be a non-negative integer.',
      ],
      [
        'a fractional min_length',
        {
          type: 'textarea',
          attributes: { label: 'Logs' },
          validations: { min_length: 1.5 },
        },
        'body[0]: validations: `min_length` must be a non-negative integer.',
      ],
      [
        'min_length on a dropdown',
        {
          type: 'dropdown',
          attributes: { label: 'Pick', options: ['a'] },
          validations: { min_length: 1 },
        },
        'body[0]: validations: `min_length` is not a permitted key.',
      ],
      [
        'non-object validations',
        { ...input, validations: true },
        'body[0]: `validations` must be an object.',
      ],
    ])('rejects %s', (_, element, message) => {
      expect(withBody(element)).toEqual([expect.stringContaining(message)])
    })

    test('rejects an id on markdown', () => {
      expect(
        withBody(
          { type: 'markdown', id: 'intro', attributes: { value: 'Hi' } },
          input,
        ),
      ).toEqual(['body[0]: `markdown` elements cannot carry an `id`.'])
    })

    test('rejects validations on markdown', () => {
      expect(
        withBody(
          {
            type: 'markdown',
            attributes: { value: 'Hi' },
            validations: { required: true },
          },
          input,
        ),
      ).toEqual([
        'body[0]: `validations` is not a permitted key. Use `type`, `attributes`.',
      ])
    })

    test('requires a markdown value', () => {
      expect(withBody({ type: 'markdown', attributes: {} }, input)).toEqual([
        'body[0]: `value` is required.',
      ])
    })

    test('points accept at validations', () => {
      expect(
        withBody({
          type: 'upload',
          attributes: { label: 'Logs', accept: '.log' },
        }),
      ).toEqual([
        'body[0]: `accept` belongs under `validations`, not `attributes`.',
      ])
    })

    test('rejects a blank accept', () => {
      expect(
        withBody({
          type: 'upload',
          attributes: { label: 'Logs' },
          validations: { accept: '' },
        }),
      ).toEqual([
        'body[0]: validations: `accept` must not be empty or whitespace. Omit it instead.',
      ])
    })
  })

  describe('dropdown', () => {
    const dropdown = (attributes: Record<string, unknown>) =>
      withBody({
        type: 'dropdown',
        attributes: { label: 'Favorite dessert', ...attributes },
      })

    test.each([
      [{}, '`options` must be a non-empty list.'],
      [{ options: [] }, '`options` must be a non-empty list.'],
      [{ options: ['pie', true] }, '`options[1]` must be a non-empty string.'],
      [{ options: ['pie', ' '] }, '`options[1]` must be a non-empty string.'],
      [
        { options: ['ice cream', 'ice cream', 'pie'] },
        '`options` must be unique.',
      ],
      [
        { options: ['Steak & Ale', 'None'] },
        '`options` must not include the reserved word, None.',
      ],
      [
        { options: ['none'] },
        '`options` must not include the reserved word, None.',
      ],
      [
        { options: ['pie'], default: 1 },
        '`default` must be an index into `options`, from 0 to 0.',
      ],
      [{ options: ['pie'], default: -1 }, '`default` must be an index'],
      [{ options: ['pie'], default: '0' }, '`default` must be an index'],
      [
        { options: ['pie', 'N/A'], default: 0 },
        '`options` must not include n/a when `default` is set.',
      ],
      [{ options: ['pie'], multiple: 'yes' }, '`multiple` must be a Boolean.'],
    ])('rejects %o', (attributes, message) => {
      expect(dropdown(attributes)).toEqual([
        expect.stringContaining(`body[0]: ${message}`),
      ])
    })

    test('allows n/a without a default', () => {
      expect(dropdown({ options: ['pie', 'n/a'] })).toEqual([])
    })
  })

  describe('checkboxes', () => {
    const checkboxes = (options: unknown, id?: string) => ({
      type: 'checkboxes',
      ...(id ? { id } : {}),
      attributes: { label: 'Prerequisites', options },
    })

    test.each([
      [undefined, '`options` must be a non-empty list.'],
      [[], '`options` must be a non-empty list.'],
      [['I agree'], '`options[0]` must be an object with a `label`.'],
      [[{}], '`options[0]`: `label` is required.'],
      [
        [{ label: '' }],
        '`options[0]`: `label` must not be empty or whitespace.',
      ],
      [
        [{ label: 'a', required: 1 }],
        '`options[0]`: `required` must be a Boolean.',
      ],
      [[{ label: 'a', x: 1 }], '`options[0]`: `x` is not a permitted key.'],
      [
        [{ label: 'a', id: 'a' }],
        '`options[0]`: checkbox options cannot carry an `id`.',
      ],
      [
        [{ label: 'a' }, { label: 'a' }],
        'checkbox option labels must be unique.',
      ],
    ])('rejects %o', (options, message) => {
      expect(withBody(checkboxes(options))).toEqual([
        expect.stringContaining(`body[0]: ${message}`),
      ])
    })

    test('rejects an option clashing with a label', () => {
      expect(
        withBody(
          { type: 'textarea', attributes: { label: 'Name' } },
          checkboxes([{ label: 'Name' }]),
        ),
      ).toEqual([
        'body[1]: checkbox option Name clashes with the `label` of body[0]. Change one, or give one of the elements an `id`.',
      ])
    })

    test('allows an option clashing with a label told apart by id', () => {
      expect(
        withBody(
          { type: 'textarea', id: 'name_1', attributes: { label: 'Name' } },
          checkboxes([{ label: 'Name' }]),
        ),
      ).toEqual([])
    })

    test('allows an option clashing with a label when the checkboxes carry an id', () => {
      expect(
        withBody(
          { type: 'textarea', attributes: { label: 'Name' } },
          checkboxes([{ label: 'Name' }], 'confirm'),
        ),
      ).toEqual([])
    })
  })

  describe('across elements', () => {
    test('rejects duplicate ids', () => {
      expect(
        withBody(
          { type: 'input', id: 'name', attributes: { label: 'First name' } },
          { type: 'input', id: 'name', attributes: { label: 'Last name' } },
        ),
      ).toEqual([
        'body[1]: `id` name is already used by body[0]. Ids must be unique.',
      ])
    })

    test('rejects duplicate labels', () => {
      expect(
        withBody(
          { type: 'textarea', attributes: { label: 'Name' } },
          { type: 'textarea', attributes: { label: 'Name' } },
        ),
      ).toEqual([
        'body[1]: `label` Name is already used by body[0]. Change one, or give one of them an `id`.',
      ])
    })

    test('allows duplicate labels told apart by id', () => {
      expect(
        withBody(
          { type: 'textarea', id: 'name_1', attributes: { label: 'Name' } },
          { type: 'textarea', id: 'name_2', attributes: { label: 'Name' } },
        ),
      ).toEqual([])
    })

    test('allows duplicate labels when one carries an id', () => {
      expect(
        withBody(
          { type: 'textarea', attributes: { label: 'Name' } },
          { type: 'input', id: 'name', attributes: { label: 'Name' } },
        ),
      ).toEqual([])
    })

    test('allows markdown to repeat a label', () => {
      expect(
        withBody(
          { type: 'markdown', attributes: { value: 'Name' } },
          { type: 'input', attributes: { label: 'Name' } },
        ),
      ).toEqual([])
    })
  })
})

describe('validateIssueTemplate', () => {
  const frontMatter = (overrides: Record<string, unknown> = {}) => ({
    name: 'Proposal',
    about: 'Suggest a change.',
    ...overrides,
  })

  test('passes full front matter', () => {
    expect(
      validateIssueTemplate(
        frontMatter({
          title: '[proposal] ',
          labels: ['proposal'],
          assignees: 'octocat',
          type: 'Feature',
        }),
      ),
    ).toEqual([])
  })

  test.each([
    [{ description: 'x' }, '`description` is not a permitted key.'],
    [{ name: undefined }, '`name` is required.'],
    [{ name: 'RFC' }, '`name` must be more than 3 characters'],
    [{ about: undefined }, '`about` is required.'],
    [{ about: '' }, '`about` must not be empty or whitespace.'],
    [{ labels: [''] }, '`labels[0]` must be a non-empty string.'],
  ])('rejects %o', (overrides, message) => {
    expect(validateIssueTemplate(frontMatter(overrides))).toEqual([
      expect.stringContaining(message),
    ])
  })
})

describe('validateChooser', () => {
  const link = {
    name: 'Questions',
    url: 'https://github.com/acme/acme/discussions',
    about: 'Ask here first.',
  }

  test('passes a chooser', () => {
    expect(
      validateChooser({
        blank_issues_enabled: false,
        contact_links: [link, { ...link, url: 'http://example.com' }],
      }),
    ).toEqual([])
  })

  test('passes an empty chooser', () => {
    expect(validateChooser({})).toEqual([])
  })

  test.each([
    [
      { blankIssuesEnabled: false },
      '`blankIssuesEnabled` is not a permitted key.',
    ],
    [
      { blank_issues_enabled: 'false' },
      '`blank_issues_enabled` must be a Boolean.',
    ],
    [{ contact_links: link }, '`contact_links` must be a list.'],
    [{ contact_links: ['x'] }, 'contact_links[0]: must be an object'],
    [
      { contact_links: [{ ...link, url: 'mailto:a@b.c' }] },
      'contact_links[0]: `url` must start with http:// or https://.',
    ],
    [
      { contact_links: [{ ...link, url: undefined }] },
      'contact_links[0]: `url` must start with',
    ],
    [
      { contact_links: [{ ...link, name: '' }] },
      'contact_links[0]: `name` must not be empty',
    ],
    [
      { contact_links: [{ ...link, about: undefined }] },
      'contact_links[0]: `about` is required.',
    ],
    [
      { contact_links: [{ ...link, x: 1 }] },
      'contact_links[0]: `x` is not a permitted key.',
    ],
  ])('rejects %o', (obj, message) => {
    expect(validateChooser(obj)).toEqual([expect.stringContaining(message)])
  })
})

describe('validateBody', () => {
  test('passes a body', () => {
    expect(validateBody('## What changed\n')).toEqual([])
  })

  test('rejects a blank body', () => {
    expect(validateBody(' \n')).toEqual([
      'the body is empty. Write the template, or remove it.',
    ])
  })
})

describe('validateOptions', () => {
  test('passes known options', () => {
    expect(validateOptions({ body: 'x' }, ['body', 'marker'])).toEqual([])
  })

  test('rejects unknown options', () => {
    expect(
      validateOptions({ body: 'x', name: 'y' }, ['body', 'marker']),
    ).toEqual(['`name` is not an option. Use `body`, `marker`.'])
  })
})
