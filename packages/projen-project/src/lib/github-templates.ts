import {
  type GitHubTemplateOptions,
  type IssueTemplateChooserOptions,
  type PullRequestTemplateOptions,
  loadTemplates,
} from 'projen-github-templates'

import type { GitHubRepository } from './github-repository.js'
import { templatesDirectory } from './templates-directory.js'

const CHOOSER = '.github/ISSUE_TEMPLATE/config.yml'
const PULL_REQUEST_TEMPLATE = '.github/pull_request_template.md'

const CHANGE_FILE_CHECKLIST =
  '- [ ] Added a change file for each package this touches'

export interface DefaultTemplatesOptions {
  readonly beachball: boolean
  readonly changesets: boolean
  readonly discussions: boolean
  readonly exclude: readonly string[]
  readonly repository: GitHubRepository | undefined
}

/**
 * The preset's templates: the files in `templates/`, with the chooser's
 * contact links derived from the repository, and a change file reminder
 * under the first section of the pull request template when the project
 * uses Beachball or Changesets.
 */
export const defaultTemplates = ({
  beachball,
  changesets,
  discussions,
  exclude,
  repository,
}: DefaultTemplatesOptions): Record<string, GitHubTemplateOptions> => {
  const templates = loadTemplates(templatesDirectory())

  const unknown = exclude.filter((path) => !(path in templates))

  if (unknown.length > 0) {
    throw new Error(
      `githubTemplates.exclude: ${unknown.map((path) => `\`${path}\``).join(', ')} not among the default templates: ${Object.keys(templates).join(', ')}.`,
    )
  }

  const chooser = templates[CHOOSER] as IssueTemplateChooserOptions | undefined

  if (chooser && repository) {
    const base = `https://github.com/${repository.owner}/${repository.repo}`

    templates[CHOOSER] = {
      ...chooser,
      contactLinks: [
        ...(chooser.contactLinks ?? []),
        ...(discussions
          ? [
              {
                name: 'Ask a question',
                url: `${base}/discussions`,
                about: 'Ask for help or start a conversation.',
              },
            ]
          : []),
        {
          name: 'Report a security vulnerability',
          url: `${base}/security/advisories/new`,
          about: 'Report it privately, not in a public issue.',
        },
      ],
    }
  }

  const pullRequest = templates[PULL_REQUEST_TEMPLATE] as
    PullRequestTemplateOptions | undefined

  if (pullRequest && (beachball || changesets)) {
    templates[PULL_REQUEST_TEMPLATE] = {
      ...pullRequest,
      body: (pullRequest.body as string).replace(
        /\n\n(?=## )/,
        `\n\n${CHANGE_FILE_CHECKLIST}\n\n`,
      ),
    }
  }

  for (const path of exclude) {
    delete templates[path]
  }

  return templates
}
