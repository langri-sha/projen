# @langri-sha/projen-uv

[projen] components for authoring [uv] workspaces and the Python packages in
them.

## Usage

```sh
npm install -D projen @langri-sha/projen-uv
```

`UvWorkspace` writes the workspace root — a `pyproject.toml` opening the
workspace, a `.python-version` if you pin one, and into `.gitignore` what
`uv init` keeps out of Git:

```js
import { Project } from 'projen'
import { UvWorkspace } from '@langri-sha/projen-uv'

const project = new Project({
  name: 'my-project',
})

new UvWorkspace(project, {
  pythonVersion: '3.14',
  'dependency-groups': {
    dev: ['ty>=0.0.52'],
  },
  tool: {
    uv: {
      workspace: {
        members: ['packages/lib'],
      },
    },
  },
})
```

The root stays virtual — a workspace, and not a package of its own — unless it
declares a `[project]` table.

`UvPackage` writes a package, and a sample `src/<module>/__init__.py` so that it
builds before anything has been written into it:

```js
import { UvPackage } from '@langri-sha/projen-uv'

new UvPackage(lib, {
  project: {
    'requires-python': '>=3.14',
    dependencies: ['httpx'],
  },
  'build-system': {
    requires: ['uv_build>=0.12,<0.13'],
    'build-backend': 'uv_build',
  },
})
```

The package's `name` defaults to the project's own, less any npm scope, and its
`version` to the `0.1.0` that `uv init` writes; pass `sampleCode: false` to skip
the module.

A package depending on another member of the workspace names it in
`[tool.uv.sources]`, as uv requires:

```js
new UvPackage(app, {
  project: {
    dependencies: ['lib'],
  },
  tool: {
    uv: {
      sources: {
        lib: { workspace: true },
      },
    },
  },
})
```

Members added after construction still reach the manifest, which is what
`@langri-sha/projen-project` uses to keep `[tool.uv.workspace] members` in step
with the subprojects that declare a package:

```js
workspace.addMember('apps/app')
```

## Manifest typings

Manifest options come from [SchemaStore's pyproject schema][pyproject], compiled
on install, and `[tool.uv]` from [SchemaStore's uv schema][schema] — the one the
pyproject schema refers `[tool.uv]` to. Every other tool's table is left open.

SchemaStore takes its copy of the uv schema from uv every few releases, so it
lags uv by whatever was added since. The schema closes `[tool.uv]` to unknown
keys; reach past it through the file rather than waiting on SchemaStore:

```js
workspace.manifest.addOverride('tool.uv.prerelease-package', { torch: 'allow' })
```

`pyproject.toml` is written as TOML 1.0, because projen's own TOML writer
refuses an array mixing strings and tables — which is what a dependency group
including another looks like, as do uv's overrides, exclusions and cache keys.

## The lockfile

`uv.lock` is uv's to write. The manifests are synthesized, so `uv add` and
`uv remove` cannot edit them: declare dependencies in `.projenrc`, synthesize,
and run `uv lock`.

[projen]: https://projen.io/
[pyproject]: https://www.schemastore.org/pyproject.json
[schema]: https://www.schemastore.org/uv.json
[uv]: https://docs.astral.sh/uv/
