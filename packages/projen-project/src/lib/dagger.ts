import type { DaggerWorkspaceConfig } from 'projen-dagger'

/**
 * The langri-sha/dagger modules the derived workspace installs. Renovate bumps
 * the refs, and a project gets them through the next release of the preset.
 */
export const DAGGER_MODULES = {
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
  readonly beachball?: boolean
  readonly changesets?: boolean
  readonly eslint?: boolean
  readonly prettier?: boolean
  readonly typescript?: boolean
  readonly vitest?: boolean
}

const node = () => ({
  packageManager: 'pnpm',
  baseImageAddress: 'node:24-slim',
})

/**
 * `dagger.toml` for the modules a project's features call for.
 */
export const deriveDaggerWorkspace = ({
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
  },
})
