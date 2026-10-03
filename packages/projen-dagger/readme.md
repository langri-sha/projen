# @langri-sha/projen-dagger

A [projen] component for [Dagger] workspaces.

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

new Dagger(project, {
  engineVersion: 'v1.0.0-beta.15',
})

project.synth()
```

[`@langri-sha/projen-project`]:
  https://www.npmjs.com/package/@langri-sha/projen-project
[projen]: https://projen.io/
[dagger]: https://dagger.io/
