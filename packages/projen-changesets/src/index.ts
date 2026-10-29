import { Component, JsonFile, type Project } from 'projen'

import type { Changesets as ChangesetsSchema } from './config.js'

const CONFIG_FILE = '.changeset/config.json'
const SCHEMA_URL = 'https://unpkg.com/@changesets/config/schema.json'

/**
 * The configuration, as Changesets reads it from `.changeset/config.json`.
 *
 * Generated from SchemaStore's schema, so it follows the published one.
 */
export type ChangesetsConfig = ChangesetsSchema

/**
 * Changesets options.
 */
export interface ChangesetsOptions {
  /**
   * The configuration to write. Defaults to what `changeset init` writes, bar
   * the prompts: restricted access, no commit on `changeset add`, and the
   * built-in changelog.
   */
  readonly config?: ChangesetsConfig

  /**
   * Write `$schema`, so editors validate and complete the file.
   *
   * @default true
   */
  readonly schema?: boolean

  /**
   * Re-include `.changeset` in `.gitignore`.
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

const defaults: ChangesetsConfig = {
  baseBranch: 'main',
  access: 'restricted',
  ignore: [],
  fixed: [],
  linked: [],
  format: 'auto',
  updateInternalDependencies: 'patch',
  commit: false,
  changelog: '@changesets/cli/changelog',
}

/**
 * A component for [Changesets](https://github.com/changesets/changesets),
 * written to `.changeset/config.json`.
 */
export class Changesets extends Component {
  /**
   * The generated file. Use `addOverride()` for keys `ChangesetsConfig` lacks.
   */
  readonly file: JsonFile

  constructor(project: Project, options: ChangesetsOptions = {}) {
    super(project)

    const { config = {}, schema = true, gitignore = true } = options

    if (gitignore) {
      project.addGitIgnore('!/.changeset')
    }

    this.file = new JsonFile(project, CONFIG_FILE, {
      marker: true,
      readonly: true,
      obj: {
        ...(schema && { $schema: SCHEMA_URL }),
        ...structuredClone(defaults),
        ...structuredClone(config),
      },
    })
  }
}
