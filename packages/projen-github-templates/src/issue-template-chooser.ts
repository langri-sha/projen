import type { Project } from 'projen'

import { validateChooser, validateOptions } from './lib/validate.js'
import { GitHubYamlFile } from './lib/yaml-file.js'

/**
 * A link offered beside the templates, to send people elsewhere.
 */
export interface IssueTemplateContactLink {
  readonly name: string

  /**
   * Must start with `http://` or `https://`.
   */
  readonly url: string

  readonly about: string
}

/**
 * The template chooser.
 *
 * @see https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository#configuring-the-template-chooser
 */
export interface IssueTemplateChooserOptions {
  /**
   * Offer a blank issue beside the templates. When `false`, people with write
   * access still see it, labelled "Maintainers only".
   *
   * @default true
   */
  readonly blankIssuesEnabled?: boolean

  readonly contactLinks?: readonly IssueTemplateContactLink[]
}

/**
 * The template chooser, at `.github/ISSUE_TEMPLATE/config.yml`. Written with
 * GitHub's `snake_case` keys, so overrides use those too.
 */
export class IssueTemplateChooser extends GitHubYamlFile {
  static readonly PATH = '.github/ISSUE_TEMPLATE/config.yml'

  constructor(project: Project, options: IssueTemplateChooserOptions = {}) {
    const problems = validateOptions(options, [
      'blankIssuesEnabled',
      'contactLinks',
    ])

    if (problems.length > 0) {
      throw new Error(
        problems
          .map((problem) => `${IssueTemplateChooser.PATH}: ${problem}`)
          .join('\n'),
      )
    }

    const obj = {
      blank_issues_enabled: options.blankIssuesEnabled,
      contact_links: structuredClone(options.contactLinks),
    }

    super(project, IssueTemplateChooser.PATH, { obj })

    this.assertValid(JSON.parse(JSON.stringify(obj)))
  }

  protected validate(obj: Record<string, unknown>) {
    return validateChooser(obj)
  }
}
