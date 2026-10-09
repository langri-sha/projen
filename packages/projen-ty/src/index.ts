import { Component, type Project, TomlFile } from 'projen'

import { type Ty as TySchema } from './ty.js'

export * from './ty.js'

/**
 * `ty.toml` options, as published in SchemaStore's "ty" schema.
 */
export interface TyOptions extends TySchema {}

/**
 * A component for configuring ty, written to a `ty.toml`.
 */
export class Ty extends Component {
  /**
   * The `ty.toml` file.
   */
  readonly file: TomlFile

  constructor(project: Project, options: TyOptions = {}) {
    super(project)

    this.file = new TomlFile(project, 'ty.toml', {
      obj: options,
    })
  }
}
