import { readFileSync, readdirSync } from 'node:fs'
import * as path from 'node:path'

import YAML from 'yaml'

import type { GitHubTemplateOptions } from './github-templates.js'
import type { IssueFormOptions } from './issue-form.js'
import type { IssueTemplateChooserOptions } from './issue-template-chooser.js'
import type { IssueTemplateOptions } from './issue-template.js'
import { type TemplateKind, templateKind } from './lib/paths.js'
import type { PullRequestTemplateOptions } from './pull-request-template.js'

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/

const files = (directory: string, prefix = ''): string[] =>
  readdirSync(path.join(directory, prefix), { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap((entry) => {
      const relative = path.posix.join(prefix, entry.name)

      return entry.isDirectory() ? files(directory, relative) : [relative]
    })

const parse = (source: string, filePath: string): Record<string, unknown> => {
  let value: unknown

  try {
    value = YAML.parse(source, { version: '1.1' })
  } catch (error) {
    throw new Error(`${filePath}: ${(error as Error).message}`, {
      cause: error,
    })
  }

  if (value === null || value === undefined) {
    return {}
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${filePath}: expected a YAML mapping.`)
  }

  return value as Record<string, unknown>
}

const chooser = (
  source: string,
  filePath: string,
): IssueTemplateChooserOptions => {
  const { blank_issues_enabled, contact_links, ...rest } = parse(
    source,
    filePath,
  )

  return {
    ...(blank_issues_enabled !== undefined && {
      blankIssuesEnabled: blank_issues_enabled,
    }),
    ...(contact_links !== undefined && { contactLinks: contact_links }),
    ...rest,
  } as IssueTemplateChooserOptions
}

const issueTemplate = (
  source: string,
  filePath: string,
): IssueTemplateOptions => {
  const match = FRONT_MATTER.exec(source)

  if (!match) {
    throw new Error(`${filePath}: missing YAML front matter.`)
  }

  return {
    ...parse(match[1]!, filePath),
    body: match[2]!.replace(/^(?:\r?\n)+/, ''),
  } as unknown as IssueTemplateOptions
}

const parsers: Record<
  TemplateKind,
  (source: string, filePath: string) => GitHubTemplateOptions
> = {
  chooser,
  'issue-form': (source, filePath) =>
    parse(source, filePath) as unknown as IssueFormOptions,
  'issue-template': issueTemplate,
  'pull-request-template': (source): PullRequestTemplateOptions => ({
    body: source,
  }),
}

/**
 * Reads templates from a directory laid out like a repository's `.github/`
 * contents, without the `.github/` prefix: `ISSUE_TEMPLATE/<name>.yml`,
 * `ISSUE_TEMPLATE/<name>.md`, `ISSUE_TEMPLATE/config.yml`,
 * `pull_request_template.md` and `PULL_REQUEST_TEMPLATE/<name>.md`.
 *
 * Returns the templates keyed by repository path, for `GitHubTemplates`'s
 * `files`. Values are not validated here; the template constructors do that.
 */
export const loadTemplates = (
  directory: string,
): Record<string, GitHubTemplateOptions> =>
  Object.fromEntries(
    files(directory).map((relative) => {
      const filePath = `.github/${relative}`
      const source = readFileSync(path.join(directory, relative), 'utf8')

      return [filePath, parsers[templateKind(filePath)](source, filePath)]
    }),
  )
