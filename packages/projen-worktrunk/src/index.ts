import { Component, type Project, TomlFile } from 'projen'

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
export interface WorktrunkCommands {
  readonly [name: string]: WorktrunkCommand
}

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
  | WorktrunkCommand
  | WorktrunkCommands
  | WorktrunkPipeline

export interface WorktrunkAliases {
  readonly [name: string]: WorktrunkHook
}

export type WorktrunkHooks = {
  readonly [Event in WorktrunkHookEvent]?: WorktrunkHook
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
export interface WorktrunkConfig extends WorktrunkHooks {
  /**
   * Shared command templates run as `wt <name>`. An alias takes any of the
   * three hook forms, and is approved like a hook.
   */
  readonly aliases?: WorktrunkAliases

  readonly commit?: {
    readonly generation?: {
      /**
       * Project conventions appended to the LLM commit and squash prompts.
       */
      readonly 'template-append'?: string
    }
  }

  readonly forge?: {
    readonly platform?: 'github' | 'gitlab' | 'gitea' | 'azure-devops'
    readonly hostname?: string
  }

  readonly list?: {
    /**
     * Dev-server URL template for the `wt list` URL column.
     */
    readonly url?: string
  }

  readonly step?: {
    readonly 'copy-ignored'?: {
      readonly exclude?: readonly string[]
    }
  }
}

const SECTIONS = ['aliases', 'commit', 'forge', 'list', 'step'] as const

/**
 * Worktrunk options.
 */
export interface WorktrunkOptions {
  /**
   * Where to write the project config.
   *
   * @default '.config/wt.toml'
   */
  readonly filename?: string

  readonly config?: WorktrunkConfig
}

/**
 * Declare an ordered pipeline, so the sequential-then-concurrent semantics are
 * visible at the call site.
 */
export const pipeline = (...steps: WorktrunkCommands[]): WorktrunkPipeline =>
  steps

/**
 * A component for authoring Worktrunk project configuration. Worktrunk has no
 * include mechanism, so the component owns the whole file.
 */
export class Worktrunk extends Component {
  /**
   * The generated file. Use `addOverride()` for keys `WorktrunkConfig` lacks.
   */
  readonly file: TomlFile

  readonly #config: WorktrunkConfig

  constructor(
    project: Project,
    { filename = '.config/wt.toml', config = {} }: WorktrunkOptions = {},
  ) {
    super(project)

    this.#config = config

    this.file = new TomlFile(project, filename, {
      marker: true,
      readonly: true,
      obj: () => this.#render(),
    })
  }

  /**
   * Hooks in lifecycle order, then sections, whatever order they arrived in.
   * The serializer still hoists string hooks above every table, as TOML needs.
   */
  #render(): WorktrunkConfig {
    return Object.fromEntries(
      [...WORKTRUNK_HOOK_EVENTS, ...SECTIONS]
        .filter((key) => this.#config[key] !== undefined)
        .map((key) => [key, this.#config[key]]),
    )
  }
}
