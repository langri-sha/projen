import { expect, expectTypeOf, test } from '@langri-sha/vitest'

import type { WorktrunkConfig, WorktrunkOptions } from './index.js'

test('readonly hook pipelines and exclusions retain their strict types', () => {
  const steps = [{ install: 'pnpm install' }, { test: 'pnpm test' }] as const
  const options: WorktrunkOptions = {
    config: {
      'pre-start': steps,
      aliases: { check: steps },
      step: { 'copy-ignored': { exclude: ['node_modules'] as const } },
    },
  }

  expect(options.config!['pre-start']).toBe(steps)
  expect(options.config!.aliases!.check).toBe(steps)
  expectTypeOf<{
    aliases: { check: readonly number[] }
  }>().not.toExtend<WorktrunkConfig>()
  expectTypeOf<{
    step: { 'copy-ignored': { exclude: readonly number[] } }
  }>().not.toExtend<WorktrunkConfig>()
  expectTypeOf<{
    forge: { platform: 'unknown' }
  }>().not.toExtend<WorktrunkConfig>()
})
