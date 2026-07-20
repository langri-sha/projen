# projen

Custom packages used to scaffold, configure and maintain repositories.

## Packages

| Package                                 | Purpose                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `@langri-sha/eslint-config`             | Shared ESLint flat config (TypeScript, React, import ordering, JSDoc, Unicorn, Prettier) |
| `@langri-sha/lint-staged`               | `lint-staged` config running ESLint and Prettier on pre-commit, respecting ignored files |
| `@langri-sha/prettier`                  | Opinionated, shared Prettier configuration                                               |
| `@langri-sha/projen-babel`              | `babel.config.js` generator                                                              |
| `@langri-sha/projen-beachball`          | `beachball.config.cjs` generator                                                         |
| `@langri-sha/projen-codeowners`         | `CODEOWNERS` generator                                                                   |
| `@langri-sha/projen-editorconfig`       | `.editorconfig` generator                                                                |
| `@langri-sha/projen-eslint`             | `eslint.config.js` generator                                                             |
| `@langri-sha/projen-husky`              | `.husky/*` Git hook generator                                                            |
| `@langri-sha/projen-jest-config`        | `jest.config.js` generator                                                               |
| `@langri-sha/projen-license`            | `license` file generator                                                                 |
| `@langri-sha/projen-lint-staged`        | `lint-staged.config.js` generator                                                        |
| `@langri-sha/projen-lint-synthesized`   | Configures linters to run on synthesized files                                           |
| `@langri-sha/projen-pnpm-workspace`     | `pnpm-workspace.yaml` generator                                                          |
| `@langri-sha/projen-prettier`           | `prettier.config.js` generator                                                           |
| `@langri-sha/projen-project`            | Meta-component bundling the rest                                                         |
| `@langri-sha/projen-readme`             | `readme.md` stub generator                                                               |
| `@langri-sha/projen-renovate`           | `renovate.json5` generator                                                               |
| `@langri-sha/projen-swcrc`              | `.swcrc` generator                                                                       |
| `@langri-sha/projen-typescript-config`  | `tsconfig.json` generator                                                                |
| `@langri-sha/schemastore-to-typescript` | CLI/library that compiles JSON Schema Store schemas to TypeScript typings                |
| `@langri-sha/tsconfig`                  | Shared TypeScript configs (`base`, `build`, `project`, and more)                         |
| `@langri-sha/vitest`                    | Helpers commonly used for authoring Vitest tests                                         |

## Development

```sh
pnpm install
npx projen                       # synth from .projenrc.ts
pnpm exec vitest run             # tests
pnpm -r --if-present prepublishOnly  # tsc-build
```

See [AGENTS.md](./AGENTS.md) for orientation, release flow, and provenance.

## License

MIT — see [license](./license).
