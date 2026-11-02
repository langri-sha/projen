/**
 * The hook events Worktrunk fires, in lifecycle order. `pre-*` hooks block and
 * abort the operation on failure; `post-*` hooks run in the background.
 *
 * @see https://worktrunk.dev/hook/
 */
export const WORKTRUNK_HOOK_EVENTS = [
  'pre-switch',
  'post-switch',
  'pre-start',
  'post-start',
  'pre-commit',
  'post-commit',
  'pre-merge',
  'post-merge',
  'pre-remove',
  'post-remove',
] as const

export type WorktrunkHookEvent = (typeof WORKTRUNK_HOOK_EVENTS)[number]

/**
 * A shell command. Template variables (`{{ branch }}`) expand at run time and
 * are shell-escaped by Worktrunk — do not quote them.
 */
export type WorktrunkCommand = string

/**
 * Named commands that run concurrently. Names are how a command is addressed
 * (`wt hook pre-merge project:test`) and what `{{ hook_name }}` resolves to.
 */
export type WorktrunkCommands = Readonly<Record<string, WorktrunkCommand>>

/**
 * Ordered steps. Steps run in sequence, the commands within a step run
 * concurrently, and a failing step aborts the rest. Serializes to `[[event]]`.
 */
export type WorktrunkPipeline = readonly WorktrunkCommands[]

/**
 * The three forms Worktrunk tells apart by TOML shape. None is promoted to
 * another: the form decides the text shown in the approval prompt and the name
 * a command is addressed by.
 */
export type WorktrunkHook =
  WorktrunkCommand | WorktrunkCommands | WorktrunkPipeline

export type WorktrunkAliases = Readonly<Record<string, WorktrunkHook>>

export interface WorktrunkHooks {
  /** @jsii ignore */
  readonly 'pre-switch'?: WorktrunkHook
  /** @jsii ignore */
  readonly 'post-switch'?: WorktrunkHook
  /** @jsii ignore */
  readonly 'pre-start'?: WorktrunkHook
  /** @jsii ignore */
  readonly 'post-start'?: WorktrunkHook
  /** @jsii ignore */
  readonly 'pre-commit'?: WorktrunkHook
  /** @jsii ignore */
  readonly 'post-commit'?: WorktrunkHook
  /** @jsii ignore */
  readonly 'pre-merge'?: WorktrunkHook
  /** @jsii ignore */
  readonly 'post-merge'?: WorktrunkHook
  /** @jsii ignore */
  readonly 'pre-remove'?: WorktrunkHook
  /** @jsii ignore */
  readonly 'post-remove'?: WorktrunkHook
}

/**
 * JSON-valued aliases modeled by JSII, refined by WorktrunkConfig.
 */
export interface WorktrunkConfigBase extends WorktrunkHooks {
  readonly aliases?: unknown
}

/**
 * `.config/wt.toml`, as Worktrunk reads it. Hooks are top-level keys alongside
 * the section tables.
 *
 * Worktrunk publishes no schema, so this mirrors its documentation by hand.
 * Reach keys it lacks with `file.addOverride()`.
 *
 * @see https://worktrunk.dev/config/
 */
export interface WorktrunkConfig extends WorktrunkConfigBase {
  /**
   * Shared command templates run as `wt <name>`. An alias takes any of the
   * three hook forms, and is approved like a hook.
   * @jsii ignore
   */
  readonly aliases?: WorktrunkAliases

  readonly commit?: WorktrunkCommit

  readonly forge?: WorktrunkForge

  readonly list?: WorktrunkList

  readonly step?: WorktrunkStep
}

/**
 * The section tables, in the order they follow the hooks.
 */
export const WORKTRUNK_SECTIONS = [
  'aliases',
  'commit',
  'forge',
  'list',
  'step',
] as const

export interface WorktrunkCommit {
  readonly generation?: WorktrunkCommitGeneration
}

export interface WorktrunkCommitGeneration {
  /**
   * Project conventions appended to the LLM commit and squash prompts.
   * @jsii ignore
   */
  readonly 'template-append'?: string
}

export interface WorktrunkForge {
  readonly platform?: 'github' | 'gitlab' | 'gitea' | 'azure-devops'
  readonly hostname?: string
}

export interface WorktrunkList {
  /**
   * Dev-server URL template for the `wt list` URL column.
   */
  readonly url?: string
}

export interface WorktrunkStep {
  /** @jsii ignore */
  readonly 'copy-ignored'?: WorktrunkCopyIgnored
}

/**
 * JSON-valued exclusions modeled by JSII, refined by WorktrunkCopyIgnored.
 */
export interface WorktrunkCopyIgnoredBase {
  readonly exclude?: unknown
}

export interface WorktrunkCopyIgnored extends WorktrunkCopyIgnoredBase {
  /** @jsii ignore */
  readonly exclude?: readonly string[]
}
