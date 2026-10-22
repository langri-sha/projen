import { Component, JsonFile, type Project } from 'projen'

import type { ClaudeCodeSettings } from './settings.js'

export * from './settings.js'

const SETTINGS_FILE = '.claude/settings.json'
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
}

/**
 * A component for the Claude Code settings a repository shares, written to
 * `.claude/settings.json`.
 */
export class Claude extends Component {
  /**
   * The generated file. Use `addOverride()` for keys `ClaudeSettings` lacks.
   */
  readonly file: JsonFile

  readonly #settings: ClaudeSettings

  constructor(project: Project, options: ClaudeOptions = {}) {
    super(project)

    const { settings = {}, schema = true } = options

    this.#settings = {
      ...(schema && { $schema: SCHEMA_URL }),
      ...structuredClone(settings),
    }

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
