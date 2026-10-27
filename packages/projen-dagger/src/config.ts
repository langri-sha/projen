import type {
  CurrentModuleConfigDependency,
  DaggerModuleDaggerModuleToml,
  ModuleCodegenConfig,
  ModuleConfigClient,
  SDK,
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
export type DaggerModuleRuntime = Omit<SDK, 'config' | 'debug' | 'experimental'>

export type DaggerModuleDependencyConfig = CurrentModuleConfigDependency

export type DaggerModuleCodegen = ModuleCodegenConfig

export type DaggerModuleClient = ModuleConfigClient

/**
 * `dagger-module.toml`, as the Dagger CLI reads it, without the fields the
 * schema deprecates.
 *
 * @see https://docs.dagger.io/reference/dagger-module.schema.json
 */
export type DaggerModuleConfig = Omit<
  DaggerModuleDaggerModuleToml,
  '$schema' | 'exclude' | 'runtime'
> & {
  runtime?: DaggerModuleRuntime
}

/**
 * Values a module reads by name, such as constructor arguments. A string can
 * point at another module's output with a `dag://` reference.
 */
export interface DaggerSettings {
  [name: string]: unknown
}

export type DaggerWorkspaceSkip = ModuleSkip

export type DaggerWorkspaceModule = ModuleEntry

export type DaggerWorkspaceSdkScope = SDKScope

export type DaggerWorkspaceSdk = SDKEntry

export type DaggerWorkspaceEnvModule = EnvModuleOverlay

export type DaggerWorkspaceEnv = EnvOverlay

export type DaggerWorkspacePort = PortMapping

/**
 * `dagger.toml`, as the Dagger CLI reads it, without the workspace
 * `include` the component does not synthesize.
 *
 * @see https://docs.dagger.io/reference/dagger-workspace.schema.json
 */
export type DaggerWorkspaceConfig = Omit<DaggerWorkspaceDaggerToml, 'include'>
