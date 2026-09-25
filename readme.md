<p align="center">
  <img src="docs/assets/projen.svg" width="220" alt="Projen sprouting from a stack of project boxes">
</p>

<h1 align="center">projen</h1>

<p align="center">
  Custom packages used to scaffold, configure and maintain repositories.
</p>

## Packages

| Package                                                                                        | Purpose                                                                                  |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [babel-preset](https://www.npmjs.com/package/@langri-sha/babel-preset)                         | Babel preset targeting modern runtimes, with TypeScript, React and Emotion               |
| [babel-test](https://www.npmjs.com/package/@langri-sha/babel-test)                             | Helpers for inspecting and testing a Babel preset's resolved plugins                     |
| [eslint-config](https://www.npmjs.com/package/@langri-sha/eslint-config)                       | Shared ESLint flat config (TypeScript, React, import ordering, JSDoc, Unicorn, Prettier) |
| [jest-config](https://www.npmjs.com/package/@langri-sha/jest-config)                           | Basic, reusable Jest configuration                                                       |
| [jest-test](https://www.npmjs.com/package/@langri-sha/jest-test)                               | Helpers commonly used for authoring Jest tests                                           |
| [lint-staged](https://www.npmjs.com/package/@langri-sha/lint-staged)                           | `lint-staged` config running ESLint and Prettier on pre-commit, respecting ignored files |
| [monorepo](https://www.npmjs.com/package/@langri-sha/monorepo)                                 | Resolves paths relative to the workspace root                                            |
| [prettier](https://www.npmjs.com/package/@langri-sha/prettier)                                 | Opinionated, shared Prettier configuration                                               |
| [projen-babel](https://www.npmjs.com/package/@langri-sha/projen-babel)                         | `babel.config.js` generator                                                              |
| [projen-beachball](https://www.npmjs.com/package/@langri-sha/projen-beachball)                 | `beachball.config.cjs` generator                                                         |
| [projen-cargo](https://www.npmjs.com/package/@langri-sha/projen-cargo)                         | Cargo workspace and crate generator                                                      |
| [projen-codeowners](https://www.npmjs.com/package/@langri-sha/projen-codeowners)               | `CODEOWNERS` generator                                                                   |
| [projen-dagger](https://www.npmjs.com/package/@langri-sha/projen-dagger)                       | Dagger module tasks, CI workflow and Renovate rules                                      |
| [projen-editorconfig](https://www.npmjs.com/package/@langri-sha/projen-editorconfig)           | `.editorconfig` generator                                                                |
| [projen-eslint](https://www.npmjs.com/package/@langri-sha/projen-eslint)                       | `eslint.config.js` generator                                                             |
| [projen-husky](https://www.npmjs.com/package/@langri-sha/projen-husky)                         | `.husky/*` Git hook generator                                                            |
| [projen-jest-config](https://www.npmjs.com/package/@langri-sha/projen-jest-config)             | `jest.config.js` generator                                                               |
| [projen-license](https://www.npmjs.com/package/@langri-sha/projen-license)                     | `license` file generator                                                                 |
| [projen-lint-staged](https://www.npmjs.com/package/@langri-sha/projen-lint-staged)             | `lint-staged.config.js` generator                                                        |
| [projen-lint-synthesized](https://www.npmjs.com/package/@langri-sha/projen-lint-synthesized)   | Configures linters to run on synthesized files                                           |
| [projen-pnpm-workspace](https://www.npmjs.com/package/@langri-sha/projen-pnpm-workspace)       | `pnpm-workspace.yaml` generator                                                          |
| [projen-prettier](https://www.npmjs.com/package/@langri-sha/projen-prettier)                   | `prettier.config.js` generator                                                           |
| [projen-project](https://www.npmjs.com/package/@langri-sha/projen-project)                     | Meta-component bundling the rest                                                         |
| [projen-readme](https://www.npmjs.com/package/@langri-sha/projen-readme)                       | `readme.md` stub generator                                                               |
| [projen-renovate](https://www.npmjs.com/package/@langri-sha/projen-renovate)                   | `renovate.json5` generator                                                               |
| [projen-swcrc](https://www.npmjs.com/package/@langri-sha/projen-swcrc)                         | `.swcrc` generator                                                                       |
| [projen-typescript-config](https://www.npmjs.com/package/@langri-sha/projen-typescript-config) | `tsconfig.json` generator                                                                |
| [projen-uv](https://www.npmjs.com/package/@langri-sha/projen-uv)                               | uv workspace and package generator                                                       |
| [tsconfig](https://www.npmjs.com/package/@langri-sha/tsconfig)                                 | Shared TypeScript configs (`base`, `build`, `project`, and more)                         |
| [vitest](https://www.npmjs.com/package/@langri-sha/vitest)                                     | Helpers commonly used for authoring Vitest tests                                         |
| [webpack](https://www.npmjs.com/package/@langri-sha/webpack)                                   | Aggregated Webpack plugins and loaders, with shared resolve settings                     |

## Development

```sh
pnpm install
pnpm exec projen                 # synth from .projenrc.ts
pnpm exec vitest run             # tests
pnpm -r --if-present prepublishOnly  # tsc-build
```

See [AGENTS.md](./AGENTS.md) for orientation, release flow, and provenance.

## License

MIT — see [license](./license).
