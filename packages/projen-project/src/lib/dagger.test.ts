import { expect, test } from '@langri-sha/vitest'

import { DAGGER_MODULES, deriveDaggerWorkspace } from './dagger'

test('derives the modules every project gets', () => {
  expect(deriveDaggerWorkspace({})).toEqual({
    ignore: ['**/node_modules', '**/dist', '**/*.tsbuildinfo'],
    modules: {
      ci: { source: DAGGER_MODULES.ci, generate: { skip: ['projen'] } },
      projen: { source: DAGGER_MODULES.projen },
    },
  })
})

test('derives a module for each enabled feature, in a fixed order', () => {
  const workspace = deriveDaggerWorkspace({
    beachball: true,
    eslint: true,
    prettier: true,
    typescript: true,
    vitest: true,
  })

  expect(Object.keys(workspace.modules ?? {})).toEqual([
    'eslint',
    'prettier',
    'ci',
    'projen',
    'typescript',
    'vitest',
    'beachball',
  ])
})

test('derives changesets instead of beachball', () => {
  const workspace = deriveDaggerWorkspace({ changesets: true })

  expect(Object.keys(workspace.modules ?? {})).toEqual([
    'ci',
    'projen',
    'changesets',
  ])
})

test('runs eslint and prettier with pnpm on a slim Node.js image', () => {
  const { modules } = deriveDaggerWorkspace({ eslint: true, prettier: true })

  expect(modules?.eslint).toEqual({
    source: 'dagger.io/js/eslint',
    settings: { packageManager: 'pnpm', baseImageAddress: 'node:24-slim' },
  })
  expect(modules?.prettier?.settings).toEqual(modules?.eslint?.settings)
})

test('pins every langri-sha module to a release tag', () => {
  for (const ref of Object.values(DAGGER_MODULES)) {
    expect(ref).toMatch(/^github\.com\/langri-sha\/dagger\/\w+@v\d+\.\d+\.\d+$/)
  }
})
