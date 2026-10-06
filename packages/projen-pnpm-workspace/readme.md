# @langri-sha/projen-pnpm-workspace

A [projen] component for maintaining a [pnpm workspace].

## Usage

Install dependencies:

```sh
npm install -D projen @langri-sha/projen-pnpm-workspace
```

Then, create a `PnpmWorkspace` component for your project:

```js
import { Project } from 'projen'
import { PnpmWorkspace } from '@langri-sha/projen-pnpm-workspace'

const project = new Project({
  name: 'my-project',
})

new PnpmWorkspace(project, {
  packages: ['packages/*'],
  allowBuilds: {
    esbuild: true,
  },
})

project.synth()
```

Every setting [`pnpm-workspace.yaml`] accepts is an option, and `filename`
renames the file. The packages of subprojects that have a `NodePackage` are
added to `packages` for you, as a `dir/*` glob where siblings share a directory,
and the list comes out sorted and deduplicated.

[`pnpm-workspace.yaml`]: https://pnpm.io/settings
[pnpm workspace]: https://pnpm.io/workspaces
[projen]: https://projen.io/
