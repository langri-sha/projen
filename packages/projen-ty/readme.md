# @langri-sha/projen-ty

A [projen] component for configuring [ty].

## Usage

```sh
npm install -D projen @langri-sha/projen-ty
```

`Ty` writes a `ty.toml`, which needs no `pyproject.toml` or [uv] workspace and
takes precedence over a `[tool.ty]` table beside it:

```js
import { Project } from 'projen'
import { Ty } from '@langri-sha/projen-ty'

const project = new Project({
  name: 'my-project',
})

new Ty(project, {
  environment: {
    'python-version': '3.14',
  },
  src: {
    include: ['packages', 'scripts'],
  },
  rules: {
    'possibly-unresolved-reference': 'error',
  },
})
```

ty only logs that it ignores a `[tool.ty]` table beside a `ty.toml`, so move the
table across rather than keeping both.

## Configuration typings

Options come from [SchemaStore's ty schema][schema], compiled on install. ty's
maintainers publish it there from ty's own schema every few releases, so it
follows ty's latest release rather than the one a project locks, and
`python-version` takes only the versions that release supports.

Every table is closed to unknown keys but `[rules]`, which the schema leaves
open to rules of any name: a misspelled rule compiles, and `ty check` reports it
as unknown instead. Reach past the schema through the file rather than waiting
on SchemaStore:

```js
ty.file.addOverride('analysis.some-new-option', true)
```

[projen]: https://projen.io/
[schema]: https://www.schemastore.org/ty.json
[ty]: https://docs.astral.sh/ty/
[uv]: https://docs.astral.sh/uv/
