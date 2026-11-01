import { Component, type Project, TomlFile } from 'projen'

import { type RuffSchema } from './ruff.js'

export * from './ruff.js'

/**
 * `ruff.toml` options, as published in SchemaStore's "Ruff" schema.
 */
export interface RuffOptions extends RuffSchema {}

/**
 * A component for configuring Ruff, written to a `ruff.toml`.
 */
export class Ruff extends Component {
  /**
   * The `ruff.toml` file.
   */
  readonly file: TomlFile

  constructor(project: Project, options: RuffOptions = {}) {
    super(project)

    this.file = new TomlFile(project, 'ruff.toml', {
      obj: options,
    })
  }
}
