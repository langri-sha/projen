# Agents orientation — `langri-sha/projen`

This monorepo holds the custom **projen components** authored under
`@langri-sha`. It dogfoods itself: the meta-component
`@langri-sha/projen-project` is the `Project` class used by `.projenrc.ts`.

## Layout

```
.projenrc.ts            # source of truth — every other config is synthesized
packages/projen-*/      # component packages, each Beachball-versioned
.github/workflows/      # workspace CI (check) + manual release (packages)
```

The shared configs (`@langri-sha/eslint-config`, `lint-staged`, `prettier`,
`tsconfig` and `vitest`) and `schemastore-to-typescript` come from npm, pinned
in `.projenrc.ts`; Renovate moves them with the rest of `@langri-sha/*`.

The `@langri-sha/*` config names inside `projen-project` are defaults it writes
into consuming projects, not dependencies of this repository. Its
`this.name !== '@langri-sha/tsconfig'` guards let `langri-sha/tsconfig`
synthesize itself with the preset; keep them.

## Common tasks

```sh
pnpm install                     # also runs schema → .d.ts prepare scripts
pnpm exec projen                 # re-synth everything from .projenrc.ts (tsx)
pnpm exec vitest run             # run all unit tests
pnpm -r --if-present prepublishOnly  # tsc-build every package
```

## Release

`beachball` drives versioning per package.

```sh
pnpm change                      # write a change/<name>.json file
# merge to main, then trigger the "Release" workflow on GitHub
```

Releasing publishes **only** packages that have a change file. A package whose
source you edit without one keeps its version number, so `beachball check` —
which only demands change files for packages touched in a PR — goes quiet the
moment that PR lands, and npm serves the stale tarball indefinitely. Nothing
detects this automatically; when you edit a package, write the change file in
the same PR.

Note also that `projen`'s peer range is declared **once**, in the `projenPeer`
constant at the top of `.projenrc.ts`, and spread into each subproject. The
`peerDeps:` key in that constant is load-bearing — Renovate's projenrc
customManager keys off that literal.
