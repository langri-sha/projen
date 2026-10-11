# projen-pnpm-workspace

A [projen] component for maintaining a [pnpm workspace].

## Usage

Install dependencies:

```sh
npm install -D projen projen-pnpm-workspace
```

Then, create a `PnpmWorkspace` component for your project:

```js
import { Project } from 'projen'
import { PnpmWorkspace } from 'projen-pnpm-workspace'

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

Projen 0.101.7 and later register a `pnpm-workspace.yaml` of their own for every
pnpm package. The component takes that file over, so create it after the
project's `NodePackage`, and set the options on it rather than through projen's
`pnpmOptions.workspaceYamlOptions` or `allowScripts`, which no longer reach the
file.

[`pnpm-workspace.yaml`]: https://pnpm.io/settings
[pnpm workspace]: https://pnpm.io/workspaces
[projen]: https://projen.io/
