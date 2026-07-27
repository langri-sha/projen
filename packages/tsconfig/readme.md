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

For [React] applications:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@langri-sha/tsconfig/react.json"
}
```

For [Emotion] applications:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@langri-sha/tsconfig/emotion.json"
}
```

`react.json` and `emotion.json` already extend `base.json` themselves, so
extending from either one on its own is enough — combining them with
`@langri-sha/tsconfig` in an array only reapplies `base.json`'s settings a
second time.

For a [React] package inside a monorepo, combine `project.json` with
`react.json` (or `emotion.json`) instead:

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

When combining configurations this way, list the one whose settings should win
last. `react.json`/`emotion.json` override `base.json`'s `lib` (to add the DOM
types), so they must come after `project.json` in the array — reversing the
order would silently drop the DOM types again.

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
