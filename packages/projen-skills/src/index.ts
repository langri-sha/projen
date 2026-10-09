import { Component, type Project, javascript } from 'projen'

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
}

/**
 * A component for the agent skills a repository uses. It declares them in the
 * `skills` field of `package.json`, for the `skills` CLI to install and lock.
 */
export class Skills extends Component {
  readonly #entries: SkillEntry[]

  constructor(project: Project, options: SkillsOptions) {
    super(project)

    const { skills, agents = ['claude-code'] } = options

    this.#entries = normalizeSkills(skills)
    validateAgents(agents)

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
  }
}
