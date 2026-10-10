# projen-eslint

A [projen] component for configuring [ESLint].

## Usage

Install dependencies:

```sh
npm install -D eslint projen-eslint
```

Then, create an `ESLint` component for your project:

```js
import { Project } from 'projen'
import { ESLint } from 'projen-eslint'

const project = new Project({
  name: 'my-project',
})

new ESLint(project, {
  ignorePatterns: ['.*'],
  extends: '@langri-sha/eslint-config',
  config: [
    {
      rules: {
        'unicorn/prefer-node-protocol': 'error',
      },
    },
  ],
})
```

[eslint]: https://eslint.org/docs/latest/
[projen]: https://projen.io/
