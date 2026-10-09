# @langri-sha/projen-project

Collection of [projen] templates for bootstraping monorepos and workspace
projects.

## Features

- managing [Beachball] configuration for publishing packages
- configures [PNPM] [workspaces]
- configures [Cargo] workspaces with [`@langri-sha/projen-cargo`]
- configures [Dagger] modules with [`@langri-sha/projen-dagger`]
- configures [uv] workspaces with [`@langri-sha/projen-uv`]
- configures [Ruff] with [`@langri-sha/projen-ruff`]
- configures [ty] with [`@langri-sha/projen-ty`]
- configures [`@langri-sha/tsconfig`] for TypeScript monorepos
- managing Git hooks with [`@langri-sha/projen-husky`]
- configures extensive list of Git ignore patterns
- manages [code owners] with [`@langri-sha/projen-codeowners`]
- configures [Worktrunk] worktree hooks with [`@langri-sha/projen-worktrunk`]

## Worktrunk

Given a `worktrunk` option, the preset supplies a `pre-start` pipeline that
prepares each new worktree:

1. `sync` fetches the default branch and fast-forwards the new branch to it. It
   is skipped without a remote, for a branch created from another base, and for
   a worktree on an existing branch.
2. Once `sync` succeeds, `env` copies each tracked `.env.example` to a `.env`
   that is missing, alongside a command per toolchain that installs its
   dependencies from the lockfile: one named after the package manager (`pnpm`,
   `npm`, `yarn` or `bun`) for `package`, `cargo` for `cargo` and `uv` for `uv`,
   workspace members included.

The preset's `.gitignore` re-includes `.env.example`, which its deny-by-default
`.*` would otherwise hide. A step that fails stops the pipeline, so when `sync`
fails, for example offline, `env` and the installs do not run until
`wt hook pre-start` runs them.

A toolchain gets a command only when the root project configures it, so a crate
or a Python package in a subproject outside of a workspace gets none. The
`cargo` and `uv` commands fail rather than create or update a lockfile, so a
project commits `Cargo.lock` and `uv.lock` first.

A `pre-start` in `worktrunk.config`, in any form, replaces the pipeline whole,
while hooks for other events are written as given:

```ts
import { Project } from '@langri-sha/projen-project'

new Project({
  name: 'my-project',
  worktrunk: {
    config: { 'pre-start': { install: 'pnpm install --frozen-lockfile' } },
  },
})
```

To add to the pipeline instead, append a step, which runs once the steps before
it succeed: `project.worktrunk?.addStep('pre-start', { build: 'pnpm build' })`.
The event is already taken, so `addHook('pre-start', ...)` throws.

Worktrunk asks each teammate to approve a project's commands before it first
runs them, so no default runs unseen. It remembers approval by the exact text of
a command.

[`@langri-sha/projen-cargo`]:
  https://www.npmjs.com/package/@langri-sha/projen-cargo
[`@langri-sha/projen-codeowners`]:
  https://www.npmjs.com/package/@langri-sha/projen-codeowners
[`@langri-sha/projen-dagger`]:
  https://www.npmjs.com/package/@langri-sha/projen-dagger
[`@langri-sha/projen-husky`]:
  https://www.npmjs.com/package/@langri-sha/projen-husky
[`@langri-sha/projen-ruff`]:
  https://www.npmjs.com/package/@langri-sha/projen-ruff
[`@langri-sha/projen-ty`]: https://www.npmjs.com/package/@langri-sha/projen-ty
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
[ruff]: https://docs.astral.sh/ruff/
[ty]: https://docs.astral.sh/ty/
[uv]: https://docs.astral.sh/uv/
[workspaces]: https://pnpm.io/workspaces
[worktrunk]: https://worktrunk.dev
