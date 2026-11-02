import { expect, expectTypeOf, test } from '@langri-sha/vitest'

import type { CargoManifest, CargoManifestOptions, Package } from './index.js'

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
