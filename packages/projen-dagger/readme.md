# @langri-sha/projen-dagger

A [projen] component for [Dagger] workspaces.

It synthesizes each module's `dagger-module.toml`.

[`@langri-sha/projen-project`] reaches it through its `dagger` option, which
also points Renovate at the engine version. Prefer that over constructing the
component yourself.

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

Nothing in the Dagger CLI rewrites a synthesized manifest as long as no SDK
scope covers its directory, and Dang modules run without one. An `is-module`
scope under `[sdks]` in `dagger.toml` changes that: `dagger generate` rewrites
the manifest, dropping the projen marker, and `dagger check` fails the SDK's
staleness check on it. `dagger workspace migrate` adds such a scope for every
local module it finds, and `dagger module migrate` for the one it is given, even
when there is nothing to migrate.

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

[`@langri-sha/projen-project`]:
  https://www.npmjs.com/package/@langri-sha/projen-project
[dang]: https://docs.dagger.io/reference/sdks/dang
[projen]: https://projen.io/
[dagger]: https://dagger.io/
