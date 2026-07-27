# @langri-sha/tsconfig

A set of [TypeScript] configuration files, focused on type-checking all your
TypeScript and JavaScript modules

Provides configurations for [composite projects], [React] and [Emotion], using
the next [JSX runtime] for transforming.

## Usage

Install the necessary dependencies:

```sh
npm install -D typescript @langri-sha/tsconfig
```

For basic settings, for example:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@langri-sha/tsconfig"
}
```

For projects in monorepos:

```json
// /workspace/tsconfig.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@langri-sha/tsconfig",
  "references": [
    { "path": "./packages/app" }
  ]
}

// /workspace/packages/app/tsconfig.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@langri-sha/tsconfig/project.json"
}
```

When combining configurations, list the complete configuration first, then
aspects in the order they should apply, with later entries winning. `react.json`
sets `lib` to add the DOM types, so it must come after whichever complete
configuration you use, or that configuration's plain `lib` silently wins
instead. `emotion.json` only overrides `jsxImportSource`, and depends on
`react.json` already having set `jsx` and `lib` — it must come after
`react.json`, not instead of it.

For [React] applications:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": ["@langri-sha/tsconfig", "@langri-sha/tsconfig/react.json"]
}
```

For [Emotion] applications:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": [
    "@langri-sha/tsconfig",
    "@langri-sha/tsconfig/react.json",
    "@langri-sha/tsconfig/emotion.json"
  ]
}
```

For a [React] (or [Emotion]) package inside a monorepo, use `project.json` as
the complete configuration instead:

```json
// /workspace/packages/app/tsconfig.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": [
    "@langri-sha/tsconfig/project.json",
    "@langri-sha/tsconfig/react.json"
  ]
}
```

## See

- [`@moonrepo/tsconfig`]

[`@moonrepo/tsconfig`]:
  https://github.com/moonrepo/dev/tree/master/packages/tsconfig
[composite projects]:
  https://www.typescriptlang.org/docs/handbook/project-references.html
[emotion]: https://emotion.sh/docs/typescript
[jsx runtime]:
  https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html
[react]: https://react.dev/learn/installation
[typescript]: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
