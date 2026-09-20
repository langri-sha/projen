import * as path from 'node:path'

import { Component, type Project, TomlFile } from 'projen'

import {
  WORKTRUNK_HOOK_EVENTS,
  WORKTRUNK_SECTIONS,
  type WorktrunkCommands,
  type WorktrunkConfig,
  type WorktrunkPipeline,
} from './config.js'
import { validateConfig } from './validate.js'

export * from './config.js'

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

  /**
   * Re-include the dot-directories leading to the config file in `.gitignore`.
   *
   * A deny-by-default ignore file (`.*`) excludes `.config/`, and git does not
   * descend into an excluded directory, so the negation projen adds for the
   * file is inert on its own: the file would generate and never be committed.
   *
   * @default true
   */
  readonly gitignore?: boolean
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

  constructor(project: Project, options: WorktrunkOptions = {}) {
    const {
      filename = '.config/wt.toml',
      config = {},
      gitignore = true,
    } = options

    super(project)

    if (project.parent && options.filename === undefined) {
      throw new Error(
        `Worktrunk reads .config/wt.toml from the root of a worktree, so the copy written for the subproject '${project.name}' would never be read. Add the component to the root project, or name a \`filename\` if this project is the root of its own repository.`,
      )
    }

    validateConfig(config)

    this.#config = config

    if (gitignore) {
      this.#includeDotDirectories(filename)
    }

    this.file = new TomlFile(project, filename, {
      marker: true,
      readonly: true,
      obj: () => this.#render(),
    })
  }

  /**
   * Written without a trailing slash: given one, projen drops every pattern
   * already under that directory, un-ignoring whatever the project hid there.
   */
  #includeDotDirectories(filename: string) {
    const segments = path.normalize(filename).split(path.sep).slice(0, -1)

    for (const [index, segment] of segments.entries()) {
      if (segment.startsWith('.') && segment !== '..') {
        this.project.addGitIgnore(`!/${segments.slice(0, index + 1).join('/')}`)
      }
    }
  }

  /**
   * Hooks in lifecycle order, then sections, whatever order they arrived in.
   * The serializer still hoists string hooks above every table, as TOML needs.
   */
  #render(): WorktrunkConfig {
    return Object.fromEntries(
      [...WORKTRUNK_HOOK_EVENTS, ...WORKTRUNK_SECTIONS]
        .filter((key) => this.#config[key] !== undefined)
        .map((key) => [key, this.#config[key]]),
    )
  }
}
