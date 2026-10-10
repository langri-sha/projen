# projen-swcrc

A [projen] component for [configuring] [SWC].

## Usage

```sh
npm install -D projen projen-swcrc
```

Add the SWC configuration:

```js
import { Project } from 'projen'
import { SWCConfig } from 'projen-swcrc'

const project = new Project({
  name: 'test',
})

new SWCConfig(project, {
  jsc: {
    parser: {
      syntax: 'ecmascript',
    },
  },
})

project.synth()
```

[configuring]: https://swc.rs/docs/configuration/swcrc
[projen]: https://projen.io/
[swc]: https://swc.rs/
