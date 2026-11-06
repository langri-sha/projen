import { Component, JsonFile, type Project } from 'projen'

import type { RenovateSchema } from './renovate.js'

export * from './renovate.js'

/**
 * Renovate configuration options.
 */
export interface RenovateOptions extends RenovateSchema {}

/**
 * A component for managing Renovate configurations.
 */
export class Renovate extends Component {
  constructor(project: Project, options?: RenovateOptions) {
    super(project)

    new JsonFile(project, 'renovate.json5', {
      obj: {
        $schema: 'https://docs.renovatebot.com/renovate-schema.json',
        ...options,
      },
    })
  }
}
