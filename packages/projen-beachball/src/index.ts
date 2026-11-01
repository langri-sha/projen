import { type BeachballConfig } from 'beachball'
import { Project, TextFile } from 'projen'

/**
 * Options for configuring Beachball.
 */
export interface BeachballOptions {
  readonly filename?: string

  /**
   * @jsii ignore
   */
  readonly config?: BeachballConfig
}

export class Beachball extends TextFile {
  constructor(project: Project, options: BeachballOptions = {}) {
    super(project, options.filename ?? 'beachball.config.cjs', {
      readonly: true,
      marker: true,
    })

    for (const line of [
      `/** @type {import('beachball').BeachballConfig} */`,
      `module.exports = ${JSON.stringify(options.config ?? {}, null, 2)}`,
    ]) {
      this.addLine(line)
    }

    project.addTask('change', {
      description: 'Generate Beachball change files',
      exec: 'beachball change',
    })
  }
}
