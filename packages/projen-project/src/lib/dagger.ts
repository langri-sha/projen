import { existsSync, readFileSync, readdirSync } from 'node:fs'
import * as path from 'node:path'

import type {
  DaggerWorkspaceConfig,
  DaggerWorkspaceModule,
} from 'projen-dagger'

/**
 * The langri-sha/dagger modules the derived workspace installs. Renovate bumps
 * the refs, and a project gets them through the next release of the preset.
 */
export const DAGGER_MODULES = {
  actionlint: 'github.com/langri-sha/dagger/actionlint@v2.4.1',
  beachball: 'github.com/langri-sha/dagger/beachball@v2.4.1',
  changesets: 'github.com/langri-sha/dagger/changesets@v2.4.1',
  ci: 'github.com/langri-sha/dagger/ci@v2.4.1',
  projen: 'github.com/langri-sha/dagger/projen@v2.4.1',
  typescript: 'github.com/langri-sha/dagger/typescript@v2.4.1',
  vitest: 'github.com/langri-sha/dagger/vitest@v2.4.1',
} as const

/**
 * What a project enables that has a Dagger module.
 */
export interface DaggerWorkspaceFeatures {
  readonly actionlint?: boolean
  readonly beachball?: boolean
  readonly changesets?: boolean
  readonly eslint?: boolean
  readonly prettier?: boolean
  readonly typescript?: boolean
  readonly vitest?: boolean
}

/**
 * Overrides for the derived workspace. A module that is `null` is dropped.
 */
export type DaggerWorkspaceOverrides = Omit<
  DaggerWorkspaceConfig,
  'modules'
> & {
  modules?: Record<string, DaggerWorkspaceModule | null>
}

const node = () => ({
  packageManager: 'pnpm',
  baseImageAddress: 'node:24-slim',
})

/**
 * `dagger.toml` for the modules a project's features call for.
 */
export const deriveDaggerWorkspace = ({
  actionlint,
  beachball,
  changesets,
  eslint,
  prettier,
  typescript,
  vitest,
}: DaggerWorkspaceFeatures): DaggerWorkspaceConfig => ({
  ignore: ['**/node_modules', '**/dist', '**/*.tsbuildinfo'],
  modules: {
    ...(eslint && {
      eslint: { source: 'dagger.io/js/eslint', settings: node() },
    }),
    ...(prettier && {
      prettier: { source: 'dagger.io/js/prettier', settings: node() },
    }),
    ci: { source: DAGGER_MODULES.ci, generate: { skip: ['projen'] } },
    projen: { source: DAGGER_MODULES.projen },
    ...(typescript && { typescript: { source: DAGGER_MODULES.typescript } }),
    ...(vitest && { vitest: { source: DAGGER_MODULES.vitest } }),
    ...(beachball && { beachball: { source: DAGGER_MODULES.beachball } }),
    ...(changesets && { changesets: { source: DAGGER_MODULES.changesets } }),
    ...(actionlint && { actionlint: { source: DAGGER_MODULES.actionlint } }),
  },
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const merge = (base: unknown, override: unknown): unknown => {
  if (!isRecord(base) || !isRecord(override)) {
    return override
  }

  const merged = { ...base }

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      merged[key] = merge(base[key], value)
    }
  }

  return merged
}

/**
 * Merges overrides into the derived workspace. Objects merge key by key and
 * arrays are replaced, except for `ignore`, which adds to the derived
 * patterns. A `null` module is dropped, and modules the derived set lacks
 * follow it. A module needs a source, from the derived set or the override.
 */
export const mergeDaggerWorkspace = (
  derived: DaggerWorkspaceConfig,
  { ignore = [], modules = {}, ...rest }: DaggerWorkspaceOverrides = {},
): DaggerWorkspaceConfig => {
  const merged: Record<string, DaggerWorkspaceModule> = {
    ...derived.modules,
  }

  for (const [name, override] of Object.entries(modules)) {
    if (override === null) {
      delete merged[name]
    } else {
      const module = merge(merged[name], override) as DaggerWorkspaceModule

      if (!module.source) {
        throw new Error(
          `The Dagger module "${name}" has no source. Name one in \`dagger.workspace\`, or set the module to null to drop it.`,
        )
      }

      merged[name] = module
    }
  }

  return merge(
    {
      ...derived,
      ignore: [...new Set([...(derived.ignore ?? []), ...ignore])],
      modules: merged,
    },
    rest,
  ) as DaggerWorkspaceConfig
}

/**
 * Whether a project directory has GitHub workflows to lint.
 */
export const hasGitHubWorkflows = (directory: string): boolean => {
  try {
    return readdirSync(path.join(directory, '.github', 'workflows')).some(
      (file) => /\.ya?ml$/.test(file),
    )
  } catch {
    return false
  }
}

/**
 * Throws when a project directory has a `dagger.toml` that projen does not
 * write: one `.projen/files.json` doesn't list, as that of a project that
 * keeps it by hand. Synthesis would replace it with the derived workspace and
 * lose what it has beyond that.
 */
export const assertDaggerWorkspaceIsGenerated = (directory: string): void => {
  if (!existsSync(path.join(directory, 'dagger.toml'))) {
    return
  }

  let generated: unknown

  try {
    generated = JSON.parse(
      readFileSync(path.join(directory, '.projen', 'files.json'), 'utf8'),
    ).files
  } catch {
    generated = undefined
  }

  if (Array.isArray(generated) && generated.includes('dagger.toml')) {
    return
  }

  throw new Error(
    'Refusing to overwrite dagger.toml, which projen did not write. Move what it has beyond the derived modules into `dagger.workspace`, and delete the file.',
  )
}
