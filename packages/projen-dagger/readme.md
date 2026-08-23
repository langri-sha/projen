# @langri-sha/projen-dagger

A [projen] component for [Dagger] TypeScript module repositories.

It adds the `dagger:develop` and `check:types` tasks, ignores the SDK output the
Dagger CLI generates, and synthesizes a workflow that regenerates every module
against its pinned engine and fails on drift.

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

const dagger = new Dagger(project)

project.synth()
```

Modules live in top-level directories, each with its own `dagger.json`.

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
