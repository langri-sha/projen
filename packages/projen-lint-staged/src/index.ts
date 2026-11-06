import type { Config } from 'prettier'
import type { IResolver, Project } from 'projen'
import { FileBase } from 'projen'
import serialize from 'serialize-javascript'

/**
 * Options for configuring Prettier.
 */
export interface LintStagedOptions {
  /**
   * Name of the Prettier config module.
   *
   * @default 'lint-staged.config.js'
   */
  readonly filename?: string

  /**
   * Name of the `lint-staged` configuration package to extend from.
   */
  readonly extends?: string

  /**
   * `lint-staged` configuration.
   *
   * @jsii ignore
   */
  readonly config?: Config
}

export class LintStaged extends FileBase {
  #extends?: string
  /**
   * @jsii ignore
   */
  config: Config

  constructor(project: Project, options: LintStagedOptions = {}) {
    const filename = options.filename ?? 'lint-staged.config.js'

    super(project, filename, {
      readonly: true,
      marker: true,
    })

    this.#extends = options.extends
    this.config = options.config ?? {}
  }

  protected override synthesizeContent(_: IResolver): string | undefined {
    const config: Config = {
      ...this.config,
    }

    const serialized = serialize(config, {
      unsafe: true,
    })

    return `${
      this.#extends ? `import defaults from '${this.#extends}'\n\n` : ''
    }/** @type {import('lint-staged').Configuration} */
    const config = {
      ${this.#extends ? `...defaults,` : ''}
      ${serialized.slice(1)}

    export default config
    `
  }
}
