import {
  WORKTRUNK_HOOK_EVENTS,
  WORKTRUNK_SECTIONS,
  type WorktrunkConfig,
} from './config.js'

const TEMPLATE_CLOSERS: Record<string, string> = {
  '{{': '}}',
  '{%': '%}',
  '{#': '#}',
}

const CREATION_ALIASES: Record<string, string> = {
  'pre-create': 'pre-start',
  'post-create': 'post-start',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Finds a template tag that is opened and never closed. A closer on its own is
 * left alone: Worktrunk reads it as text, and `${A:-${B}}` is ordinary shell.
 */
const findUnclosedTag = (command: string): string | undefined => {
  let position = 0

  for (;;) {
    const open = /\{[{%#]/.exec(command.slice(position))

    if (!open) {
      return undefined
    }

    const start = position + open.index
    const end = command.indexOf(TEMPLATE_CLOSERS[open[0]]!, start + 2)

    if (end === -1) {
      return open[0]
    }

    position = end + 2
  }
}

const validateCommand = (label: string, command: unknown) => {
  if (typeof command !== 'string') {
    throw new TypeError(
      `${label} must be a shell command string, not ${JSON.stringify(command)}.`,
    )
  }

  if (command.trim() === '') {
    throw new Error(
      `${label} is an empty command. Worktrunk would ask for approval to run nothing; remove it or give it a command.`,
    )
  }

  const unclosed = findUnclosedTag(command)

  if (unclosed) {
    throw new Error(
      `${label} opens a template tag with \`${unclosed}\` and never closes it, which Worktrunk fails to expand: ${command}`,
    )
  }
}

const validateCommands = (label: string, commands: unknown) => {
  if (!isRecord(commands)) {
    throw new TypeError(
      `${label} must map command names to commands, not ${JSON.stringify(commands)}. Worktrunk also runs a list of bare strings, but leaves that form undocumented; name each command instead.`,
    )
  }

  if (Object.keys(commands).length === 0) {
    throw new Error(
      `${label} has no commands, which Worktrunk reads as no hook at all. Remove it or add a command.`,
    )
  }

  for (const [name, command] of Object.entries(commands)) {
    if (name.trim() === '') {
      throw new Error(`${label} has a command with an empty name.`)
    }

    if (name.includes(':')) {
      throw new Error(
        `${label} names a command '${name}'. Worktrunk reserves ':' for addressing commands (\`project:${name.replaceAll(':', '-')}\`) and refuses to load a config that uses it in a name.`,
      )
    }

    validateCommand(`${label}.${name}`, command)
  }
}

/**
 * Validates one hook or alias, in whichever of the three forms it takes.
 */
export const validateHook = (label: string, hook: unknown) => {
  if (typeof hook === 'string') {
    validateCommand(label, hook)
  } else if (Array.isArray(hook)) {
    if (hook.length === 0) {
      throw new Error(
        `${label} is a pipeline with no steps, which Worktrunk reads as no hook at all. Remove it or add a step.`,
      )
    }

    for (const [index, step] of hook.entries()) {
      validateCommands(`${label}[${index}]`, step)
    }
  } else {
    validateCommands(label, hook)
  }
}

/**
 * Rejects configuration Worktrunk would ignore, fail to load or fail to run,
 * each of which it does quietly enough to go unnoticed until a hook is missed.
 */
export const validateConfig = (config: WorktrunkConfig) => {
  const known = new Set<string>([
    ...WORKTRUNK_HOOK_EVENTS,
    ...WORKTRUNK_SECTIONS,
  ])

  for (const key of Object.keys(config)) {
    if (known.has(key)) {
      continue
    }

    if (key in CREATION_ALIASES) {
      throw new Error(
        `'${key}' is an alias Worktrunk keeps for '${CREATION_ALIASES[key]}'. Declare '${CREATION_ALIASES[key]}' so the hook has one spelling.`,
      )
    }

    if (/^(pre|post)-/.test(key)) {
      throw new Error(
        `'${key}' is not a Worktrunk hook event. Worktrunk ignores keys it does not know, so the hook would never run. Use one of: ${WORKTRUNK_HOOK_EVENTS.join(', ')}.`,
      )
    }

    throw new Error(
      `'${key}' is not a key this component models, so it would be left out of the file. Set it with \`file.addOverride('${key}', …)\` instead.`,
    )
  }

  for (const event of WORKTRUNK_HOOK_EVENTS) {
    if (config[event] !== undefined) {
      validateHook(event, config[event])
    }
  }

  if (config.aliases !== undefined) {
    if (!isRecord(config.aliases)) {
      throw new TypeError('aliases must map alias names to commands.')
    }

    for (const [name, alias] of Object.entries(config.aliases)) {
      validateHook(`aliases.${name}`, alias)
    }
  }
}
