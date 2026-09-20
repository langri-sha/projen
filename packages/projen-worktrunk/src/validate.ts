import {
  WORKTRUNK_HOOK_EVENTS,
  WORKTRUNK_SECTIONS,
  type WorktrunkConfig,
  type WorktrunkHookEvent,
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

export interface ValidateOptions {
  readonly allowApprovalBypass?: boolean
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

/**
 * Finds what would let a command past Worktrunk's approval prompt: `--yes` on
 * a `wt` invocation, in any position or short-flag cluster, or a reach for the
 * approvals file. Arguments after a bare `--` belong to another program.
 *
 * A guard rail against committing a bypass, not a sandbox: a script the hook
 * calls can still do whatever it likes.
 */
export const findApprovalBypass = (command: string): string | undefined => {
  const state = /WORKTRUNK_APPROVALS_PATH|approvals\.toml/.exec(command)

  if (state) {
    return state[0]
  }

  for (const segment of command
    .replaceAll('\\\n', ' ')
    .split(/&&|\|\||[;&|\n()`]/)) {
    const words = segment
      .split(/\s+/)
      .map((word) => word.replaceAll(/["']/g, ''))
      .filter(Boolean)

    for (const [index, word] of words.entries()) {
      if (!/(^|\/)wt$/.test(word)) {
        continue
      }

      const own = words.slice(index + 1)
      const end = own.indexOf('--')
      const flag = own
        .slice(0, end === -1 ? undefined : end)
        .find((word) => word === '--yes' || /^-[A-Za-z]*y[A-Za-z]*$/.test(word))

      if (flag) {
        return flag
      }
    }
  }

  return undefined
}

const validateCommand = (
  label: string,
  command: unknown,
  { allowApprovalBypass = false }: ValidateOptions,
) => {
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

  const bypass = allowApprovalBypass ? undefined : findApprovalBypass(command)

  if (bypass) {
    throw new Error(
      `${label} uses \`${bypass}\`, which gets commands past Worktrunk's approval prompt. The command is committed, so once a teammate approves it, every later project command runs on their machine unreviewed. Remove it, or pass \`allowApprovalBypass: true\` if the project accepts that.`,
    )
  }
}

const validateCommands = (
  label: string,
  commands: unknown,
  options: ValidateOptions,
) => {
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

    validateCommand(`${label}.${name}`, command, options)
  }
}

/**
 * Validates one hook or alias, in whichever of the three forms it takes.
 */
export const validateHook = (
  label: string,
  hook: unknown,
  options: ValidateOptions = {},
) => {
  if (typeof hook === 'string') {
    validateCommand(label, hook, options)
  } else if (Array.isArray(hook)) {
    if (hook.length === 0) {
      throw new Error(
        `${label} is a pipeline with no steps, which Worktrunk reads as no hook at all. Remove it or add a step.`,
      )
    }

    for (const [index, step] of hook.entries()) {
      validateCommands(`${label}[${index}]`, step, options)
    }
  } else {
    validateCommands(label, hook, options)
  }
}

const isEvent = (key: string): key is WorktrunkHookEvent =>
  (WORKTRUNK_HOOK_EVENTS as readonly string[]).includes(key)

/**
 * Rejects an event Worktrunk does not fire. It ignores keys it does not know,
 * so a hook under a misspelt one would never run.
 */
export const validateEvent = (event: string) => {
  if (isEvent(event)) {
    return
  }

  if (event in CREATION_ALIASES) {
    throw new Error(
      `'${event}' is an alias Worktrunk keeps for '${CREATION_ALIASES[event]}'. Declare '${CREATION_ALIASES[event]}' so the hook has one spelling.`,
    )
  }

  throw new Error(
    `'${event}' is not a Worktrunk hook event. Worktrunk ignores keys it does not know, so the hook would never run. Use one of: ${WORKTRUNK_HOOK_EVENTS.join(', ')}.`,
  )
}

/**
 * Rejects configuration Worktrunk would ignore, fail to load or fail to run,
 * each of which it does quietly enough to go unnoticed until a hook is missed.
 */
export const validateConfig = (
  config: WorktrunkConfig,
  options: ValidateOptions = {},
) => {
  for (const key of Object.keys(config)) {
    if ((WORKTRUNK_SECTIONS as readonly string[]).includes(key)) {
      continue
    }

    if (isEvent(key) || key in CREATION_ALIASES || /^(pre|post)-/.test(key)) {
      validateEvent(key)
      continue
    }

    throw new Error(
      `'${key}' is not a key this component models, so it would be left out of the file. Set it with \`file.addOverride('${key}', …)\` instead.`,
    )
  }

  for (const event of WORKTRUNK_HOOK_EVENTS) {
    if (config[event] !== undefined) {
      validateHook(event, config[event], options)
    }
  }

  if (config.aliases !== undefined) {
    if (!isRecord(config.aliases)) {
      throw new TypeError('aliases must map alias names to commands.')
    }

    for (const [name, alias] of Object.entries(config.aliases)) {
      validateHook(`aliases.${name}`, alias, options)
    }
  }
}
