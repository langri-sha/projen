import { Component, JsonFile, type Project } from 'projen'

import type {
  ClaudeCodeSettings,
  HookCommand,
  HookMatcher,
  PermissionRule,
} from './settings.js'

export * from './settings.js'

const SETTINGS_FILE = '.claude/settings.json'
const LOCAL_SETTINGS_FILE = '.claude/settings.local.json'
const SCHEMA_URL = 'https://json.schemastore.org/claude-code-settings.json'

/**
 * The settings, as Claude Code reads them from `.claude/settings.json`.
 *
 * Generated from SchemaStore's schema, so it follows the published one. Reach
 * keys it lacks with `file.addOverride()`.
 */
export type ClaudeSettings = ClaudeCodeSettings

/**
 * The events that take hooks.
 */
export type ClaudeHookEvent = keyof NonNullable<ClaudeSettings['hooks']>

export type ClaudeMarketplace = NonNullable<
  ClaudeSettings['extraKnownMarketplaces']
>[string]

/**
 * The permission lists a rule goes in.
 */
export type ClaudePermissionList = 'allow' | 'ask' | 'deny'

/**
 * Claude options.
 */
export interface ClaudeOptions {
  /**
   * The settings to write. Declares nothing by default, in particular no
   * permissions, model or attribution, which are the author's to choose.
   */
  readonly settings?: ClaudeSettings

  /**
   * Write `$schema`, so editors validate and complete the file.
   *
   * @default true
   */
  readonly schema?: boolean

  /**
   * Re-include `.claude` in `.gitignore`.
   *
   * A deny-by-default ignore file (`.*`) excludes the directory, and git does
   * not descend into an excluded directory, so the negation projen adds for
   * the file is inert on its own: the file would generate and never be
   * committed.
   *
   * @default true
   */
  readonly gitignore?: boolean
}

/**
 * A component for the Claude Code settings a repository shares, written to
 * `.claude/settings.json`.
 *
 * Personal settings stay out of it. Claude Code saves the rules a user allows
 * to `.claude/settings.local.json`, which the component never writes and
 * keeps out of git.
 */
export class Claude extends Component {
  /**
   * The generated file. Use `addOverride()` for keys `ClaudeSettings` lacks.
   */
  readonly file: JsonFile

  readonly #settings: ClaudeSettings

  constructor(project: Project, options: ClaudeOptions = {}) {
    super(project)

    const { settings = {}, schema = true, gitignore = true } = options

    this.#settings = {
      ...(schema && { $schema: SCHEMA_URL }),
      ...structuredClone(settings),
    }

    if (gitignore) {
      project.addGitIgnore('!/.claude')
    }

    project.addGitIgnore(`/${LOCAL_SETTINGS_FILE}`)

    this.file = new JsonFile(project, SETTINGS_FILE, {
      marker: true,
      readonly: true,
      obj: () => this.settings,
    })
  }

  /**
   * The settings as they will be written.
   */
  get settings(): ClaudeSettings {
    return structuredClone(this.#settings)
  }

  /**
   * Allow tool calls that match the rules, in Claude Code's permission rule
   * syntax.
   */
  addAllow(...rules: PermissionRule[]) {
    this.#addRules('allow', rules)
  }

  /**
   * Make tool calls that match the rules prompt, whatever else allows them.
   */
  addAsk(...rules: PermissionRule[]) {
    this.#addRules('ask', rules)
  }

  /**
   * Deny tool calls that match the rules.
   */
  addDeny(...rules: PermissionRule[]) {
    this.#addRules('deny', rules)
  }

  /**
   * Run a hook on an event. Hooks with the same matcher share a group, and one
   * that is already there is not added twice.
   */
  addHook(
    event: ClaudeHookEvent,
    hook: HookCommand,
    options: { readonly matcher?: string } = {},
  ) {
    const { matcher } = options
    const hooks = (this.#settings.hooks ??= {})
    const groups: HookMatcher[] = (hooks[event] ??= [])
    const group = groups.find((group) => group.matcher === matcher)

    if (!group) {
      groups.push({
        ...(matcher !== undefined && { matcher }),
        hooks: [structuredClone(hook)],
      })

      return
    }

    const serialized = JSON.stringify(hook)

    if (!group.hooks.some((other) => JSON.stringify(other) === serialized)) {
      group.hooks.push(structuredClone(hook))
    }
  }

  /**
   * Set an environment variable for Claude Code sessions. Throws if the name
   * is already set to something else, as which one wins is the caller's call.
   */
  addEnv(name: string, value: string) {
    const env: Record<string, unknown> = (this.#settings.env ??= {})

    if (env[name] !== undefined && env[name] !== value) {
      throw new Error(
        `env.${name} is already set to '${String(env[name])}', so '${value}' cannot replace it.`,
      )
    }

    env[name] = value
  }

  /**
   * Enable a plugin, named `plugin@marketplace`. Throws if it is already
   * enabled or disabled the other way.
   */
  addEnabledPlugin(id: string, enabled = true) {
    const plugins = (this.#settings.enabledPlugins ??= {})

    if (plugins[id] !== undefined && plugins[id] !== enabled) {
      throw new Error(
        `Plugin ${id} is already ${plugins[id] ? 'enabled' : 'disabled'}, so it cannot be ${enabled ? 'enabled' : 'disabled'}.`,
      )
    }

    plugins[id] = enabled
  }

  /**
   * Make a plugin marketplace known to the repository. Throws if the name
   * already points at a different source.
   */
  addMarketplace(name: string, marketplace: ClaudeMarketplace) {
    const marketplaces = (this.#settings.extraKnownMarketplaces ??= {})

    if (
      marketplaces[name] !== undefined &&
      JSON.stringify(marketplaces[name]) !== JSON.stringify(marketplace)
    ) {
      throw new Error(
        `Marketplace ${name} already points at ${JSON.stringify(marketplaces[name].source)}, so it cannot point at ${JSON.stringify(marketplace.source)}.`,
      )
    }

    marketplaces[name] = structuredClone(marketplace)
  }

  #addRules(list: ClaudePermissionList, rules: PermissionRule[]) {
    const permissions = (this.#settings.permissions ??= {})
    const current = (permissions[list] ??= [])

    for (const rule of rules) {
      if (!current.includes(rule)) {
        current.push(rule)
      }
    }
  }
}
