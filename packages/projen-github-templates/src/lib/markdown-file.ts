import { FileBase, type Project, SampleFile } from 'projen'

/**
 * Renders a template's text, given the marker to embed, if any.
 */
export type Render = (marker: string | undefined) => string

/**
 * Options shared by the Markdown templates.
 */
export interface MarkdownTemplateOptions {
  /**
   * Generate the file on every synth. When `false`, seed it once
   * (`projen.SampleFile`) and leave it to whoever edits it afterwards.
   *
   * @remarks Turning this off for a file projen already generates would let
   * projen's cleanup delete it, edits and all. `GitHubTemplates` refuses that
   * transition; see the readme for how to make it.
   * @default true
   */
  readonly managed?: boolean

  /**
   * Begin the body with an HTML comment saying projen generated the file.
   * GitHub copies the template into every new issue or pull request, so the
   * comment shows up in their source.
   *
   * @default false
   */
  readonly marker?: boolean
}

class MarkdownFile extends FileBase {
  readonly #render: Render

  constructor(
    project: Project,
    filePath: string,
    render: Render,
    marker: boolean,
  ) {
    super(project, filePath, { readonly: true, marker })

    this.#render = render
  }

  protected synthesizeContent() {
    return this.#render(this.marker)
  }
}

/**
 * Write a Markdown template, generated or seeded.
 */
export const markdownTemplate = (
  project: Project,
  filePath: string,
  render: Render,
  { managed = true, marker = false }: MarkdownTemplateOptions,
): FileBase | SampleFile => {
  if (managed) {
    return new MarkdownFile(project, filePath, render, marker)
  }

  if (marker) {
    throw new Error(
      `${filePath}: \`marker\` needs \`managed\`. A seeded file belongs to whoever edits it after the first write, so projen does not mark it.`,
    )
  }

  return new SampleFile(project, filePath, { contents: render(undefined) })
}

/**
 * Whether a body is a string, or a list of lines.
 */
export const isText = (body: unknown): body is string | readonly string[] =>
  typeof body === 'string' ||
  (Array.isArray(body) && body.every((line) => typeof line === 'string'))

/**
 * Join a body given as lines, and end it with a newline.
 */
export const text = (body: string | readonly string[]): string => {
  const joined = typeof body === 'string' ? body : body.join('\n')

  return joined === '' || joined.endsWith('\n') ? joined : `${joined}\n`
}

/**
 * The marker as an HTML comment, followed by a blank line.
 */
export const comment = (marker: string | undefined): string =>
  marker ? `<!-- ${marker} -->\n\n` : ''
