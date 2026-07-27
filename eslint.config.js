import defaults from '@langri-sha/eslint-config'

export default [
  ...defaults,
  {
    ignores: [
      '**/.*',
      '**/dist/',
      '**/pnpm-workspace.d.ts',
      '**/renovate.d.ts',
      '**/swcrc.d.ts',
      '!.projenrc.ts',
    ],
  },
]
