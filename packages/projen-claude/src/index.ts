import { Component, JsonFile, type Project } from 'projen'

import type { ClaudeCodeSettings } from './settings.js'

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
}
