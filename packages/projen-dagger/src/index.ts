import * as path from 'node:path'

import { Component, type Project, TomlFile } from 'projen'

import type {
  DaggerModuleConfig,
  DaggerModuleDependencyConfig,
  DaggerModuleRuntime,
} from './config.js'

export type * from './config.js'

/**
 * A source ref, or the full dependency configuration.
 */
export type DaggerModuleDependency = string | DaggerModuleDependencyConfig

/**
 * Options for one module manifest.
 */
export interface DaggerModuleOptions extends Omit<
  DaggerModuleConfig,
  'dependencies' | 'engineVersion' | 'name' | 'runtime'
> {
  /**
   * Name of the module. Required for a module at the project root, whose
   * directory has no name of its own.
   *
   * @default - the module directory name
   */
  readonly name?: string

  /**
   * Runtime source, or the full runtime configuration.
   *
   * @default 'dang'
   */
  readonly runtime?: string | DaggerModuleRuntime

  /**
   * Modules this module depends on.
   */
  readonly dependencies?: readonly DaggerModuleDependency[]
}

export interface DaggerOptions {
  /**
   * Engine version recorded in every module manifest, e.g. `v1.0.0-beta.15`.
   *
   * Required to declare a module. Renovate moves the pin here rather than in
   * the manifests, so this is the one place the repository names an engine.
   */
  readonly engineVersion?: string

  /**
   * Module manifests to synthesize, keyed by the module directory.
   *
   * @default {}
   */
  readonly modules?: Record<string, DaggerModuleOptions>
}

/**
 * A component for Dagger workspaces.
 *
 * Synthesizes each module's `dagger-module.toml`, and re-includes the
 * dot-directories modules live in, such as `.dagger/`, in `.gitignore`.
 *
 * `@langri-sha/projen-project` reaches it through its `dagger` option, which
 * also points Renovate at the engine version.
 */
export class Dagger extends Component {
  /**
   * Synthesized module manifests, keyed by the module directory.
   */
  readonly modules: Record<string, TomlFile> = {}

  readonly #engineVersion?: string

  constructor(project: Project, options: DaggerOptions = {}) {
    super(project)

    this.#engineVersion = options.engineVersion

    for (const [directory, moduleOptions] of Object.entries(
      options.modules ?? {},
    )) {
      this.addModule(directory, moduleOptions)
    }
  }

  /**
   * Synthesizes a `dagger-module.toml` for a module directory.
   */
  addModule(directory: string, options: DaggerModuleOptions = {}): TomlFile {
    if (!this.#engineVersion) {
      throw new Error(
        `Cannot add the Dagger module "${directory}" without an engineVersion. Pass one to the Dagger component.`,
      )
    }

    const name =
      options.name ?? path.posix.basename(path.posix.normalize(directory))

    if (name === '.' || name === '..') {
      throw new Error(
        `Cannot name the Dagger module "${directory}" after its directory. Pass a name in its options.`,
      )
    }

    const manifest: DaggerModuleConfig = {
      name,
      engineVersion: this.#engineVersion,
      include: options.include,
      source: options.source,
      disableDefaultFunctionCaching: options.disableDefaultFunctionCaching,
      runtime:
        typeof options.runtime === 'object'
          ? options.runtime
          : { source: options.runtime ?? 'dang' },
      dependencies: options.dependencies?.map((dependency) =>
        typeof dependency === 'string' ? { source: dependency } : dependency,
      ),
      codegen: options.codegen,
      clients: options.clients,
    }

    const file = new TomlFile(
      this.project,
      path.posix.join(directory, 'dagger-module.toml'),
      { obj: manifest },
    )

    this.modules[directory] = file
    this.#includeDotDirectories(directory)

    return file
  }

  /**
   * A deny-by-default ignore file (`.*`) excludes a directory such as
   * `.dagger/`, and git does not descend into an excluded directory, so the
   * negations projen adds for the manifest are inert on their own.
   *
   * Written without a trailing slash: given one, projen drops every pattern
   * already under that directory, un-ignoring whatever the project hid there.
   */
  #includeDotDirectories(directory: string) {
    const segments = path.posix.normalize(directory).split('/')

    for (const [index, segment] of segments.entries()) {
      if (segment.startsWith('.') && segment !== '.' && segment !== '..') {
        this.project.addGitIgnore(`!/${segments.slice(0, index + 1).join('/')}`)
      }
    }
  }
}
