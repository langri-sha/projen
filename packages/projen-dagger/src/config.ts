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

/**
 * Values a module reads by name, such as constructor arguments. A string can
 * point at another module's output with a `dag://` reference.
 */
export interface DaggerSettings {
  readonly [name: string]: unknown
}

export interface DaggerWorkspaceSkip {
  /**
   * Functions to leave out.
   */
  readonly skip?: readonly string[]
}

/**
 * A module installed in the workspace.
 */
export interface DaggerWorkspaceModule {
  /**
   * Path relative to the workspace root, or a git ref such as
   * `github.com/langri-sha/dagger/terraform@terraform/v0.1.0`.
   */
  readonly source: string

  /**
   * Resolved version for `source`.
   */
  readonly pin?: string

  readonly settings?: DaggerSettings

  /**
   * Make this module the workspace entrypoint.
   */
  readonly entrypoint?: boolean

  /**
   * Compatibility flag recorded by workspace migration.
   */
  readonly 'legacy-default-path'?: boolean

  /**
   * Checks to leave out of `dagger check`.
   */
  readonly check?: DaggerWorkspaceSkip

  /**
   * Generators to leave out of `dagger generate`.
   */
  readonly generate?: DaggerWorkspaceSkip

  /**
   * Services to leave out of `dagger up`.
   */
  readonly up?: DaggerWorkspaceSkip
}

/**
 * A project root an SDK generates into.
 */
export interface DaggerWorkspaceSdkScope {
  /**
   * The scope contains a Dagger module.
   */
  readonly 'is-module'?: boolean

  /**
   * Overrides the inferred module name.
   */
  readonly name?: string

  /**
   * Local paths or module addresses to generate clients for.
   */
  readonly clients?: readonly string[]

  readonly settings?: DaggerSettings
}

/**
 * An installed module registered as an SDK.
 */
export interface DaggerWorkspaceSdk {
  /**
   * Install name of the module providing the SDK.
   */
  readonly module: string

  /**
   * Generation scopes, keyed by paths relative to `dagger.toml`.
   */
  readonly scopes?: Readonly<Record<string, DaggerWorkspaceSdkScope>>
}

export interface DaggerWorkspaceEnvModule {
  /**
   * Installs a module scoped to the environment.
   */
  readonly source?: string

  readonly pin?: string

  readonly settings?: DaggerSettings
}

/**
 * Overlay applied with `--env`.
 */
export interface DaggerWorkspaceEnv {
  readonly modules?: Readonly<Record<string, DaggerWorkspaceEnvModule>>
}

/**
 * A host port that forwards to a workspace service.
 */
export interface DaggerWorkspacePort {
  readonly backendService: string
  readonly backendPort: number
}

/**
 * `dagger.toml`, as the Dagger CLI reads it.
 *
 * @see https://docs.dagger.io/reference/dagger-workspace.schema.json
 */
export interface DaggerWorkspaceConfig {
  /**
   * Installed modules, keyed by install name.
   */
  readonly modules?: Readonly<Record<string, DaggerWorkspaceModule>>

  /**
   * SDK providers and their generation scopes, keyed by SDK name.
   */
  readonly sdks?: Readonly<Record<string, DaggerWorkspaceSdk>>

  /**
   * Path patterns excluded when loading the workspace.
   */
  readonly ignore?: readonly string[]

  /**
   * Read module constructor defaults from a `.env` file.
   */
  readonly defaults_from_dotenv?: boolean

  /**
   * Run generators as checks in `dagger check`, failing on stale output.
   *
   * @default true
   */
  readonly 'check-generated'?: boolean

  /**
   * Environment overlays, keyed by the name `--env` selects.
   */
  readonly env?: Readonly<Record<string, DaggerWorkspaceEnv>>

  /**
   * Host port mappings for services.
   */
  readonly ports?: Readonly<Record<string, DaggerWorkspacePort>>
}
