import type { InputOptions } from '@babel/core'
import { FileBase, IResolver, Project } from 'projen'
import serialize from 'serialize-javascript'

/**
 * Options for configuring Babel.
 */
export interface BabelOptions {
  /**
   * Name of the Babel config module.
   *
   * @default 'babel.config.js'
   */
  readonly filename?: string

  /**
   * Whether to output a config function, and the code to be executed.
   */
  readonly configApiFunction?: string

  /**
   * Options for transforming Babel.
   */
  readonly options?: InputOptions
}

export class Babel extends FileBase {
  #configApiFunction: string | undefined
  options: InputOptions

  constructor(project: Project, options: BabelOptions = {}) {
    const filename = options.filename ?? 'babel.config.js'

    super(project, filename, {
      readonly: true,
      marker: true,
    })

    this.#configApiFunction = options.configApiFunction
    this.options = options.options ?? {}
  }

  protected override synthesizeContent(_: IResolver): string | undefined {
    let lines

    if (this.#configApiFunction !== undefined) {
      lines = [
        `/** @type {(api: import('@babel/core').ConfigAPI) => import('@babel/core').InputOptions} */`,
        `const config = (api) => {`,
        this.#configApiFunction ? `${this.#configApiFunction}\n` : '',
        `return ${serialize(this.options, { space: 2, unsafe: true })}`,
        `}\n`,
        `export default config\n`,
      ].filter(Boolean)
    } else {
      lines = [
        `/** @type {import('@babel/core').InputOptions} */`,
        `const config = ${serialize(this.options, { space: 2, unsafe: true })}\n`,
        `export default config\n`,
      ]
    }

    return lines.join('\n')
  }
}
