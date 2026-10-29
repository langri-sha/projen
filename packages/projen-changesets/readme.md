# projen-changesets

A [projen] component for configuring [Changesets], so the change files a
repository versions and tags with are declared in your projenrc along with
everything else.

## Usage

```sh
npm install -D projen projen-changesets @changesets/cli
```

Then, create a `Changesets` component for your root project:

```ts
import { Project } from 'projen'
import { Changesets } from 'projen-changesets'

const project = new Project({
  name: 'my-project',
})

new Changesets(project, {
  config: {
    privatePackages: { version: true, tag: true },
  },
})
```

This synthesizes `.changeset/config.json` and a `changeset` task, which runs
`changeset` to add a change file. The component does not install
`@changesets/cli`: add it yourself.

### Defaults

The file starts from what `changeset init` writes in `@changesets/cli` 3.0.3,
without its prompts, and the `config` you pass replaces those keys one by one.
`privatePackages` is left unset, so a private package is neither versioned nor
tagged until you opt in.

The types come from SchemaStore's Changesets schema, so they follow the
published one. Reach keys they lack with `file.addOverride()`.

### Options

| Option      | Default | Purpose                                                          |
| ----------- | ------- | ---------------------------------------------------------------- |
| `config`    | `{}`    | Keys to write over the defaults                                  |
| `schema`    | `true`  | Write `$schema`, so editors validate and complete the file       |
| `gitignore` | `true`  | Re-include `.changeset` where a deny-by-default `.*` excludes it |

[changesets]: https://github.com/changesets/changesets
[projen]: https://projen.io
