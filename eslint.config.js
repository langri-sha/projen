import defaults from '@langri-sha/eslint-config'

export default [
  ...defaults,
  {
    ignores: [
      '**/.*',
      '**/dist/',
      '**/pnpm-workspace.ts',
      '**/renovate.ts',
      '**/swcrc.ts',
      '!.projenrc.ts',
    ],
  },
]
