import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'

import { AGENT_SKILLS_DIRS, SHARED_SKILLS_DIR } from './agents.js'
import type { SkillEntry } from './validate.js'

export const LOCK_FILE = 'skills-lock.json'

/**
 * `computedHash` sorts paths with `localeCompare`, so the lock differs between
 * machines unless the locale is fixed.
 */
export const SYNC_ENV = { DISABLE_TELEMETRY: '1', LC_ALL: 'C' } as const

export interface SyncInvocation {
  readonly args: string[]
  readonly cwd: string
  readonly env: Record<string, string>
}

export interface SyncResult {
  readonly exitCode: number
  readonly output: string
}

export type SyncRunner = (invocation: SyncInvocation) => SyncResult

/**
 * Never `experimental_install`: it strips `via` from the entries the `skills`
 * field manages, after which sync skips them as installed with `skills add`,
 * installs nothing on a fresh clone and still exits 0. It ignores `-a` too.
 */
export const syncArgs = (agents: string[]): string[] => [
  'experimental_sync',
  '-a',
  ...agents,
  '-y',
]

/**
 * Run the `skills` CLI the project installed, with this process's Node.
 */
export const runSkills: SyncRunner = ({ args, cwd, env }) => {
  let bin: string

  try {
    const manifest = createRequire(path.join(cwd, 'noop.js')).resolve(
      'skills/package.json',
    )
    const { bin: entry } = JSON.parse(readFileSync(manifest, 'utf8'))

    bin = path.resolve(
      path.dirname(manifest),
      typeof entry === 'string' ? entry : entry.skills,
    )
  } catch {
    throw new Error(
      `Cannot find the skills CLI from ${cwd}. It is an optional peer dependency of projen-skills: add \`skills\` to the project's devDependencies and install.`,
    )
  }

  const { status, stdout, stderr, error } = spawnSync(
    process.execPath,
    [bin, ...args],
    { cwd, env: { ...process.env, ...env }, encoding: 'utf8' },
  )

  if (error) {
    throw error
  }

  return { exitCode: status ?? 1, output: `${stdout}${stderr}`.trim() }
}

export interface SyncOptions {
  readonly cwd: string
  readonly agents: string[]
  readonly entries: SkillEntry[]
  readonly run?: SyncRunner
}

/**
 * Install the declared skills, and fail unless every one of them landed.
 *
 * The CLI's exit code is not trusted: some failures exit 0, and a failed fetch
 * prunes the skill from disk and from the lock before exiting 1. So the lock is
 * snapshotted and restored on any failure, and the result is checked here.
 * Skills the failed sync pruned from disk stay pruned; run it again once the
 * cause is fixed.
 */
export const syncSkills = ({
  cwd,
  agents,
  entries,
  run = runSkills,
}: SyncOptions): void => {
  const lockPath = path.join(cwd, LOCK_FILE)
  const snapshot = existsSync(lockPath) ? readFileSync(lockPath) : undefined

  const restore = () => {
    if (snapshot) {
      writeFileSync(lockPath, snapshot)
    } else {
      rmSync(lockPath, { force: true })
    }
  }

  let result: SyncResult

  try {
    result = run({ args: syncArgs(agents), cwd, env: { ...SYNC_ENV } })
  } catch (error) {
    restore()
    throw error
  }

  const problems =
    result.exitCode === 0 ? verify({ cwd, agents, entries }) : undefined

  if (result.exitCode !== 0 || problems?.length) {
    restore()

    throw new Error(
      [
        result.exitCode !== 0
          ? `skills ${syncArgs(agents).join(' ')} exited with ${result.exitCode}.`
          : 'skills sync exited cleanly but did not install what was declared:',
        ...(problems ?? []).map((problem) => `  - ${problem}`),
        `${LOCK_FILE} was ${snapshot ? 'restored' : 'removed'}.`,
        ...(result.output ? ['', result.output] : []),
      ].join('\n'),
    )
  }
}

interface LockEntry {
  readonly ref?: string
  readonly via?: string
}

const verify = ({
  cwd,
  agents,
  entries,
}: Pick<SyncOptions, 'cwd' | 'agents' | 'entries'>): string[] => {
  const problems: string[] = []
  let locked: Record<string, LockEntry> = {}

  try {
    locked =
      JSON.parse(readFileSync(path.join(cwd, LOCK_FILE), 'utf8')).skills ?? {}
  } catch {
    problems.push(`${LOCK_FILE} is missing or is not valid JSON`)
  }

  const dirs = new Set([
    SHARED_SKILLS_DIR,
    ...agents.map((agent) => AGENT_SKILLS_DIRS[agent]),
  ])

  for (const { ref, skills } of entries) {
    for (const name of skills) {
      const entry = Object.hasOwn(locked, name) ? locked[name] : undefined

      if (entry === undefined) {
        problems.push(`"${name}" is not in ${LOCK_FILE}`)
      } else if (entry.via !== '.') {
        problems.push(
          `"${name}" in ${LOCK_FILE} is not managed by the skills field (via is ${JSON.stringify(entry.via)})`,
        )
      } else if (ref !== undefined && entry.ref !== ref) {
        problems.push(
          `"${name}" is locked at ${entry.ref}, not the declared ${ref}`,
        )
      }

      for (const dir of dirs) {
        if (!existsSync(path.join(cwd, dir, name))) {
          problems.push(`${dir}/${name} does not exist`)
        }
      }
    }
  }

  return problems
}
