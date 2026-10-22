# @langri-sha/projen-project

Collection of [projen] templates for bootstraping monorepos and workspace
projects.

## Features

- managing [Beachball] configuration for publishing packages
- configures [PNPM] [workspaces]
- configures [Cargo] workspaces with [`projen-cargo`]
- configures [Dagger] modules with [`projen-dagger`]
- configures [uv] workspaces with [`projen-uv`]
- configures [Ruff] with [`projen-ruff`]
- configures [ty] with [`projen-ty`]
- configures [`@langri-sha/tsconfig`] for TypeScript monorepos
- managing Git hooks with [`projen-husky`]
- configures extensive list of Git ignore patterns
- manages [code owners] with [`projen-codeowners`]
- configures [Worktrunk] worktree hooks with [`projen-worktrunk`]
- shares [Claude Code] settings with [`projen-claude`]
- declares and installs agent [skills] with [`projen-skills`]

## Claude Code

Given a `claude` option, the preset writes `.claude/settings.json` through
[`projen-claude`]. Root projects only: Claude Code reads the file from the
directory it is started in, so a session started in a subproject does not see
it, and such a subproject wants a `Claude` component of its own. The preset adds
no settings of its own: permissions, model and attribution are yours to declare.

```ts
new Project({
  name: 'my-project',
  claude: {
    settings: {
      permissions: { deny: ['Read(./.env)'] },
    },
  },
})
```

Add to it afterwards with `project.claude?.addAllow('Bash(pnpm test:*)')` and
the other methods the component has.

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

## Upgrading projen

The preset supplies the projen version a project runs on, unless the project
declares its own. An upgrade of the preset can supply a new one, which the first
synthesis only installs after rendering the files with the version already
loaded. When installing moves projen, the preset synthesizes once more with the
installed version, so a single `pnpm exec projen` leaves files that the next
synthesis keeps.

## Release age

The preset exempts nothing from pnpm's `minimumReleaseAge`. A project that
trusts the preset's releases can exempt the preset and the `projen-` components
it depends on by spreading `Project.presetPackages`, which follows the
components as they are added or renamed:

```ts
import { Project } from '@langri-sha/projen-project'

new Project({
  name: 'my-project',
  pnpmWorkspace: {
    minimumReleaseAgeExclude: [...Project.presetPackages],
  },
})
```

[`projen-cargo`]: https://www.npmjs.com/package/projen-cargo
[`projen-claude`]: https://www.npmjs.com/package/projen-claude
[`projen-codeowners`]: https://www.npmjs.com/package/projen-codeowners
[`projen-dagger`]: https://www.npmjs.com/package/projen-dagger
[`projen-husky`]: https://www.npmjs.com/package/projen-husky
[`projen-ruff`]: https://www.npmjs.com/package/projen-ruff
[`projen-skills`]: https://www.npmjs.com/package/projen-skills
[`projen-ty`]: https://www.npmjs.com/package/projen-ty
[`projen-uv`]: https://www.npmjs.com/package/projen-uv
[`projen-worktrunk`]: https://www.npmjs.com/package/projen-worktrunk
[`@langri-sha/tsconfig`]: https://www.npmjs.com/package/@langri-sha/tsconfig
[beachball]: https://microsoft.github.io/beachball/
[cargo]: https://doc.rust-lang.org/cargo/
[claude code]: https://code.claude.com/docs/en/settings
[code owners]:
  https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
[dagger]: https://dagger.io/
[pnpm]: https://pnpm.io
[projen]: https://projen.io/
[ruff]: https://docs.astral.sh/ruff/
[skills]: https://skills.sh
[ty]: https://docs.astral.sh/ty/
[uv]: https://docs.astral.sh/uv/
[workspaces]: https://pnpm.io/workspaces
[worktrunk]: https://worktrunk.dev
