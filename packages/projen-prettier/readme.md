# @langri-sha/projen-prettier

A [projen] component for configuring [Prettier].

## Usage

Install dependencies:

```sh
npm install -D projen @langri-sha/projen-prettier
```

Then, create an `Prettier` component for your project:

```js
import { Project } from 'projen'
import { Prettier } from '@langri-sha/projen-prettier'

const project = new Project({
  name: 'my-project',
})

new Prettier(project, {
  ignorePatterns: ['.*'],
  extends: '@langri-sha/prettier',
  config: {
    printWidth: 100,
  },
})
```

[prettier]: https://prettier.io/docs/en/
[projen]: https://projen.io/
