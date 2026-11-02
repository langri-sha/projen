import type {
  CurrentModuleConfigDependency,
  DaggerModuleDaggerModuleToml,
  ModuleCodegenConfig,
  ModuleConfigClient,
  Sdk,
} from './dagger-module.js'
import type {
  DaggerWorkspaceDaggerToml,
  EnvModuleOverlay,
  EnvOverlay,
  ModuleEntry,
  ModuleSkip,
  PortMapping,
  SDKEntry,
  SDKScope,
} from './dagger-workspace.js'

/**
 * The runtime a module is implemented with, without the fields the schema
 * deprecates.
 */
export type DaggerModuleRuntime = Mutable<
  Omit<Sdk, 'config' | 'debug' | 'experimental'>
>

export type DaggerModuleDependencyConfig =
  Mutable<CurrentModuleConfigDependency>

export type DaggerModuleCodegen = Mutable<ModuleCodegenConfig>

export type DaggerModuleClient = Mutable<ModuleConfigClient>

/**
 * `dagger-module.toml`, as the Dagger CLI reads it, without the fields the
 * schema deprecates.
 *
 * @see https://docs.dagger.io/reference/dagger-module.schema.json
 */
export type DaggerModuleConfig = Mutable<
  Omit<DaggerModuleDaggerModuleToml, '$schema' | 'exclude' | 'runtime'> & {
    runtime?: DaggerModuleRuntime
  }
>

/**
 * Values a module reads by name, such as constructor arguments. A string can
 * point at another module's output with a `dag://` reference.
 */
export interface DaggerSettings {
  /** @jsii ignore */
  [name: string]: unknown
}

export type DaggerWorkspaceSkip = Mutable<ModuleSkip>

export type DaggerWorkspaceModule = Mutable<ModuleEntry>

export type DaggerWorkspaceSdkScope = Mutable<SDKScope>

export type DaggerWorkspaceSdk = Mutable<SDKEntry>

export type DaggerWorkspaceEnvModule = Mutable<EnvModuleOverlay>

export type DaggerWorkspaceEnv = Mutable<EnvOverlay>

export type DaggerWorkspacePort = Mutable<PortMapping>

/**
 * `dagger.toml`, as the Dagger CLI reads it, without the workspace
 * `include` the component does not synthesize.
 *
 * @see https://docs.dagger.io/reference/dagger-workspace.schema.json
 */
export type DaggerWorkspaceConfig = Mutable<
  Omit<DaggerWorkspaceDaggerToml, 'include'>
>

/** @internal */
type Mutable<T> = { -readonly [Key in keyof T]: Mutable<T[Key]> }
