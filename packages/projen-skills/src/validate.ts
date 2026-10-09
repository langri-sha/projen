import { AGENT_SKILLS_DIRS } from './agents.js'

/**
 * A skill source, in the grammar of the `skills` field of `package.json`:
 * `npm:<package>`, or a git repository as `owner/repo` or a URL.
 */
export type SkillSource =
  | string
  | {
      /**
       * Where the skills come from.
       */
      readonly source: string

      /**
       * The commit to install, as a full 40-character SHA. Required for git
       * sources, so a branch moving never changes what is installed.
       */
      readonly ref?: string

      /**
       * The skills to install from the source. Required: the component
       * ignores and checks skills by name, which a source does not reveal
       * before it is cloned.
       */
      readonly skills?: string[]
    }

export interface SkillEntry {
  readonly source: string
  readonly ref?: string
  readonly skills: string[]
}

const SHA = /^[0-9a-f]{40}$/
const SKILL_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const GIT_SOURCE = /^(?:[\w.-]+\/[\w.-]+|(?:https?|ssh|git):\/\/\S+|git@\S+)$/

const isLocal = (source: string) =>
  /^(?:\.|\/|~|file:|[A-Za-z]:[\\/])/.test(source) || source.includes('\\')

/**
 * Check the declared sources and put them in the form written to
 * `package.json`. Throws on the first problem, naming the entry.
 */
export const normalizeSkills = (skills: SkillSource[]): SkillEntry[] => {
  const seen = new Map<string, string>()

  return skills.map((entry, index) => {
    const declared = typeof entry === 'string' ? { source: entry } : entry
    const { source, ref } = declared
    const label = `skills[${index}] (${JSON.stringify(source)})`

    if (typeof source !== 'string' || source.trim() === '') {
      throw new Error(`${label} has no source.`)
    }

    if (isLocal(source)) {
      throw new Error(
        `${label} is a local path. Skills must come from \`npm:<package>\` or a git repository, so a fresh clone can restore them.`,
      )
    }

    const npm = source.startsWith('npm:')

    if (npm ? source.length === 'npm:'.length : !GIT_SOURCE.test(source)) {
      throw new Error(
        `${label} is not a skill source. Use \`npm:<package>\`, a git \`owner/repo\`, or a git URL.`,
      )
    }

    if (!npm && (ref === undefined || !SHA.test(ref))) {
      throw new Error(
        `${label} needs a \`ref\` that is a full 40-character commit SHA${ref === undefined ? '' : `, not ${JSON.stringify(ref)}`}. A branch or tag moves, and the lock would stop meaning anything.`,
      )
    }

    const names = declared.skills

    if (!names?.length) {
      throw new Error(
        `${label} must list the \`skills\` to install. The component ignores and checks installed skills by name, and a source does not reveal its skills before it is cloned.`,
      )
    }

    for (const name of names) {
      if (!SKILL_NAME.test(name)) {
        throw new Error(
          `${label} lists ${JSON.stringify(name)}, which is not a skill name. Names are folder names: letters, digits, \`.\`, \`_\` and \`-\`.`,
        )
      }

      const other = seen.get(name)

      if (other !== undefined) {
        throw new Error(
          `${label} declares the skill "${name}", which ${other} already declares. Both would install into the same folder.`,
        )
      }

      seen.set(name, label)
    }

    return {
      source,
      ...(ref === undefined ? {} : { ref }),
      skills: [...names],
    }
  })
}

/**
 * Check the agent names against the registry, and drop repeats.
 */
export const validateAgents = (agents: string[]): string[] => {
  if (!agents.length) {
    throw new Error('Name at least one agent to install skills for.')
  }

  for (const agent of agents) {
    if (!Object.hasOwn(AGENT_SKILLS_DIRS, agent)) {
      throw new Error(
        `Unknown agent ${JSON.stringify(agent)}. The component knows the agents skills@1.7.2 does; see AGENT_SKILLS_DIRS.`,
      )
    }
  }

  return [...new Set(agents)]
}
