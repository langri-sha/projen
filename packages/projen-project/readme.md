# @langri-sha/projen-project

Collection of [projen] templates for bootstraping monorepos and workspace
projects.

## Features

- managing [Beacbhall] configuration for publishing packages
- configures [PNPM] [workspaces]
- configures [Cargo] workspaces with [`@langri-sha/projen-cargo`]
- configures [Dagger] modules with [`@langri-sha/projen-dagger`]
- configures [uv] workspaces with [`@langri-sha/projen-uv`]
- configures [`@langri-sha/tsconfig`] for TypeScript monorepos
- managing Git hooks with [`@langri-sha/projen-husky`]
- configures extensive list of Git ignore patterns
- manages [code owners] with [`@langri-sha/projen-codeowners`]
- configures [Worktrunk] worktree hooks with [`@langri-sha/projen-worktrunk`]

[`@langri-sha/codeowners`]: https://www.npmjs.com/package/@langri-sha/codeowners
[`@langri-sha/projen-cargo`]:
  https://www.npmjs.com/package/@langri-sha/projen-cargo
[`@langri-sha/projen-dagger`]:
  https://www.npmjs.com/package/@langri-sha/projen-dagger
[`@langri-sha/projen-husky`]:
  https://www.npmjs.com/package/@langri-sha/projen-husky
[`@langri-sha/projen-uv`]: https://www.npmjs.com/package/@langri-sha/projen-uv
[`@langri-sha/projen-worktrunk`]:
  https://www.npmjs.com/package/@langri-sha/projen-worktrunk
[`@langri-sha/tsconfig`]: https://www.npmjs.com/package/@langri-sha/tsconfig
[beachball]: https://microsoft.github.io/beachball/
[cargo]: https://doc.rust-lang.org/cargo/
[code owners]:
  https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
[dagger]: https://dagger.io/
[pnpm]: https://pnpm.io
[projen]: https://projen.io/
[uv]: https://docs.astral.sh/uv/
[workspaces]: https://pnpm.io/workspaces
[worktrunk]: https://worktrunk.dev
