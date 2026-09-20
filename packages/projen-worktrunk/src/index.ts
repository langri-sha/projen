import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'

import { Component, type Project, type Task, TomlFile } from 'projen'

import {
  WORKTRUNK_HOOK_EVENTS,
  WORKTRUNK_SECTIONS,
  type WorktrunkCommand,
  type WorktrunkCommands,
  type WorktrunkConfig,
  type WorktrunkHook,
  type WorktrunkHookEvent,
  type WorktrunkPipeline,
} from './config.js'
import {
  type ValidateOptions,
  validateConfig,
  validateEvent,
  validateHook,
} from './validate.js'

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

  /**
   * Permit commands that get past Worktrunk's approval prompt, such as
   * `wt merge --yes`.
   *
   * The file is committed, so such a command, once approved, runs every later
   * project command unreviewed on each teammate's machine.
   *
   * @default false
   */
  readonly allowApprovalBypass?: boolean

  /**
   * Replace a config file that projen did not generate.
   *
   * Off by default, and synthesis fails instead: projen would overwrite a
   * hand-written file without a word.
   *
   * @default false
   */
  readonly overwriteExisting?: boolean

  /**
   * Add the `worktrunk:show` and `worktrunk:dry-run` tasks. Both need `wt` on
   * the `PATH`, so neither joins another task.
   *
   * @default true
   */
  readonly tasks?: boolean
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
  readonly #dryRun?: Task
  readonly #hooks = new Map<WorktrunkHookEvent, WorktrunkHook>()
  readonly #overwriteExisting: boolean
  readonly #validation: ValidateOptions

  constructor(project: Project, options: WorktrunkOptions = {}) {
    const {
      filename = '.config/wt.toml',
      config = {},
      gitignore = true,
      allowApprovalBypass = false,
      overwriteExisting = false,
      tasks = true,
    } = options

    super(project)

    if (project.parent && options.filename === undefined) {
      throw new Error(
        `Worktrunk reads .config/wt.toml from the root of a worktree, so the copy written for the subproject '${project.name}' would never be read. Add the component to the root project, or name a \`filename\` if this project is the root of its own repository.`,
      )
    }

    this.#validation = { allowApprovalBypass }

    validateConfig(config, this.#validation)

    this.#config = config
    this.#overwriteExisting = overwriteExisting

    for (const event of WORKTRUNK_HOOK_EVENTS) {
      if (config[event] !== undefined) {
        this.#hooks.set(event, structuredClone(config[event]))
      }
    }

    if (gitignore) {
      this.#includeDotDirectories(filename)
    }

    this.file = new TomlFile(project, filename, {
      marker: true,
      readonly: true,
      obj: () => this.#render(),
    })

    if (tasks) {
      project.addTask('worktrunk:show', {
        description:
          'Show the configured Worktrunk hooks, with templates expanded',
        exec: 'wt hook show --expanded',
      })

      this.#dryRun = project.addTask('worktrunk:dry-run', {
        description:
          'Expand every configured Worktrunk hook without running it, failing on a template Worktrunk cannot expand',
      })
    }

    // After the file, whose own annotation this has to follow on the line:
    // the commands run on teammates' machines once approved, so a change to
    // them must not arrive collapsed in review.
    project.gitattributes.addAttributes(
      `/${this.file.path}`,
      '-linguist-generated',
    )
  }

  /**
   * The configuration as it will be written.
   */
  get config(): WorktrunkConfig {
    return this.#render()
  }

  /**
   * Set a hook, in any of the three forms. Throws if the event already has
   * one: whether the two should run together or in turn is the caller's call.
   */
  addHook(event: WorktrunkHookEvent, hook: WorktrunkHook) {
    validateEvent(event)

    if (this.#hooks.has(event)) {
      throw new Error(
        `${event} already has a hook. Add to it with \`addCommand()\` to run alongside it, or \`addStep()\` to run after it.`,
      )
    }

    validateHook(event, hook, this.#validation)

    this.#hooks.set(event, structuredClone(hook))
  }

  /**
   * Add a named command to run alongside the others of a hook. Throws rather
   * than change the hook's form, which would rewrite the text teammates have
   * approved and the names its commands are addressed by.
   */
  addCommand(
    event: WorktrunkHookEvent,
    name: string,
    command: WorktrunkCommand,
  ) {
    validateEvent(event)

    const hook = this.#hooks.get(event) ?? {}

    if (typeof hook === 'string' || Array.isArray(hook)) {
      throw new TypeError(
        `${event} is ${typeof hook === 'string' ? 'a single command' : 'a pipeline'}, so '${name}' cannot be added alongside it. Declare ${event} as named commands${Array.isArray(hook) ? ', or use `addStep()`' : ''}.`,
      )
    }

    const commands = hook as WorktrunkCommands

    if (commands[name] !== undefined && commands[name] !== command) {
      throw new Error(
        `${event} already has a command named '${name}' that runs something else: ${commands[name]}`,
      )
    }

    validateHook(event, { [name]: command }, this.#validation)

    this.#hooks.set(event, { ...commands, [name]: command })
  }

  /**
   * Append a step to a pipeline, to run once the steps before it succeed.
   * Throws on a hook in another form, for the same reason as `addCommand()`.
   */
  addStep(event: WorktrunkHookEvent, step: WorktrunkCommands) {
    validateEvent(event)

    const hook = this.#hooks.get(event) ?? []

    if (!Array.isArray(hook)) {
      throw new TypeError(
        `${event} is ${typeof hook === 'string' ? 'a single command' : 'named commands'}, not a pipeline, so a step cannot follow it. Declare ${event} with \`pipeline()\`.`,
      )
    }

    validateHook(event, [step], this.#validation)

    this.#hooks.set(event, [...hook, structuredClone(step)])
  }

  /**
   * Recognizes its own output by the marker rather than `.projen/files.json`,
   * so that a fresh clone, or a starter file from `wt config create --project`
   * written over a generated one, is still told apart correctly.
   */
  override preSynthesize() {
    for (const event of WORKTRUNK_HOOK_EVENTS) {
      if (this.#hooks.has(event)) {
        this.#dryRun?.exec(`wt hook ${event} --dry-run`)
      }
    }

    const marker = this.file.marker?.split('.')[0]

    if (
      this.#overwriteExisting ||
      marker === undefined ||
      !existsSync(this.file.absolutePath) ||
      readFileSync(this.file.absolutePath, 'utf8').includes(marker)
    ) {
      return
    }

    throw new Error(
      `${this.file.path} exists and was not generated by projen. Worktrunk has no way to include one config in another, so this component owns the whole file. Move its contents into the component's \`config\` and delete the file, or pass \`overwriteExisting: true\` to replace it.`,
    )
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
    return Object.fromEntries([
      ...WORKTRUNK_HOOK_EVENTS.filter((event) => this.#hooks.has(event)).map(
        (event) => [event, this.#hooks.get(event)],
      ),
      ...WORKTRUNK_SECTIONS.filter(
        (section) => this.#config[section] !== undefined,
      ).map((section) => [section, this.#config[section]]),
    ])
  }
}
