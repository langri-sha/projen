# projen-babel-config

A [projen] component for configuring [Babel].

## Usage

Install dependencies:

```sh
npm install -D projen projen-babel-config
```

Then, create a `Babel` component for your project:

```js
import { Project } from 'projen'
import { Babel } from 'projen-babel-config'

const project = new Project({
  name: 'my-project',
})

new Babel(project, {
  options: {
    presets: ['@babel/preset-env'],
  },
})

project.synth()
```

The configuration is an ES module written to `babel.config.js`. Set `filename`
to `babel.config.mjs` if your package isn't `"type": "module"`. To export a
function of Babel's [config API] instead of an object, pass the code to run in
it as `configApiFunction`, for example `api.cache(true)`.

[babel]: https://babeljs.io/
[config api]: https://babeljs.io/docs/config-files#config-function-api
[projen]: https://projen.io/
