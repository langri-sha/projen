import { existsSync, readFileSync, readdirSync } from 'node:fs'
import * as path from 'node:path'

import { Component, type Project, SampleFile } from 'projen'

import { IssueForm, type IssueFormOptions } from './issue-form.js'
import {
  IssueTemplateChooser,
  type IssueTemplateChooserOptions,
} from './issue-template-chooser.js'
import { IssueTemplate, type IssueTemplateOptions } from './issue-template.js'
import { findCollisions, templateKind } from './lib/paths.js'
import { validateOptions } from './lib/validate.js'
import {
  PullRequestTemplate,
  type PullRequestTemplateOptions,
} from './pull-request-template.js'

/**
 * Any template, told apart by the path it is declared at.
 */
export type GitHubTemplateOptions =
  | IssueFormOptions
  | IssueTemplateOptions
  | IssueTemplateChooserOptions
  | PullRequestTemplateOptions

/**
 * A template component, told apart by its class.
 */
export type GitHubTemplate =
  IssueForm | IssueTemplate | IssueTemplateChooser | PullRequestTemplate

export interface GitHubTemplatesOptions {
  /**
   * Templates keyed by repository-relative path. The path selects the kind:
   *
   * - `.github/ISSUE_TEMPLATE/config.yml`: the template chooser
   * - `.github/ISSUE_TEMPLATE/<name>.yml`: an issue form
   * - `.github/ISSUE_TEMPLATE/<name>.md`: a Markdown issue template
   * - `{.github/,docs/,}pull_request_template.md`: the default pull request
   *   template
   * - `{.github/,docs/,}PULL_REQUEST_TEMPLATE/<name>.md`: a named pull request
   *   template
   *
   * Any other path is an error, and the value is checked strictly against the
   * kind its path selects.
   */
  readonly files?: { readonly [path: string]: GitHubTemplateOptions }

  /**
   * Repository-relative paths of templates written by hand. Never written, and
   * declaring a template at one is an error.
   */
  readonly unmanaged?: readonly string[]
}

const MANIFEST = '.projen/files.json'

const LEGACY = /^issue_template\.md$/i

/**
 * GitHub issue and pull request templates. Owns `.github/ISSUE_TEMPLATE/`,
 * `pull_request_template.md` and `PULL_REQUEST_TEMPLATE/`, and nothing else.
 */
export class GitHubTemplates extends Component {
  /**
   * The templates, keyed by path.
   */
  readonly files: Readonly<Record<string, GitHubTemplate>>

  readonly unmanaged: readonly string[]

  constructor(project: Project, options: GitHubTemplatesOptions = {}) {
    super(project)

    const { files = {}, unmanaged = [] } = options

    const problems = validateOptions(options, ['files', 'unmanaged'])

    for (const filePath of [...Object.keys(files), ...unmanaged]) {
      try {
        templateKind(filePath)
      } catch (error) {
        problems.push((error as Error).message)
      }
    }

    const declared = Object.keys(files)

    for (const filePath of unmanaged) {
      const twin = declared.find(
        (other) => other.toLowerCase() === filePath.toLowerCase(),
      )

      if (twin) {
        problems.push(
          `${twin}: declared in \`files\` while \`unmanaged\` lists \`${filePath}\`. Remove it from one.`,
        )
      }
    }

    if (problems.length === 0) {
      problems.push(...findCollisions([...declared, ...unmanaged]))
    }

    if (problems.length > 0) {
      throw new Error(problems.join('\n'))
    }

    this.unmanaged = [...unmanaged]
    this.files = Object.fromEntries(
      Object.entries(files).map(([filePath, value]) => [
        filePath,
        this.#create(filePath, value),
      ]),
    )
  }

  /**
   * Checks across templates, and against the rest of the project, once every
   * component exists. Runs before projen's cleanup, which deletes any file the
   * previous synth wrote and this one does not.
   */
  override preSynthesize() {
    const problems = [
      ...this.#duplicateNames(),
      ...this.#foreignFiles(),
      ...this.#handovers(),
    ]

    if (problems.length > 0) {
      throw new Error(problems.join('\n'))
    }

    for (const legacy of this.#legacyTemplates()) {
      this.project.logger.warn(
        `${legacy}: GitHub retired the single ISSUE_TEMPLATE.md on 2025-03-30 and ignores it. Move it to \`.github/ISSUE_TEMPLATE/<name>.md\`, or delete it.`,
      )
    }
  }

  #create(filePath: string, value: GitHubTemplateOptions): GitHubTemplate {
    switch (templateKind(filePath)) {
      case 'chooser':
        return new IssueTemplateChooser(
          this.project,
          value as IssueTemplateChooserOptions,
        )
      case 'issue-form':
        return new IssueForm(this.project, filePath, value as IssueFormOptions)
      case 'issue-template':
        return new IssueTemplate(
          this.project,
          filePath,
          value as IssueTemplateOptions,
        )
      case 'pull-request-template':
        return new PullRequestTemplate(
          this.project,
          filePath,
          value as PullRequestTemplateOptions,
        )
    }
  }

  /**
   * GitHub requires a name unique across issue forms and Markdown templates.
   * Read from the form as written, so an override cannot slip a duplicate in.
   */
  #duplicateNames(): string[] {
    const names = new Map<string, string>()
    const problems: string[] = []

    for (const [filePath, template] of Object.entries(this.files)) {
      const name =
        template instanceof IssueForm
          ? template.resolve()?.name
          : template instanceof IssueTemplate
            ? template.name
            : undefined

      if (typeof name !== 'string') {
        continue
      }

      const first = names.get(name)

      if (first === undefined) {
        names.set(name, filePath)
      } else {
        problems.push(
          `${filePath}: \`name\` ${name} is already used by \`${first}\`. GitHub requires names unique across issue templates.`,
        )
      }
    }

    return problems
  }

  /**
   * Seeded and hand-written templates are not files to projen, so its own
   * check for two components writing one path does not see them.
   */
  #foreignFiles(): string[] {
    const find = (filePath: string) =>
      this.project.root.tryFindFile(path.resolve(this.project.outdir, filePath))

    return [
      ...this.unmanaged.flatMap((filePath) => {
        const file = find(filePath)

        return file
          ? [
              `${filePath}: listed in \`unmanaged\`, but ${file.constructor.name} generates it. Stop generating it, or drop it from \`unmanaged\`.`,
            ]
          : []
      }),
      ...this.#seeded().flatMap((filePath) => {
        const file = find(filePath)

        return file
          ? [
              `${filePath}: seeded with \`managed: false\`, but ${file.constructor.name} also generates it. Keep one.`,
            ]
          : []
      }),
    ]
  }

  /**
   * A file the last synth generated, and this one leaves to someone else, is
   * missing from the new manifest, so projen's cleanup deletes it before
   * anything else runs, along with any edits.
   */
  #handovers(): string[] {
    const generated = this.#manifest()

    const handover = (filePath: string, now: string) =>
      generated.includes(filePath) &&
      existsSync(path.join(this.project.outdir, filePath))
        ? [
            `${filePath}: projen generated this file, and it is now ${now}. projen's cleanup would delete it, edits and all. Move it aside, run projen, then move it back.`,
          ]
        : []

    return [
      ...this.unmanaged.flatMap((filePath) =>
        handover(filePath, 'listed in `unmanaged`'),
      ),
      ...this.#seeded().flatMap((filePath) =>
        handover(filePath, 'seeded with `managed: false`'),
      ),
    ]
  }

  #seeded(): string[] {
    return Object.entries(this.files)
      .filter(
        ([, template]) =>
          (template instanceof IssueTemplate ||
            template instanceof PullRequestTemplate) &&
          template.file instanceof SampleFile,
      )
      .map(([filePath]) => filePath)
  }

  #manifest(): string[] {
    try {
      const { files } = JSON.parse(
        readFileSync(path.join(this.project.outdir, MANIFEST), 'utf8'),
      )

      return Array.isArray(files) ? files : []
    } catch {
      return []
    }
  }

  #legacyTemplates(): string[] {
    return ['', 'docs', '.github'].flatMap((directory) => {
      try {
        return readdirSync(path.join(this.project.outdir, directory))
          .filter((entry) => LEGACY.test(entry))
          .map((entry) => path.posix.join(directory, entry))
      } catch {
        return []
      }
    })
  }
}
