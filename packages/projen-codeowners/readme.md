# projen-codeowners

A [projen] component for managing [CODEOWNERS].

## Usage

```sh
npm install -D projen projen-codeowners
```

Then, create the `Codeowners` component for your root project:

```js
import { Project } from 'projen'
import { Codeowners } from 'projen-codeowners'

const project = new Project({
  name: 'my-project',
})

new Codeowners(project, {
  '*': '@admins',
  '*.js': ['@developers', '@frontend'],
})
```

[projen]: https://projen.io/
[codeowners]:
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
