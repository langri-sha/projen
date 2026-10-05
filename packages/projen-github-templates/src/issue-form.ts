import type { Project } from 'projen'

import type { IssueFormElement } from './lib/form-schema.js'
import { templateKind } from './lib/paths.js'
import { validateIssueForm } from './lib/validate.js'
import { GitHubYamlFile } from './lib/yaml-file.js'

/**
 * A GitHub issue form.
 *
 * @see https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
 */
export interface IssueFormOptions {
  /**
   * Shown in the template chooser. Must be more than 3 characters, or GitHub
   * silently leaves the template out, and unique across every issue template.
   */
  readonly name: string

  /**
   * Shown under the name in the template chooser.
   */
  readonly description: string

  /**
   * The form's elements. At least one must accept input.
   */
  readonly body: readonly IssueFormElement[]

  /**
   * Pre-fills the issue title.
   */
  readonly title?: string

  /**
   * Added to new issues. GitHub silently drops a label the repository lacks.
   */
  readonly labels?: readonly string[] | string

  /**
   * Assigned to new issues.
   */
  readonly assignees?: readonly string[] | string

  /**
   * An issue type defined at the organization level.
   */
  readonly type?: string

  /**
   * Projects to add new issues to, as `PROJECT-OWNER/PROJECT-NUMBER`. Only
   * works for people opening issues who can write to the project.
   */
  readonly projects?: readonly string[] | string
}

/**
 * A GitHub issue form, at a `.github/ISSUE_TEMPLATE/<name>.yml` path.
 */
export class IssueForm extends GitHubYamlFile {
  constructor(project: Project, filePath: string, options: IssueFormOptions) {
    if (templateKind(filePath) !== 'issue-form') {
      throw new Error(
        `${filePath}: not an issue form location. Issue forms live at \`.github/ISSUE_TEMPLATE/<name>.yml\`.`,
      )
    }

    const {
      name,
      description,
      title,
      labels,
      assignees,
      type,
      projects,
      body,
      ...rest
    } = structuredClone(options)

    const obj = {
      name,
      description,
      title,
      labels,
      assignees,
      type,
      projects,
      body,
      ...rest,
    }

    super(project, filePath, { obj })

    this.assertValid(JSON.parse(JSON.stringify(obj)))
  }

  protected validate(obj: Record<string, unknown>) {
    return validateIssueForm(obj)
  }
}
