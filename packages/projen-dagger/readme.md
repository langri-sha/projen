# @langri-sha/projen-dagger

A [projen] component for [Dagger] TypeScript module repositories.

It synthesizes each module's `dagger.json`, adds the `dagger:develop` and
`check:types` tasks, ignores the SDK output the Dagger CLI generates, and
synthesizes a workflow that regenerates every module against its pinned engine
and fails on drift.

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
  engineVersion: 'v0.21.7',
  modules: {
    tailscale: {},
    paperclip: {
      dependencies: ['../tailscale'],
    },
  },
})

project.synth()
```

Modules live in top-level directories, each with its own `dagger.json`.

### Modules

Each entry under `modules` is keyed by the module directory and synthesizes a
`dagger.json` there. The name defaults to the directory, the SDK to
`typescript`. A dependency given as a string is its source ref, named after the
last path segment the way `dagger install` records it:

```js
new Dagger(project, {
  engineVersion: 'v0.21.7',
  modules: {
    'hermes-workspace': {
      dependencies: [
        '../tigerfs',
        '../hermes',
        { name: 'net', source: '../tailscale' },
      ],
    },
  },
})
```

Call `dagger.addModule(directory, options)` to add one after construction.

Manifests are written in the field order and formatting the Dagger CLI marshals,
without the projen marker, so `dagger develop` reads them back and leaves them
untouched.

#### Engine versions

`engineVersion` is declared once, in the projenrc, and written into every
manifest from there. Declaring a module without one is an error — the manifests
are generated, so there is nowhere else for the pin to live.

Keep it ahead of, or equal to, the engine you develop against locally. The CLI
stamps the version it ran into `dagger.json`, so an older pin and a newer local
engine leave synthesis and `dagger develop` rewriting the field past each other.

### Renovate

The component exposes the configuration that keeps `dagger.json` engine versions
moving, one release at a time, without letting Renovate fight the module
manifests the SDK writes. Spread it into your Renovate options:

```js
import { Renovate } from '@langri-sha/projen-renovate'

new Renovate(project, {
  customManagers: [...dagger.customManagers],
  packageRules: [...dagger.packageRules],
})
```

[projen]: https://projen.io/
[dagger]: https://dagger.io/
