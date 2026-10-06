# @langri-sha/projen-husky

A [projen] component for managing Git hooks with [Husky].

## Usage

Install dependencies:

```sh
npm install -D projen husky @langri-sha/projen-husky
```

Then, create a `Husky` component for your root project:

```js
import { Project } from 'projen'
import { Husky } from '@langri-sha/projen-husky'

const project = new Project({
  name: 'my-project',
})

new Husky(project, {
  'pre-commit': 'npm run lint',
  'pre-push': ['npm run test', 'npm run build'],
})
```

Each key is the name of a Git hook, and its value a command or a list of
commands to run in order. The component writes them to `.husky/<hook>`, but does
not set up Husky itself: add a `prepare` script that runs `husky`.

[husky]: https://typicode.github.io/husky/
[projen]: https://projen.io/
