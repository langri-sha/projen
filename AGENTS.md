# Agents orientation — `langri-sha/projen`

This monorepo holds the custom **projen components** authored under
`@langri-sha`. It dogfoods itself: the meta-component
`@langri-sha/projen-project` is the `Project` class used by `.projenrc.ts`.

## Layout

```
.projenrc.ts            # source of truth — every other config is synthesized
packages/projen-*/      # 18 component packages, each Beachball-versioned
packages/<aux>/         # 11 support packages, likewise Beachball-versioned
.github/workflows/      # workspace CI (check) + manual release (packages)
```

The support packages — `@langri-sha/babel-preset`, `babel-test`,
`eslint-config`, `jest-config`, `jest-test`, `lint-staged`, `monorepo`,
`prettier`, `schemastore-to-typescript`, `tsconfig` and `vitest` — live here and
publish from this repo. Everything the workspace needs is wired `workspace:*`;
no `@langri-sha/*` dependency is consumed from npm.

`langri-sha/langri-sha.com` still owns `webpack` and `fonts`, which its apps
build on. Nothing here depends on them. The `@langri-sha/babel-preset` and
`@langri-sha/jest-config` strings you'll find in `projen-project` and
`projen-jest-config` are still not dependency edges either, even now that both
packages live here: they are default values written into the _synthesized_
configs of consuming projects.

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
moment that PR lands, and npm serves the stale tarball indefinitely. Eight
packages sat that way for two years across three releases. Nothing detects this
automatically; when you edit a package, write the change file in the same PR.

Note also that `projen`'s peer range is declared **once**, in the `projenPeer`
constant at the top of `.projenrc.ts`, and spread into each subproject. The
`peerDeps:` key in that constant is load-bearing — Renovate's projenrc
customManager keys off that literal.

## Provenance

Extracted from `langri-sha/langri-sha.com` via `git filter-repo`, preserving
per-package commit history (`git log -- packages/<name>` shows pre-bootstrap
commits). Re-synced 2026-06-23 against the source's canonical `main` to pull the
latest per-package changes (Node 24, tsx-based projenrc, dependency bumps).

The six support packages arrived the same way on 2026-07-20, from
`langri-sha.com@bde65b48`: a second `git filter-repo` pass keeping only their
`packages/` paths, merged in with `--allow-unrelated-histories`. Each retains
its full history — `git log -- packages/eslint-config` reaches back to
2021-07-11, five years before this repo's bootstrap commit. Their `CHANGELOG.md`
and version numbers carry over unbroken, so releases continue from where
`langri-sha.com` left off.

Their pending `change/*.json` entries came across too, by the same filtered
merge — unlike the `projen-*` migration, which dropped them. That matters: the
source carried an unreleased **minor** for `eslint-config` (the eslint-10
upgrade), so discarding those files would have released it as a patch and
silently dropped a dozen changelog entries describing real work.

That migration also retired the eslint `^9` pin: the workspace `eslint-config`
bundles eslint-10 plugins, so the root now tracks eslint 10, matching the source
repo. Note `eslint-plugin-react@7.37.5` peers `<= ^9.7` and warns under eslint
10 — that warning predates the migration and is present upstream too.

`babel-preset`, `babel-test`, `jest-config` and `jest-test` followed on
2026-08-14 by the same recipe, from `langri-sha.com@5a982677`. That filter also
kept `packages/babel-helpers` and `packages/jest`, the paths the source renamed
away, so `git log -- packages/babel-helpers` still reaches 2024-04-14 and
`babel-preset` goes back to 2021-07-13. Ask for those retired paths by name:
`git log --follow` wanders off onto unrelated files here, because rename
detection is a heuristic and the imported commits interleave with this repo's
own once a migration branch lands. Thirteen pending change files came across
with them, all patches. `babel-test` consumed `@langri-sha/monorepo` from npm at
`^0.5.7` — the last edge that forced the two repositories to release in order —
and is wired `workspace:*` now.

`langri-sha.com` has not been decommissioned yet: it still carries those four
packages and its own copies of those thirteen change files. Until that lands,
only one repository may release them, or the two collide on the same version.
