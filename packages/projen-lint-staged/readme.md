# projen-lint-staged

A [projen] component for configuring [lint-staged].

## Usage

Install dependencies:

```sh
npm install -D projen projen-lint-staged
```

Then, create a `LintStaged` component for your project:

```js
import { Project } from 'projen'
import { LintStaged } from 'projen-lint-staged'

const project = new Project({
  name: 'my-project',
})

new LintStaged(project, {
  extends: '@langri-sha/lint-staged',
  config: {
    '*.sh': 'shellcheck',
  },
})

project.synth()
```

`extends` names a package whose default export is spread into the configuration
first, so entries in `config` take precedence. The configuration is an ES module
written to `lint-staged.config.js`. Set `filename` to `lint-staged.config.mjs`
if your package isn't `"type": "module"`.

[lint-staged]: https://github.com/lint-staged/lint-staged
[projen]: https://projen.io/
