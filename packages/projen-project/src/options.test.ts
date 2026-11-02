import { expectTypeOf, test } from '@langri-sha/vitest'
import type { ProjectOptions as BaseProjectOptions } from 'projen'

import type { NodePackageOptions } from './lib/node-package.js'

import type { ProjectOptions } from './index.js'

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] }
type InheritedOptions = Omit<
  BaseProjectOptions,
  'renovatebot' | 'renovatebotOptions'
>
type PresetOptions = Omit<ProjectOptions, keyof InheritedOptions>

test('inherits exactly the supported projen fields', () => {
  expectTypeOf<
    Pick<ProjectOptions, keyof InheritedOptions>
  >().toEqualTypeOf<InheritedOptions>()
  expectTypeOf<
    Extract<keyof ProjectOptions, 'renovatebot' | 'renovatebotOptions'>
  >().toBeNever()
})

test('preserves writable preset options and package metadata', () => {
  expectTypeOf<PresetOptions>().toEqualTypeOf<Mutable<PresetOptions>>()
  expectTypeOf<ProjectOptions['package']>().toExtend<
    ({ copyrightYear?: string } & NodePackageOptions) | undefined
  >()
  expectTypeOf<NonNullable<ProjectOptions['package']>>()
    .pick<'copyrightYear'>()
    .toEqualTypeOf<{ copyrightYear?: string }>()
  expectTypeOf<
    NonNullable<NodePackageOptions['peerDependenciesMeta']>[string]
  >().toEqualTypeOf<{ optional?: boolean }>()
})
