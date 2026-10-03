/**
 * The runtime a module is implemented with.
 */
export interface DaggerModuleRuntime {
  /**
   * Built-in runtime or SDK module, e.g. `dang` or `go`.
   */
  readonly source: string

  /**
   * Version the SDK is pinned to, for an SDK loaded from a git ref.
   */
  readonly pin?: string
}

/**
 * A module another module depends on.
 */
export interface DaggerModuleDependencyConfig {
  /**
   * Name the dependency is addressed by.
   *
   * @default - the dependency module's own name
   */
  readonly name?: string

  /**
   * Path relative to the manifest, or a git ref such as
   * `github.com/langri-sha/dagger/terraform@terraform/v0.1.0`.
   */
  readonly source: string

  /**
   * Version the dependency is pinned to.
   */
  readonly pin?: string
}

export interface DaggerModuleCodegen {
  /**
   * Gitignore the generated files. `false` commits them instead.
   */
  readonly automaticGitignore?: boolean
}

export interface DaggerModuleClient {
  /**
   * Generator the client is generated with.
   */
  readonly generator: string

  /**
   * Directory the client is generated in.
   */
  readonly directory: string
}

/**
 * `dagger-module.toml`, as the Dagger CLI reads it, without the fields the
 * schema deprecates.
 *
 * @see https://docs.dagger.io/reference/dagger-module.schema.json
 */
export interface DaggerModuleConfig {
  readonly name: string

  /**
   * Engine version the module requires. An engine loads the module when its
   * base version is at least this one's, so every 1.0 prerelease loads a
   * module declaring any other.
   */
  readonly engineVersion?: string

  /**
   * Paths to include from the module, relative to the manifest. Exclude one
   * with a `!` prefix.
   */
  readonly include?: readonly string[]

  /**
   * Subdirectory holding the module's source, relative to the manifest.
   */
  readonly source?: string

  /**
   * Cache function calls per session rather than by default.
   */
  readonly disableDefaultFunctionCaching?: boolean

  readonly runtime?: DaggerModuleRuntime

  readonly dependencies?: readonly DaggerModuleDependencyConfig[]

  readonly codegen?: DaggerModuleCodegen

  readonly clients?: readonly DaggerModuleClient[]
}
