# Agents orientation — `langri-sha/projen`

This monorepo holds the custom **projen components** authored under
`@langri-sha`. It dogfoods itself: the meta-component
`@langri-sha/projen-project` is the `Project` class used by `.projenrc.ts`.

## Layout

```
.projenrc.ts            # source of truth — every other config is synthesized
packages/projen-*/      # 22 component packages, each Beachball-versioned
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

That migration also retired the eslint `^9` pin: `eslint-config` bundles
eslint-10 plugins, so the root tracks eslint 10. `eslint-plugin-react@7.37.5`
peers `<= ^9.7` and warns under eslint 10; the warning predates the migration.

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
and was wired `workspace:*` here until both moved out.

`webpack` followed on 2026-08-15 from `langri-sha.com@a54efb69`, by the same
recipe: 161 commits reaching back to 2020-10-24, every one of them under
`packages/webpack`, so there was no retired path to keep alongside it. Four
pending change files came with it — three patches and a `none`, that last one
recording the source switching `@langri-sha/babel-preset` to npm once
`babel-preset` moved here. Its `@types/node` dropped from 26 to 24 to match the
rest of the workspace, which Renovate caps at the major the runtime supports.
While it lived here, `@langri-sha/webpack` published ESM from `dist/` without
declaring `"type"`; langri-sha/webpack fixed that in 0.7.0.

`langri-sha.com` retired its copies of the Babel and Jest packages in `a54efb69`
and of `webpack` in `11352708`, both on 2026-08-15, so none of them
double-publishes.

`jest-config` and `jest-test` were deprecated on npm and dropped from here on
2026-09-26: nothing used them, and the fleet tests on Vitest. Their sources stay
in this repository's history, under `packages/jest`, `packages/jest-config` and
`packages/jest-test`.

`babel-preset`, `babel-test` and `monorepo` moved out on 2026-10-01 (#289,
#295), each to a repository that carries its history. Their sources stay in this
repository's history too, under `packages/babel-preset`, `packages/babel-test`,
`packages/babel-helpers` and `packages/monorepo`.

`eslint-config`, `lint-staged`, `prettier` and `webpack` moved out on 2026-10-01
(#291, #294, #296, #299), each to a repository that carries its history. Their
sources stay in this repository's history too, under `packages/eslint-config`,
`packages/lint-staged`, `packages/prettier` and `packages/webpack`.

`tsconfig` and `vitest` moved out on 2026-10-01 (#297, #298), each to a
repository that carries its history. Their sources stay in this repository's
history too, under `packages/tsconfig` and `packages/vitest`.
