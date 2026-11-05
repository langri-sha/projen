import * as fs from 'node:fs'

import { Project, javascript } from 'projen'

import { normalizeRepository } from './repository.js'

/**
 * Options for configuring Node.js packages.
 */
export interface NodePackageOptions extends javascript.NodePackageOptions {
  /**
   * Package version. Takes precedence over the version in the existing manifest.
   */
  readonly version?: string

  /**
   * Add the package manager to `devEngines`, as Projen does from 0.99.30.
   * Earlier versions have no such option and ignore it.
   *
   * @default false
   */
  readonly addPackageManagerToDevEngines?: boolean
  readonly peerDependenciesMeta?: Record<string, { optional?: boolean }>
  readonly type?: 'commonjs' | 'module'
}

/**
 * Custom Node.js package manager that preserves package.
 */
export class NodePackage extends javascript.NodePackage {
  constructor(project: Project, options?: NodePackageOptions) {
    super(
      project,
      options && {
        ...options,
        repository: normalizeRepository(options.repository),
      },
    )

    this.addVersion(
      options?.version ?? this.#getPackageJson()?.version ?? '0.0.0',
    )

    if (options?.type) {
      this.addField('type', options.type)
    }

    if (options?.peerDependenciesMeta) {
      this.addField('peerDependenciesMeta', options.peerDependenciesMeta)
    }

    // Reset, so we can run `pnpx projen` on CI after Renovate upgrades.
    this.project.tasks
      .tryFind('install:ci')
      ?.reset(this.project.tasks.tryFind('install')?.steps[0]?.exec)
  }

  #getPackageJson() {
    try {
      return JSON.parse(fs.readFileSync(this.file.absolutePath, 'utf-8'))
    } catch (_) {
      return undefined
    }
  }

  override postSynthesize(): void {
    if (this.project.parent) {
      return
    }

    super.postSynthesize()
  }
}
