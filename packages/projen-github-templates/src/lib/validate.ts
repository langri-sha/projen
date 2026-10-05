/**
 * The rules GitHub documents as fatal, run against the object as it will be
 * written. Each returns one sentence per problem; an empty list means valid.
 *
 * @see https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/common-validation-errors-when-creating-issue-forms
 */

type Problems = string[]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isBlank = (value: string) => value.trim() === ''

const keys = (names: readonly string[]) =>
  names.map((name) => `\`${name}\``).join(', ')

const unknownKeys = (
  obj: Record<string, unknown>,
  permitted: readonly string[],
  where: string,
  kind = 'key',
): Problems =>
  Object.keys(obj)
    .filter((key) => !permitted.includes(key))
    .map(
      (key) =>
        `${where}\`${key}\` is not a permitted ${kind}. Use ${keys(permitted)}.`,
    )

const string = (
  obj: Record<string, unknown>,
  key: string,
  where: string,
  required: boolean,
): Problems => {
  const value = obj[key]

  if (value === undefined) {
    return required ? [`${where}\`${key}\` is required.`] : []
  }

  if (typeof value !== 'string') {
    return [`${where}\`${key}\` must be a string.`]
  }

  if (isBlank(value)) {
    return [
      `${where}\`${key}\` must not be empty or whitespace.${required ? '' : ' Omit it instead.'}`,
    ]
  }

  return []
}

const boolean = (
  obj: Record<string, unknown>,
  key: string,
  where: string,
): Problems =>
  obj[key] === undefined || typeof obj[key] === 'boolean'
    ? []
    : [`${where}\`${key}\` must be a Boolean.`]

const stringOrList = (
  obj: Record<string, unknown>,
  key: string,
  where: string,
): Problems => {
  const value = obj[key]

  if (value === undefined || typeof value === 'string') {
    return string(obj, key, where, false)
  }

  if (!Array.isArray(value)) {
    return [
      `${where}\`${key}\` must be a list of strings, or a comma-delimited string.`,
    ]
  }

  return value.flatMap((item, index) =>
    typeof item === 'string' && !isBlank(item)
      ? []
      : [`${where}\`${key}[${index}]\` must be a non-empty string.`],
  )
}

/**
 * GitHub silently leaves a template out of the chooser when its name is this
 * short, with no error anywhere.
 */
const name = (obj: Record<string, unknown>): Problems => {
  const problems = string(obj, 'name', '', true)

  if (problems.length === 0 && (obj.name as string).trim().length <= 3) {
    return [
      '`name` must be more than 3 characters, or GitHub silently leaves the template out of the chooser.',
    ]
  }

  return problems
}

const ISSUE_FORM_KEYS = [
  'name',
  'description',
  'body',
  'title',
  'labels',
  'assignees',
  'type',
  'projects',
] as const

const ELEMENT_TYPES = [
  'markdown',
  'input',
  'textarea',
  'dropdown',
  'checkboxes',
  'upload',
] as const

type ElementType = (typeof ELEMENT_TYPES)[number]

const ATTRIBUTES: Record<ElementType, readonly string[]> = {
  markdown: ['value'],
  input: ['label', 'description', 'placeholder', 'value'],
  textarea: ['label', 'description', 'placeholder', 'value', 'render'],
  dropdown: ['label', 'description', 'multiple', 'options', 'default'],
  checkboxes: ['label', 'description', 'options'],
  upload: ['label', 'description'],
}

const VALIDATIONS: Record<ElementType, readonly string[]> = {
  markdown: [],
  input: ['required', 'min_length'],
  textarea: ['required', 'min_length'],
  dropdown: ['required'],
  checkboxes: ['required'],
  upload: ['required', 'accept'],
}

const ID = /^[A-Za-z0-9_-]+$/

interface Element {
  readonly index: number
  readonly type: ElementType
  readonly id?: string
  readonly label?: string
  readonly options: readonly string[]
}

const dropdownOptions = (
  attributes: Record<string, unknown>,
  where: string,
): Problems => {
  const { options } = attributes

  if (!Array.isArray(options) || options.length === 0) {
    return [`${where}\`options\` must be a non-empty list.`]
  }

  const problems = options.flatMap((option, index) =>
    typeof option === 'string' && !isBlank(option)
      ? []
      : [`${where}\`options[${index}]\` must be a non-empty string.`],
  )

  if (problems.length > 0) {
    return problems
  }

  const values = options as string[]

  if (new Set(values).size !== values.length) {
    problems.push(`${where}\`options\` must be unique.`)
  }

  if (values.some((option) => option.trim().toLowerCase() === 'none')) {
    problems.push(
      `${where}\`options\` must not include the reserved word, None. GitHub adds it to a dropdown that is not required.`,
    )
  }

  const preselected = attributes.default

  if (preselected === undefined) {
    return problems
  }

  if (
    typeof preselected !== 'number' ||
    !Number.isInteger(preselected) ||
    preselected < 0 ||
    preselected >= values.length
  ) {
    problems.push(
      `${where}\`default\` must be an index into \`options\`, from 0 to ${values.length - 1}.`,
    )
  }

  if (values.some((option) => option.trim().toLowerCase() === 'n/a')) {
    problems.push(
      `${where}\`options\` must not include n/a when \`default\` is set.`,
    )
  }

  return problems
}

const checkboxOptions = (
  attributes: Record<string, unknown>,
  where: string,
): Problems => {
  const { options } = attributes

  if (!Array.isArray(options) || options.length === 0) {
    return [`${where}\`options\` must be a non-empty list.`]
  }

  const problems = options.flatMap((option, index) => {
    const at = `${where}\`options[${index}]\`: `

    if (!isRecord(option)) {
      return [
        `${where}\`options[${index}]\` must be an object with a \`label\`.`,
      ]
    }

    return [
      ...('id' in option
        ? [
            `${at}checkbox options cannot carry an \`id\`. Set one on the element instead.`,
          ]
        : unknownKeys(option, ['label', 'required'], at)),
      ...string(option, 'label', at, true),
      ...boolean(option, 'required', at),
    ]
  })

  if (problems.length > 0) {
    return problems
  }

  const labels = options.map((option) => (option as { label: string }).label)

  return new Set(labels).size === labels.length
    ? []
    : [`${where}checkbox option labels must be unique.`]
}

const validateElement = (
  element: unknown,
  index: number,
): { problems: Problems; element?: Element } => {
  const where = `body[${index}]: `

  if (!isRecord(element)) {
    return { problems: [`${where}must be a form element object.`] }
  }

  const { type } = element

  if (type === undefined) {
    return { problems: [`${where}required key \`type\` is missing.`] }
  }

  if (!ELEMENT_TYPES.includes(type as ElementType)) {
    return {
      problems: [
        `${where}\`${String(type)}\` is not a valid input type. Use ${keys(ELEMENT_TYPES)}.`,
      ],
    }
  }

  const kind = type as ElementType
  const problems: Problems = []

  if (kind === 'markdown') {
    problems.push(
      ...('id' in element
        ? [`${where}\`markdown\` elements cannot carry an \`id\`.`]
        : []),
      ...unknownKeys(
        element,
        ['type', 'attributes', ...('id' in element ? ['id'] : [])],
        where,
      ),
    )
  } else {
    problems.push(
      ...unknownKeys(
        element,
        ['type', 'id', 'attributes', 'validations'],
        where,
      ),
    )

    if (element.id !== undefined) {
      if (typeof element.id !== 'string' || !ID.test(element.id)) {
        problems.push(
          `${where}\`id\` can only contain letters, digits, \`-\` and \`_\`.`,
        )
      }
    }
  }

  const { attributes } = element

  if (!isRecord(attributes)) {
    problems.push(`${where}required key \`attributes\` is missing.`)

    return { problems }
  }

  problems.push(
    ...unknownKeys(attributes, ATTRIBUTES[kind], where, 'attribute').map(
      (problem) =>
        kind === 'upload' && problem.startsWith(`${where}\`accept\``)
          ? `${where}\`accept\` belongs under \`validations\`, not \`attributes\`.`
          : problem,
    ),
  )

  if (kind === 'markdown') {
    problems.push(...string(attributes, 'value', where, true))

    return { problems, element: { index, type: kind, options: [] } }
  }

  problems.push(
    ...string(attributes, 'label', where, true),
    ...string(attributes, 'description', where, false),
  )

  for (const key of ['placeholder', 'value', 'render']) {
    if (ATTRIBUTES[kind].includes(key)) {
      problems.push(...string(attributes, key, where, false))
    }
  }

  if (
    (kind === 'input' || kind === 'textarea') &&
    typeof attributes.label === 'string' &&
    /password/i.test(attributes.label)
  ) {
    problems.push(
      `${where}\`label\` contains the forbidden word "password". GitHub rejects it to keep credentials out of issues.`,
    )
  }

  if (kind === 'dropdown') {
    problems.push(
      ...boolean(attributes, 'multiple', where),
      ...dropdownOptions(attributes, where),
    )
  }

  if (kind === 'checkboxes') {
    problems.push(...checkboxOptions(attributes, where))
  }

  const { validations } = element

  if (validations !== undefined) {
    if (isRecord(validations)) {
      problems.push(
        ...unknownKeys(validations, VALIDATIONS[kind], `${where}validations: `),
        ...boolean(validations, 'required', `${where}validations: `),
      )

      const minLength = validations.min_length

      if (
        minLength !== undefined &&
        (typeof minLength !== 'number' ||
          !Number.isInteger(minLength) ||
          minLength < 0)
      ) {
        problems.push(
          `${where}validations: \`min_length\` must be a non-negative integer.`,
        )
      }

      if (VALIDATIONS[kind].includes('accept')) {
        problems.push(
          ...string(validations, 'accept', `${where}validations: `, false),
        )
      }
    } else {
      problems.push(`${where}\`validations\` must be an object.`)
    }
  }

  return {
    problems,
    element: {
      index,
      type: kind,
      id: typeof element.id === 'string' ? element.id : undefined,
      label:
        typeof attributes.label === 'string' ? attributes.label : undefined,
      options:
        kind === 'checkboxes' && Array.isArray(attributes.options)
          ? attributes.options
              .filter(isRecord)
              .map((option) => option.label)
              .filter((label): label is string => typeof label === 'string')
          : [],
    },
  }
}

const crossElement = (elements: readonly Element[]): Problems => {
  const problems: Problems = []
  const ids = new Map<string, number>()

  for (const element of elements) {
    if (element.id === undefined) {
      continue
    }

    const first = ids.get(element.id)

    if (first === undefined) {
      ids.set(element.id, element.index)
    } else {
      problems.push(
        `body[${element.index}]: \`id\` ${element.id} is already used by body[${first}]. Ids must be unique.`,
      )
    }
  }

  const fields = elements.filter((element) => element.type !== 'markdown')

  for (const [position, element] of fields.entries()) {
    const clash = fields
      .slice(0, position)
      .find(
        (other) =>
          other.label !== undefined &&
          other.label === element.label &&
          other.id === undefined &&
          element.id === undefined,
      )

    if (clash) {
      problems.push(
        `body[${element.index}]: \`label\` ${element.label} is already used by body[${clash.index}]. Change one, or give one of them an \`id\`.`,
      )
    }
  }

  for (const element of fields.filter(({ type }) => type === 'checkboxes')) {
    for (const label of new Set(element.options)) {
      const clash = fields.find(
        (other) =>
          other !== element &&
          other.label === label &&
          other.id === undefined &&
          element.id === undefined,
      )

      if (clash) {
        problems.push(
          `body[${element.index}]: checkbox option ${label} clashes with the \`label\` of body[${clash.index}]. Change one, or give one of the elements an \`id\`.`,
        )
      }
    }
  }

  return problems
}

/**
 * Options a component takes, as opposed to keys it writes.
 */
export const validateOptions = (
  options: object,
  permitted: readonly string[],
): Problems =>
  Object.keys(options)
    .filter((key) => !permitted.includes(key))
    .map((key) => `\`${key}\` is not an option. Use ${keys(permitted)}.`)

/**
 * An issue form, with GitHub's wire keys.
 */
export const validateIssueForm = (obj: Record<string, unknown>): Problems => {
  const problems: Problems = [
    ...unknownKeys(obj, ISSUE_FORM_KEYS, ''),
    ...name(obj),
    ...string(obj, 'description', '', true),
    ...string(obj, 'title', '', false),
    ...string(obj, 'type', '', false),
    ...stringOrList(obj, 'labels', ''),
    ...stringOrList(obj, 'assignees', ''),
    ...stringOrList(obj, 'projects', ''),
  ]

  const { body } = obj

  if (!Array.isArray(body) || body.length === 0) {
    return [...problems, '`body` cannot be empty.']
  }

  const results = body.map(validateElement)
  const elements = results.flatMap(({ element }) => (element ? [element] : []))

  problems.push(...results.flatMap((result) => result.problems))

  if (results.every(({ element }) => element?.type === 'markdown')) {
    problems.push(
      '`body` must contain at least one non-markdown field, or the form accepts no input.',
    )
  }

  return [...problems, ...crossElement(elements)]
}

const ISSUE_TEMPLATE_KEYS = [
  'name',
  'about',
  'title',
  'labels',
  'assignees',
  'type',
] as const

/**
 * The front matter of a Markdown issue template.
 */
export const validateIssueTemplate = (
  frontMatter: Record<string, unknown>,
): Problems => [
  ...unknownKeys(frontMatter, ISSUE_TEMPLATE_KEYS, ''),
  ...name(frontMatter),
  ...string(frontMatter, 'about', '', true),
  ...string(frontMatter, 'title', '', false),
  ...string(frontMatter, 'type', '', false),
  ...stringOrList(frontMatter, 'labels', ''),
  ...stringOrList(frontMatter, 'assignees', ''),
]

/**
 * The template chooser, with GitHub's wire keys.
 */
export const validateChooser = (obj: Record<string, unknown>): Problems => {
  const problems: Problems = [
    ...unknownKeys(obj, ['blank_issues_enabled', 'contact_links'], ''),
    ...boolean(obj, 'blank_issues_enabled', ''),
  ]

  const links = obj.contact_links

  if (links === undefined) {
    return problems
  }

  if (!Array.isArray(links)) {
    return [...problems, '`contact_links` must be a list.']
  }

  return [
    ...problems,
    ...links.flatMap((link, index) => {
      const where = `contact_links[${index}]: `

      if (!isRecord(link)) {
        return [
          `${where}must be an object with a \`name\`, \`url\` and \`about\`.`,
        ]
      }

      return [
        ...unknownKeys(link, ['name', 'url', 'about'], where),
        ...string(link, 'name', where, true),
        ...string(link, 'about', where, true),
        ...(typeof link.url === 'string' && /^https?:\/\//.test(link.url)
          ? []
          : [`${where}\`url\` must start with http:// or https://.`]),
      ]
    }),
  ]
}

/**
 * The body of a Markdown template.
 */
export const validateBody = (body: string): Problems =>
  isBlank(body) ? ['the body is empty. Write the template, or remove it.'] : []
