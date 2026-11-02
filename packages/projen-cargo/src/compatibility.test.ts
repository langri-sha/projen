import { expect, expectTypeOf, test } from '@langri-sha/vitest'

import type {
  CargoDenyOptions,
  CargoManifest,
  CargoManifestOptions,
  Package,
} from './index.js'

interface OriginalCargoManifestOptions extends Omit<CargoManifest, 'package'> {
  readonly package?: Partial<NonNullable<CargoManifest['package']>>
}

test('named manifest fields retain the original shape and mutability', () => {
  expectTypeOf<CargoManifestOptions>().toEqualTypeOf<OriginalCargoManifestOptions>()
  const options: CargoManifestOptions = {
    package: { version: '0.1.0' },
    workspace: { members: ['apps/api'] },
  }
  options.workspace = { members: ['apps/worker'] }
  options.workspace.members!.push('apps/cli')
  options.package!.version = '0.2.0'
  options.dependencies = { local: { path: './local' } }

  expect(options.workspace.members).toEqual(['apps/worker', 'apps/cli'])
  expect(options.package!.version).toBe('0.2.0')
})

test('manifest tables retain required selectors and raw package names', () => {
  expectTypeOf<{
    dependencies: { local: { features: string[] } }
  }>().not.toExtend<CargoManifestOptions>()
  expectTypeOf<{ version: string }>().not.toExtend<Package>()
  expectTypeOf<{
    package: { version: string }
  }>().toExtend<CargoManifestOptions>()
})

test('named deny sections preserve open tables and known value constraints', () => {
  const options: CargoDenyOptions = {
    graph: { targets: ['x86_64-unknown-linux-gnu'] },
    advisories: {
      ignore: [{ id: 'RUSTSEC-2026-0001', reason: 'Reviewed' }],
      yanked: 'deny',
      'db-path': '.advisory-db',
    },
    licenses: {
      allow: ['MIT'],
      exceptions: [{ name: 'example', allow: ['Apache-2.0'] }],
      confidence: 0.9,
    },
    bans: { 'multiple-versions': 'warn', wildcards: 'deny', unknown: true },
    sources: { 'allow-git': ['https://example.com/repo'] },
  }

  options.advisories!.ignore!.push('RUSTSEC-2026-0002')
  options.licenses!.allow!.push('BSD-3-Clause')

  expect(options.advisories!.ignore).toHaveLength(2)
  expect(options.licenses!.allow).toContain('BSD-3-Clause')
  expectTypeOf<{
    advisories: { yanked: 'disable' }
  }>().not.toExtend<CargoDenyOptions>()
  expectTypeOf<{
    licenses: { exceptions: { name: string }[] }
  }>().not.toExtend<CargoDenyOptions>()
})
