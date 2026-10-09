import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import * as path from 'node:path'

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from '@langri-sha/vitest'

import {
  LOCK_FILE,
  type SyncInvocation,
  type SyncRunner,
  syncArgs,
  syncSkills,
} from './sync'

const SHA = '0b8fb22aaa7f82447d4befe1b6a95d30a5b279b8'
const entries = [
  { source: 'vercel-labs/skills', ref: SHA, skills: ['find-skills'] },
]
const agents = ['claude-code']

let cwd: string

beforeEach(() => {
  cwd = mkdtempSync(path.join(tmpdir(), 'projen-skills-'))
})

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true })
})

const lock = (skills: Record<string, unknown>) =>
  JSON.stringify({ version: 1, skills })

const lockOf = (overrides: Record<string, unknown> = {}) =>
  lock({
    'find-skills': {
      source: 'vercel-labs/skills',
      ref: SHA,
      via: '.',
      ...overrides,
    },
  })

/** Do what the CLI does on success. */
const install: SyncRunner = ({ cwd }) => {
  mkdirSync(path.join(cwd, '.agents/skills/find-skills'), { recursive: true })
  mkdirSync(path.join(cwd, '.claude/skills'), { recursive: true })
  symlinkSync(
    '../../.agents/skills/find-skills',
    path.join(cwd, '.claude/skills/find-skills'),
  )
  writeFileSync(path.join(cwd, LOCK_FILE), lockOf())

  return { exitCode: 0, output: '' }
}

const sync = (
  run: SyncRunner,
  overrides: Partial<Parameters<typeof syncSkills>[0]> = {},
) => syncSkills({ cwd, agents, entries, run, ...overrides })

test('runs sync non-interactively for the named agents', () => {
  const run =
    vi.fn<(invocation: SyncInvocation) => ReturnType<SyncRunner>>(install)

  sync(run, { agents: ['claude-code', 'cursor'] })

  expect(run).toHaveBeenCalledWith({
    args: ['experimental_sync', '-a', 'claude-code', 'cursor', '-y'],
    cwd,
    env: { DISABLE_TELEMETRY: '1', LC_ALL: 'C' },
  })
})

test('never calls experimental_install', () => {
  expect(syncArgs(['claude-code'])).not.toContain('experimental_install')
})

test('accepts a sync that installed everything', () => {
  expect(() => sync(install)).not.toThrow()
  expect(readFileSync(path.join(cwd, LOCK_FILE), 'utf8')).toBe(lockOf())
})

describe('on failure', () => {
  const before = lock({ other: { via: '.' } })

  beforeEach(() => {
    writeFileSync(path.join(cwd, LOCK_FILE), before)
  })

  test('restores the lock when the CLI exits non-zero', () => {
    const run: SyncRunner = ({ cwd }) => {
      writeFileSync(path.join(cwd, LOCK_FILE), lock({}))

      return { exitCode: 1, output: 'could not fetch ref' }
    }

    expect(() => sync(run)).toThrow(
      /exited with 1\.\nskills-lock.json was restored\.\n\ncould not fetch ref/,
    )
    expect(readFileSync(path.join(cwd, LOCK_FILE), 'utf8')).toBe(before)
  })

  test('restores the lock when the runner throws', () => {
    const run: SyncRunner = ({ cwd }) => {
      writeFileSync(path.join(cwd, LOCK_FILE), lock({}))

      throw new Error('spawn failed')
    }

    expect(() => sync(run)).toThrow('spawn failed')
    expect(readFileSync(path.join(cwd, LOCK_FILE), 'utf8')).toBe(before)
  })

  test('removes a lock that did not exist before', () => {
    rmSync(path.join(cwd, LOCK_FILE))

    expect(() => sync(() => ({ exitCode: 1, output: '' }))).toThrow()
    expect(existsSync(path.join(cwd, LOCK_FILE))).toBe(false)
  })
})

describe('verification', () => {
  const restoredFrom = (run: SyncRunner) => {
    writeFileSync(path.join(cwd, LOCK_FILE), '{"before":true}')

    let message = ''

    try {
      sync(run)
    } catch (error) {
      message = (error as Error).message
    }

    expect(readFileSync(path.join(cwd, LOCK_FILE), 'utf8')).toBe(
      '{"before":true}',
    )

    return message
  }

  test('catches a skill missing from the lock, despite exit 0', () => {
    expect(
      restoredFrom((invocation) => {
        install(invocation)
        writeFileSync(path.join(cwd, LOCK_FILE), lock({}))

        return { exitCode: 0, output: '' }
      }),
    ).toContain('"find-skills" is not in skills-lock.json')
  })

  test('catches a skill whose via was stripped', () => {
    expect(
      restoredFrom((invocation) => {
        install(invocation)
        writeFileSync(path.join(cwd, LOCK_FILE), lockOf({ via: undefined }))

        return { exitCode: 0, output: '' }
      }),
    ).toContain('is not managed by the skills field (via is undefined)')
  })

  test('catches a lock at another ref', () => {
    expect(
      restoredFrom((invocation) => {
        install(invocation)
        writeFileSync(
          path.join(cwd, LOCK_FILE),
          lockOf({ ref: 'f'.repeat(40) }),
        )

        return { exitCode: 0, output: '' }
      }),
    ).toContain(`locked at ${'f'.repeat(40)}, not the declared ${SHA}`)
  })

  test('catches a skill missing from disk', () => {
    expect(
      restoredFrom(() => {
        writeFileSync(path.join(cwd, LOCK_FILE), lockOf())

        return { exitCode: 0, output: 'Nothing to sync' }
      }),
    ).toMatch(
      /\.agents\/skills\/find-skills does not exist\n.*\.claude\/skills\/find-skills does not exist/s,
    )
  })

  test('catches a dangling link in the agent folder', () => {
    expect(
      restoredFrom((invocation) => {
        install(invocation)
        rmSync(path.join(cwd, '.agents/skills/find-skills'), {
          recursive: true,
        })

        return { exitCode: 0, output: '' }
      }),
    ).toContain('.claude/skills/find-skills does not exist')
  })

  test('catches a missing lock', () => {
    rmSync(path.join(cwd, LOCK_FILE), { force: true })

    expect(() =>
      sync(() => {
        mkdirSync(path.join(cwd, '.agents/skills/find-skills'), {
          recursive: true,
        })

        return { exitCode: 0, output: '' }
      }),
    ).toThrow(/skills-lock.json is missing or is not valid JSON/)
    expect(existsSync(path.join(cwd, LOCK_FILE))).toBe(false)
  })
})
