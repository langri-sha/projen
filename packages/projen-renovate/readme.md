# projen-renovate

A [projen] component for authoring [Renovate] configurations.

## Usage

```sh
npm install -D projen projen-renovate
```

Add the Renovate configuration:

```js
import { Project } from 'projen'
import { Renovate } from 'projen-renovate'

const project = new Project({
  name: 'test',
})

new Renovate(project, {
  addLabels: ['dependencies'],
})

project.synth()
```

## See also

- [Renovate Docs]
- [Renovate NPM Package]

[projen]: https://projen.io/
[renovate docs]: https://docs.renovatebot.com/
[renovate npm package]: https://www.npmjs.com/package/renovate
[renovate]: https://www.mend.io/renovate/
