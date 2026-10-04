# @langri-sha/projen-dagger

A [projen] component for [Dagger] workspaces.

It synthesizes each module's `dagger-module.toml` and, on request, the
workspace's `dagger.toml`. `dagger.lock` is left to the Dagger CLI, which may
update it on any command.

[`@langri-sha/projen-project`] reaches it through its `dagger` option, which
also points Renovate at the engine version and at module refs pinned to a GitHub
tag. Prefer that over constructing the component yourself.

## Usage

```sh
npm install -D projen @langri-sha/projen-dagger
```

```js
import { Project } from 'projen'
import { Dagger } from '@langri-sha/projen-dagger'

const project = new Project({
  name: 'my-modules',
})

const dagger = new Dagger(project, {
  engineVersion: 'v1.0.0-beta.15',
  modules: {
    terraform: {},
    'terraform/e2e': {
      dependencies: ['..'],
    },
  },
})

project.synth()
```

### Modules

Each entry under `modules` is keyed by the module directory and synthesizes a
`dagger-module.toml` there. The name defaults to the directory name, the runtime
to [Dang]. A dependency given as a string is its source ref:

```js
new Dagger(project, {
  engineVersion: 'v1.0.0-beta.15',
  modules: {
    ci: {
      runtime: 'go',
      dependencies: [
        '../terraform',
        {
          name: 'lint',
          source: 'github.com/langri-sha/dagger/eslint@eslint/v0.1.0',
        },
      ],
    },
  },
})
```

Call `dagger.addModule(directory, options)` to add one after construction.

A module may live under a dot-directory, such as `.dagger/modules/ci`. The
component re-includes `/.dagger` in `.gitignore`, which a deny-by-default `.*`
pattern would otherwise keep git from descending into, and leaves the patterns
the project has under it alone.

Only `dagger module init` and an SDK's generation write a module manifest, so
nothing rewrites a synthesized one as long as no SDK module manages its
directory. Dang modules need none.

#### Engine versions

`engineVersion` is declared once, in the projenrc, and written into every
manifest from there. Declaring a module without one is an error — the manifests
are generated, so there is nowhere else for the pin to live.

Renovate reads it out of the projenrc rather than out of the manifests, the same
way the preset tracks `minNodeVersion`. An upgrade is then one edit to one file,
and the post-upgrade job that runs `projen` on dependency PRs propagates it to
the manifests before the checks run.

It is the engine a module requires, not the one it runs on: the CLI starts its
own engine, and loads a module when the engine's base version is at least the
declared one's. Every 1.0 prerelease therefore loads a module declaring any
other, and pinning the CLI in CI is a separate concern.

#### Module refs

Through the preset, Renovate moves module refs pinned to a GitHub tag, such as
`github.com/langri-sha/dagger/terraform@terraform/v0.1.0`, wherever they are
written by hand: in the projenrc, and in a `dagger.toml` or `dagger-module.toml`
the component does not synthesize. A module in a monorepo moves along its own
tags only, `terraform/v*` here.

A ref without a version resolves to the latest release and is pinned in
`dagger.lock`, which only `dagger lock update` moves. Renovate cannot resolve a
vanity ref such as `dagger.io/js/eslint`; write the `github.com` form to have it
tracked.

### Workspace

Pass `workspace` to synthesize `dagger.toml`, written as given:

```js
new Dagger(project, {
  workspace: {
    modules: {
      ci: { source: '.dagger/modules/ci' },
      terraform: {
        source: 'github.com/langri-sha/dagger/terraform@terraform/v0.1.0',
        settings: { rootModule: 'terraform/web' },
      },
    },
  },
})
```

Leave it out to keep the file the CLI's: `dagger install`, `dagger settings` and
`dagger uninstall` edit it in place. They do the same to a synthesized one, and
the next synthesis reverts them, so once the projenrc declares the workspace it
is the only place to change it.

[`@langri-sha/projen-project`]:
  https://www.npmjs.com/package/@langri-sha/projen-project
[dang]: https://docs.dagger.io/reference/sdks/dang
[projen]: https://projen.io/
[dagger]: https://dagger.io/
