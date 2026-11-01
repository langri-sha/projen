import path from 'node:path'

import { Component, type Project, TextFile } from 'projen'

/**
 * Husky options.
 */
export interface HuskyOptions {
  /**
   * @jsii ignore
   */
  'pre-commit'?: string | string[]
  /**
   * @jsii ignore
   */
  'applypatch-msg'?: string | string[]
  /**
   * @jsii ignore
   */
  'pre-applypatch'?: string | string[]
  /**
   * @jsii ignore
   */
  'post-applypatch'?: string | string[]
  /**
   * @jsii ignore
   */
  'pre-merge-commit'?: string | string[]
  /**
   * @jsii ignore
   */
  'prepare-commit-msg'?: string | string[]
  /**
   * @jsii ignore
   */
  'commit-msg'?: string | string[]
  /**
   * @jsii ignore
   */
  'post-commit'?: string | string[]
  /**
   * @jsii ignore
   */
  'pre-rebase'?: string | string[]
  /**
   * @jsii ignore
   */
  'post-checkout'?: string | string[]
  /**
   * @jsii ignore
   */
  'post-merge'?: string | string[]
  /**
   * @jsii ignore
   */
  'pre-push'?: string | string[]
}

/**
 * A component for maintaining Git hooks with Husky.
 */
export class Husky extends Component {
  constructor(project: Project, options?: HuskyOptions) {
    super(project)

    for (const [hook, commands] of Object.entries({ ...options }).map(
      ([hook, commands]) =>
        [hook, Array.isArray(commands) ? commands : [commands]] as const,
    )) {
      const file = new TextFile(project, path.join('.husky', hook), {
        editGitignore: false,
        marker: true,
        readonly: true,
      })

      if (!project.ejected) {
        file.addLine(`# ${file.marker}`)
      }

      for (const command of commands) {
        file.addLine(command)
      }

      file.addLine('')
    }
  }
}
