import { Component, type FileBase, type Project, type SampleFile } from 'projen'

import {
  type MarkdownTemplateOptions,
  comment,
  isText,
  markdownTemplate,
  text,
} from './lib/markdown-file.js'
import { templateKind } from './lib/paths.js'
import { validateBody, validateOptions } from './lib/validate.js'

/**
 * A pull request template.
 *
 * @see https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository
 */
export interface PullRequestTemplateOptions extends MarkdownTemplateOptions {
  /**
   * The pull request body to start from, in Markdown, as a string or lines.
   */
  readonly body: string | readonly string[]
}

/**
 * A pull request template, at `pull_request_template.md` in the repository
 * root, `docs/` or `.github/`, or named in a `PULL_REQUEST_TEMPLATE/`
 * directory beside it. GitHub applies only the default one by itself; a named
 * template is chosen with the `?template=<name>.md` query parameter.
 *
 * Not to be confused with `projen.github.PullRequestTemplate`, which writes
 * only `.github/pull_request_template.md`.
 */
export class PullRequestTemplate extends Component {
  readonly path: string

  /**
   * The generated file, or the seed when `managed` is `false`.
   */
  readonly file: FileBase | SampleFile

  constructor(
    project: Project,
    filePath: string,
    options: PullRequestTemplateOptions,
  ) {
    super(project)

    if (templateKind(filePath) !== 'pull-request-template') {
      throw new Error(
        `${filePath}: not a pull request template location. They live at \`{.github/,docs/,}pull_request_template.md\` or \`{.github/,docs/,}PULL_REQUEST_TEMPLATE/<name>.md\`.`,
      )
    }

    const { body, managed, marker } = options

    const problems = validateOptions(options, ['body', 'managed', 'marker'])

    if (isText(body)) {
      problems.push(...validateBody(text(body)))
    } else {
      problems.push('`body` must be a string, or a list of lines.')
    }

    if (problems.length > 0) {
      throw new Error(
        problems.map((problem) => `${filePath}: ${problem}`).join('\n'),
      )
    }

    this.path = filePath
    this.file = markdownTemplate(
      project,
      filePath,
      (mark) => `${comment(mark)}${text(body)}`,
      { managed, marker },
    )
  }
}
