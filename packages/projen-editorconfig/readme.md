# projen-editorconfig

A [projen] component that you can add to your project to author [EditorConfig]
configurations.

## Usage

Install dependencies:

```sh
npm install -D projen-editorconfig
```

Then, create an `EditorConfig` component for your projects:

```js
import { Project } from 'projen'
import { EditorConfig } from 'projen-editorconfig'

const project = new Project({
  name: 'my-project',
})

new EditorConfig(project, {
  '*': {
    indent_size: 2,
  },
  Dockerfile: {
    indent_size: 4,
    indent_style: 'tab',
  },
})
```

[editorconfig]: https://editorconfig.org/
[projen]: https://projen.io/
