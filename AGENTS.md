# Agents orientation — `langri-sha/projen`

This monorepo holds the custom **projen components** authored under
`@langri-sha`. It dogfoods itself: the meta-component
`@langri-sha/projen-project` is the `Project` class used by `.projenrc.ts`.

## Layout

```
.projenrc.ts            # source of truth — every other config is synthesized
packages/projen-*/      # 25 component packages, each Beachball-versioned
.github/workflows/      # workspace CI (check) + manual release (packages)
```

`packages/` holds only projen components: #287 moved the support packages that
used to publish from here to repositories of their own.

`schemastore-to-typescript` moved out to
[langri-sha/schemastore-to-typescript](https://github.com/langri-sha/schemastore-to-typescript)
and publishes unscoped from there. The root and the components whose `prepare`
scripts compile SchemaStore typings take it from npm and call its bin. It sits
beside `@langri-sha/*` in `minimumReleaseAgeExclude` and in the Renovate rule
that skips the release-age wait, so a fresh release installs at once.

`babel-preset` and `babel-test` moved out to
[langri-sha/babel-preset](https://github.com/langri-sha/babel-preset), a
workspace that publishes only `@langri-sha/babel-preset` and keeps babel-test as
a private package. `monorepo` went standalone as
[`monorepo-resolve`](https://github.com/langri-sha/monorepo-resolve), and
`@langri-sha/monorepo` is deprecated in its favour.

`eslint-config`, `lint-staged` and `prettier` moved out to
[langri-sha/eslint-config](https://github.com/langri-sha/eslint-config),
[langri-sha/lint-staged](https://github.com/langri-sha/lint-staged) and
[langri-sha/prettier](https://github.com/langri-sha/prettier), and `webpack` to
[langri-sha/webpack](https://github.com/langri-sha/webpack). The root takes the
three configs from npm, pinned, and Renovate moves them with the rest of
`@langri-sha/*`.

`tsconfig` and `vitest` moved out to
[langri-sha/tsconfig](https://github.com/langri-sha/tsconfig) and
[langri-sha/vitest](https://github.com/langri-sha/vitest). The root takes
`tsconfig` from npm and every package takes both, pinned: the `subproject` and
`test` helpers in `.projenrc.ts` add them with `addDevDeps`, which Renovate's
projenrc customManager reads, so they move with the rest of `@langri-sha/*` too.

`langri-sha/langri-sha.com` still owns `fonts`, which its site builds on — a
private, unpublished package that subsets typefaces for that site alone. Nothing
here depends on it. The `@langri-sha/babel-preset`, `eslint-config`,
`lint-staged` and `prettier` strings you'll find in `projen-project` are not
dependency edges either: they are default values written into the _synthesized_
configs of consuming projects. The preset's `@langri-sha/tsconfig` defaults are
the same kind of value, and the `this.name !== '@langri-sha/tsconfig'` guards
beside them serve langri-sha/tsconfig, which synthesizes itself with this
preset. `projen-jest-config` names `@langri-sha/jest-config` only as an example.

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
