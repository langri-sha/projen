import { Component, type Project } from 'projen'

export interface DaggerOptions {
  /**
   * Engine version the project's modules require, e.g. `v1.0.0-beta.15`.
   *
   * Renovate moves the pin here, in the projenrc, so this is the one place
   * the repository names an engine.
   */
  readonly engineVersion?: string
}

/**
 * A component for Dagger workspaces.
 *
 * `@langri-sha/projen-project` reaches it through its `dagger` option, which
 * also points Renovate at the engine version.
 */
export class Dagger extends Component {
  constructor(project: Project, _options: DaggerOptions = {}) {
    super(project)
  }
}
