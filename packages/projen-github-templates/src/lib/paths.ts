/**
 * What a path holds, as GitHub tells it apart.
 */
export type TemplateKind =
  'chooser' | 'issue-form' | 'issue-template' | 'pull-request-template'

const NAME = '[^/.][^/]*'

/**
 * The supported locations, most specific first: `config.yml` is the chooser,
 * never an issue form.
 */
const PATTERNS: readonly (readonly [RegExp, TemplateKind, string])[] = [
  [
    /^\.github\/ISSUE_TEMPLATE\/config\.yml$/,
    'chooser',
    '.github/ISSUE_TEMPLATE/config.yml',
  ],
  [
    new RegExp(`^\\.github/ISSUE_TEMPLATE/${NAME}\\.yml$`),
    'issue-form',
    '.github/ISSUE_TEMPLATE/<name>.yml',
  ],
  [
    new RegExp(`^\\.github/ISSUE_TEMPLATE/${NAME}\\.md$`),
    'issue-template',
    '.github/ISSUE_TEMPLATE/<name>.md',
  ],
  [
    /^(?:\.github\/|docs\/)?pull_request_template\.md$/,
    'pull-request-template',
    '{.github/,docs/,}pull_request_template.md',
  ],
  [
    new RegExp(`^(?:\\.github/|docs/)?PULL_REQUEST_TEMPLATE/${NAME}\\.md$`),
    'pull-request-template',
    '{.github/,docs/,}PULL_REQUEST_TEMPLATE/<name>.md',
  ],
]

const SUPPORTED = PATTERNS.map(([, , description]) => description).join(', ')

const PREFIX = '(?:\\.github/|docs/)?'

const diagnose = (path: string): string => {
  if (path.includes('\\')) {
    return 'use forward slashes.'
  }

  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    return 'paths are relative to the repository root, not absolute.'
  }

  if (path.startsWith('./')) {
    return 'paths are relative to the repository root; drop the leading `./`.'
  }

  if (path.split('/').some((segment) => ['', '.', '..'].includes(segment))) {
    return 'empty, `.` and `..` segments are not allowed. Write the path as it appears in the repository.'
  }

  if (new RegExp(`^${PREFIX}ISSUE_TEMPLATE\\.(md|txt)$`, 'i').test(path)) {
    return 'GitHub retired the single ISSUE_TEMPLATE.md on 2025-03-30. Use `.github/ISSUE_TEMPLATE/<name>.md` instead.'
  }

  if (/^(?:docs\/)?ISSUE_TEMPLATE\//i.test(path)) {
    return 'issue templates outside `.github/ISSUE_TEMPLATE/` are reachable by URL but never offered in the template chooser, and this package does not write them. Move it under `.github/ISSUE_TEMPLATE/`.'
  }

  if (/^\.github\/ISSUE_TEMPLATE\//i.test(path)) {
    const rest = path.slice('.github/ISSUE_TEMPLATE/'.length)

    if (rest.includes('/')) {
      return 'GitHub reads only the top level of `.github/ISSUE_TEMPLATE/`. Move it up a directory.'
    }

    if (/\.yaml$/i.test(rest)) {
      return 'issue forms must use the `.yml` extension, not `.yaml`.'
    }

    if (rest.startsWith('.')) {
      return 'template filenames must not start with a dot.'
    }

    if (!/\.(yml|md)$/i.test(rest)) {
      return 'issue templates are `.yml` forms or `.md` templates. Use one of those extensions.'
    }
  }

  if (
    new RegExp(
      `^${PREFIX}(pull_request_template\\.[^/]+|PULL_REQUEST_TEMPLATE/.+)$`,
      'i',
    ).test(path)
  ) {
    if (/\.txt$/i.test(path)) {
      return 'GitHub reads `.txt` pull request templates, but this package writes Markdown only. Use the `.md` extension.'
    }

    if (/PULL_REQUEST_TEMPLATE\/[^/]+\//i.test(path)) {
      return 'GitHub reads only the top level of `PULL_REQUEST_TEMPLATE/`. Move it up a directory.'
    }

    if (/\/\.[^/]*$/.test(path)) {
      return 'template filenames must not start with a dot.'
    }

    if (!/\.md$/i.test(path)) {
      return 'pull request templates must use the `.md` extension.'
    }
  }

  const match = PATTERNS.find(([pattern]) =>
    new RegExp(pattern.source, 'i').test(path),
  )

  if (match) {
    return `GitHub documents this location as \`${match[2]}\`. Match its spelling exactly.`
  }

  return `not a template location. Use one of: ${SUPPORTED}.`
}

/**
 * Select the kind of template a repository-relative path holds. Throws for any
 * path GitHub would not read as one, or this package does not write.
 */
export const templateKind = (path: string): TemplateKind => {
  const match = PATTERNS.find(([pattern]) => pattern.test(path))

  if (match && !(match[1] === 'issue-form' && /\/config\.yml$/i.test(path))) {
    return match[1]
  }

  throw new Error(`${path}: ${diagnose(path)}`)
}

const defaultPullRequestTemplate = new RegExp(
  `^${PREFIX}pull_request_template\\.md$`,
  'i',
)

const namedPullRequestTemplate = new RegExp(
  `^${PREFIX}PULL_REQUEST_TEMPLATE/([^/]+)$`,
  'i',
)

const groupBy = (
  paths: readonly string[],
  key: (path: string) => string | undefined,
) => {
  const groups = new Map<string, string[]>()

  for (const path of paths) {
    const value = key(path)

    if (value !== undefined) {
      groups.set(value, [...(groups.get(value) ?? []), path])
    }
  }

  return [...groups.values()].filter((group) => group.length > 1)
}

const list = (paths: readonly string[]) =>
  paths.map((path) => `\`${path}\``).join(' and ')

/**
 * Paths that GitHub would read as the same template, or as competing ones.
 */
export const findCollisions = (paths: readonly string[]): string[] => {
  const unique = [...new Set(paths)]

  const folded = groupBy(unique, (path) => path.toLowerCase())

  const defaults = groupBy(
    unique.filter(
      (path) =>
        !folded.flat().includes(path) && defaultPullRequestTemplate.test(path),
    ),
    () => 'default',
  )

  const named = groupBy(
    unique.filter((path) => !folded.flat().includes(path)),
    (path) => namedPullRequestTemplate.exec(path)?.[1]?.toLowerCase(),
  )

  return [
    ...folded.map(
      (group) =>
        `${list(group)} are the same file to GitHub, which ignores case in template filenames. Keep one.`,
    ),
    ...defaults.map(
      (group) =>
        `${list(group)} are both default pull request templates, and GitHub applies only one. Keep one.`,
    ),
    ...named.map(
      (group) =>
        `${list(group)} are both selected by \`?template=${namedPullRequestTemplate.exec(group[0]!)![1]}\`. Rename one.`,
    ),
  ]
}
