<p align="center">
  <img src="docs/assets/projen.svg" width="220" alt="Projen sprouting from a stack of project boxes">
</p>

<h1 align="center">projen</h1>

<p align="center">
  Custom packages used to scaffold, configure and maintain repositories.
</p>

## Packages

| Package                                                                                        | Purpose                                              |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [projen-babel-config](https://www.npmjs.com/package/projen-babel-config)                       | `babel.config.js` generator                          |
| [projen-beachball](https://www.npmjs.com/package/projen-beachball)                             | `beachball.config.cjs` generator                     |
| [projen-cargo](https://www.npmjs.com/package/projen-cargo)                                     | Cargo workspace and crate generator                  |
| [projen-codeowners](https://www.npmjs.com/package/projen-codeowners)                           | `CODEOWNERS` generator                               |
| [projen-dagger](https://www.npmjs.com/package/projen-dagger)                                   | `dagger-module.toml` and `dagger.toml` generator     |
| [projen-editorconfig](https://www.npmjs.com/package/projen-editorconfig)                       | `.editorconfig` generator                            |
| [projen-eslint](https://www.npmjs.com/package/projen-eslint)                                   | `eslint.config.js` generator                         |
| [projen-github-templates](https://www.npmjs.com/package/projen-github-templates)               | `.github/` issue and pull request template generator |
| [projen-husky](https://www.npmjs.com/package/projen-husky)                                     | `.husky/*` Git hook generator                        |
| [projen-jest-config](https://www.npmjs.com/package/projen-jest-config)                         | `jest.config.js` generator                           |
| [projen-license](https://www.npmjs.com/package/projen-license)                                 | `license` file generator                             |
| [projen-lint-staged](https://www.npmjs.com/package/@langri-sha/projen-lint-staged)             | `lint-staged.config.js` generator                    |
| [projen-lint-synthesized](https://www.npmjs.com/package/@langri-sha/projen-lint-synthesized)   | Configures linters to run on synthesized files       |
| [projen-pnpm-workspace](https://www.npmjs.com/package/@langri-sha/projen-pnpm-workspace)       | `pnpm-workspace.yaml` generator                      |
| [projen-prettier](https://www.npmjs.com/package/@langri-sha/projen-prettier)                   | `prettier.config.js` generator                       |
| [projen-project](https://www.npmjs.com/package/@langri-sha/projen-project)                     | Meta-component bundling the rest                     |
| [projen-readme](https://www.npmjs.com/package/@langri-sha/projen-readme)                       | `readme.md` stub generator                           |
| [projen-renovate](https://www.npmjs.com/package/@langri-sha/projen-renovate)                   | `renovate.json5` generator                           |
| [projen-ruff](https://www.npmjs.com/package/@langri-sha/projen-ruff)                           | `ruff.toml` generator                                |
| [projen-skills](https://www.npmjs.com/package/@langri-sha/projen-skills)                       | Agent skills declaration and installer               |
| [projen-swcrc](https://www.npmjs.com/package/@langri-sha/projen-swcrc)                         | `.swcrc` generator                                   |
| [projen-ty](https://www.npmjs.com/package/@langri-sha/projen-ty)                               | `ty.toml` generator                                  |
| [projen-typescript-config](https://www.npmjs.com/package/@langri-sha/projen-typescript-config) | `tsconfig.json` generator                            |
| [projen-uv](https://www.npmjs.com/package/@langri-sha/projen-uv)                               | uv workspace and package generator                   |
| [projen-worktrunk](https://www.npmjs.com/package/@langri-sha/projen-worktrunk)                 | Worktrunk `.config/wt.toml` generator                |

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
