import path from 'node:path'

import { Component, type Project, TextFile } from 'projen'

/**
 * Husky options.
 */
export interface HuskyOptions {
  'pre-commit'?: string | string[]
  'applypatch-msg'?: string | string[]
  'pre-applypatch'?: string | string[]
  'post-applypatch'?: string | string[]
  'pre-merge-commit'?: string | string[]
  'prepare-commit-msg'?: string | string[]
  'commit-msg'?: string | string[]
  'post-commit'?: string | string[]
  'pre-rebase'?: string | string[]
  'post-checkout'?: string | string[]
  'post-merge'?: string | string[]
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
