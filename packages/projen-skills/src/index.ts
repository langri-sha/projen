import { Component, type Project, javascript } from 'projen'

import { AGENT_SKILLS_DIRS, SHARED_SKILLS_DIR } from './agents.js'
import { SYNC_ENV, syncArgs, syncSkills } from './sync.js'
import {
  type SkillEntry,
  type SkillSource,
  normalizeSkills,
  validateAgents,
} from './validate.js'

export { AGENT_SKILLS_DIRS } from './agents.js'
export type { SkillSource } from './validate.js'

/**
 * Skills options.
 */
export interface SkillsOptions {
  /**
   * The skills the repository declares, in the grammar of the `skills` field
   * of `package.json`.
   */
  readonly skills: SkillSource[]

  /**
   * The agents to install the skills for.
   *
   * @default ['claude-code']
   */
  readonly agents?: string[]

  /**
   * Install the skills after every synthesis, then check that each declared
   * one landed in `skills-lock.json` and on disk.
   *
   * The lock is the CLI's: the component never writes it, and it is committed.
   * Running `projen` and failing on any diff, as CI does, therefore doubles as
   * the check that the lock matches the declaration.
   *
   * @default true
   */
  readonly sync?: boolean
}

/**
 * A component for the agent skills a repository uses. It declares them in the
 * `skills` field of `package.json`, for the `skills` CLI to install and lock.
 */
export class Skills extends Component {
  readonly #agents: string[]
  readonly #entries: SkillEntry[]
  readonly #sync: boolean

  constructor(project: Project, options: SkillsOptions) {
    super(project)

    const { skills, agents = ['claude-code'], sync = true } = options

    this.#entries = normalizeSkills(skills)
    this.#agents = validateAgents(agents)
    this.#sync = sync

    const pkg = project.components.find(
      (component): component is javascript.NodePackage =>
        component instanceof javascript.NodePackage,
    )

    if (!pkg) {
      throw new Error(
        `Skills are declared in package.json, and the project '${project.name}' has none. Add the component to a Node project.`,
      )
    }

    pkg.addField('skills', this.#entries)

    project.gitignore.exclude(...this.#installPaths())

    project.addTask('skills', {
      description: 'Install the declared skills with the skills CLI',
      exec: `skills ${syncArgs(this.#agents).join(' ')}`,
      env: { ...SYNC_ENV },
    })
  }

  override postSynthesize(): void {
    super.postSynthesize()

    if (this.#sync) {
      syncSkills({
        cwd: this.project.outdir,
        agents: this.#agents,
        entries: this.#entries,
      })
    }
  }

  /**
   * Where the CLI installs the declared skills. Only these are ignored, not the
   * folders around them, as a repository may commit skills of its own beside
   * them. Sync rebuilds them from `skills-lock.json` on a fresh clone.
   */
  #installPaths(): string[] {
    const names = this.#entries.flatMap(({ skills }) => skills)
    const dirs = new Set(
      this.#agents
        .map((agent) => AGENT_SKILLS_DIRS[agent])
        .filter((dir) => dir !== SHARED_SKILLS_DIR),
    )

    return [
      ...names.map((name) => `/${SHARED_SKILLS_DIR}/${name}/`),
      // Links, so no trailing slash: it would not match a symlink.
      ...[...dirs].flatMap((dir) => names.map((name) => `/${dir}/${name}`)),
    ]
  }
}
