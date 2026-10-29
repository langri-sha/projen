import defaults from '@langri-sha/eslint-config'

export default [
  ...defaults,
  {
    ignores: [
      '**/.*',
      '**/dist/',
      '**/cargo.ts',
      '**/dagger-module.ts',
      '**/dagger-workspace.ts',
      'packages/projen-changesets/src/config.ts',
      'packages/projen-claude/src/settings.ts',
      '**/pnpm-workspace.ts',
      '**/pyproject.ts',
      '**/renovate.ts',
      '**/ruff.ts',
      '**/rustfmt.ts',
      '**/swcrc.ts',
      '**/ty.ts',
      '**/uv.ts',
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
