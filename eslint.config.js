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
  {
    files: ['packages/*/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name="addDevDeps"]',
          message:
            'Call #addDefaultDevDeps instead, so a version the project declared for itself is not overwritten.',
        },
      ],
    },
  },
]
