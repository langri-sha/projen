import { Component, type FileBase, type Project, type SampleFile } from 'projen'

import {
  type MarkdownTemplateOptions,
  comment,
  isText,
  markdownTemplate,
  text,
} from './lib/markdown-file.js'
import { templateKind } from './lib/paths.js'
import { validateIssueTemplate } from './lib/validate.js'
import { stringify } from './lib/yaml-file.js'

/**
 * A Markdown issue template.
 *
 * @see https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository#creating-issue-templates
 */
export interface IssueTemplateOptions extends MarkdownTemplateOptions {
  /**
   * Shown in the template chooser. Must be more than 3 characters, or GitHub
   * silently leaves the template out, and unique across every issue template.
   */
  readonly name: string

  /**
   * Shown under the name in the template chooser.
   */
  readonly about: string

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
   * The issue body to start from, in Markdown, as a string or lines.
   */
  readonly body: string | readonly string[]
}

/**
 * A Markdown issue template, at a `.github/ISSUE_TEMPLATE/<name>.md` path.
 */
export class IssueTemplate extends Component {
  /**
   * The template's name in the chooser.
   */
  readonly name: string

  readonly path: string

  /**
   * The generated file, or the seed when `managed` is `false`.
   */
  readonly file: FileBase | SampleFile

  constructor(
    project: Project,
    filePath: string,
    options: IssueTemplateOptions,
  ) {
    super(project)

    if (templateKind(filePath) !== 'issue-template') {
      throw new Error(
        `${filePath}: not a Markdown issue template location. They live at \`.github/ISSUE_TEMPLATE/<name>.md\`.`,
      )
    }

    const { body, managed, marker, ...frontMatter } = options

    const problems = [
      ...validateIssueTemplate(JSON.parse(JSON.stringify(frontMatter))),
      ...(isText(body) ? [] : ['`body` must be a string, or a list of lines.']),
    ]

    if (problems.length > 0) {
      throw new Error(
        problems.map((problem) => `${filePath}: ${problem}`).join('\n'),
      )
    }

    const { name, about, title, labels, assignees, type } = frontMatter

    const header = stringify({ name, about, title, labels, assignees, type })

    this.name = name
    this.path = filePath
    this.file = markdownTemplate(
      project,
      filePath,
      (mark) => `---\n${header}---\n\n${comment(mark)}${text(body)}`,
      { managed, marker },
    )
  }
}
