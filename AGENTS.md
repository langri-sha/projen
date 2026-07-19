# Agents orientation — `langri-sha/projen`

This monorepo holds the custom **projen components** authored under
`@langri-sha`. It dogfoods itself: the meta-component
`@langri-sha/projen-project` is the `Project` class used by `.projenrc.ts`.

## Layout

```
.projenrc.ts            # source of truth — every other config is synthesized
packages/projen-*/      # 17 component packages, each Beachball-versioned
.github/workflows/      # workspace CI (check) + manual release (packages)
```

Auxiliary support packages (`@langri-sha/babel-preset`, `babel-test`,
`eslint-config`, `jest-config`, `jest-test`, `lint-staged`, `monorepo`,
`prettier`, `schemastore-to-typescript`, `tsconfig`, `vitest`, `webpack`) are
**published from `langri-sha/langri-sha.com`** and consumed here from npm.

## Common tasks

```sh
pnpm install                     # also runs schema → .d.ts prepare scripts
npx projen                       # re-synth everything from .projenrc.ts (tsx)
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
Auxiliary packages are consumed from npm and therefore track the **published**
versions, which can lag the source workspace — notably eslint stays `^9` until
`@langri-sha/eslint-config` ships its eslint-10 release. Pending Beachball
`change/*.json` entries from the source repo were intentionally dropped; the
next `beachball change` here emits its own.
