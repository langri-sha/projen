# @langri-sha/projen-ruff

A [projen] component for configuring [Ruff].

## Usage

```sh
npm install -D projen @langri-sha/projen-ruff
```

`Ruff` writes a `ruff.toml`, which Ruff reads ahead of a `[tool.ruff]` table in
the `pyproject.toml` beside it, so it needs no [uv] workspace or Python package
to configure:

```js
import { Project } from 'projen'
import { Ruff } from '@langri-sha/projen-ruff'

const project = new Project({
  name: 'my-project',
})

new Ruff(project, {
  'line-length': 120,
  lint: {
    select: ['E', 'F', 'W', 'ANN'],
    ignore: ['E501'],
  },
  format: {
    'quote-style': 'double',
  },
})
```

## Configuration typings

Options come from [SchemaStore's Ruff schema][schema], compiled on install.
Ruff's maintainers copy it there from Ruff's own `ruff.schema.json` with most
releases, so it follows Ruff's latest release rather than the one a project
locks.

Rule selectors are a closed union of the codes, prefixes, rule names and
categories that release knows, so a rule Ruff has removed, such as `ANN101`,
fails to compile. A code newer than the Ruff a project locks still compiles, as
do a rule's name and a category, which Ruff only takes in preview: `ruff check`
refuses them instead.

The schema's `RuffOptions` is the `[lint.ruff]` table. It is exported as
`LintRuffOptions`, since `RuffOptions` names this component's own options.

The schema closes every table to unknown keys, so an option newer than it fails
to compile; reach past it through the file rather than waiting on SchemaStore:

```js
ruff.file.addOverride('lint.some-new-option', true)
```

[projen]: https://projen.io/
[ruff]: https://docs.astral.sh/ruff/
[schema]: https://www.schemastore.org/ruff.json
[uv]: https://docs.astral.sh/uv/
