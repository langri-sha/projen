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

## Who owns which file

Projen writes every `package.json` and every file listed in a
`.projen/files.json`, at the root and in each package; they are read-only.
Change them in `.projenrc.ts`, then run `pnpm exec projen`. The SchemaStore
typings that `prepare` scripts compile, such as
`packages/projen-cargo/src/cargo.ts`, are generated and gitignored. Beachball
owns each package's `CHANGELOG.md`, `CHANGELOG.json` and `version` field.
Everything else — `packages/*/src/`, the readmes, `.github/workflows/`, this
file — is edited by hand. Repository settings, branch protection and the Actions
secrets are managed by `langri-sha/github-repos`.

## Common tasks

```sh
pnpm install                     # also runs schema → .d.ts prepare scripts
pnpm exec projen                 # re-synth everything from .projenrc.ts (tsx)
pnpm exec vitest run             # run all unit tests
pnpm tsc --build .               # type check
pnpm eslint . && pnpm prettier --check .
pnpm change                      # write a change file
pnpm -r --if-present prepublishOnly  # tsc-build every package
```

CI (`workspace.yml` → `langri-sha/github` `check.yml`) runs ESLint, Prettier,
the `package.json` checks, `tsc --build`, Vitest and, on pull requests,
`beachball check`. It fails when synthesized files drift from `.projenrc.ts` or
a touched package lacks a change file. On Renovate pull requests it
re-synthesizes and commits the result.

## Release

Beachball versions each package. Anything that reaches a package's tarball or
builds it needs a change file for that package in the same pull request: run
`pnpm change`. Use `none` for edits that shouldn't cut a release on their own,
such as readme-only changes. The root is private and never needs one. On
Renovate pull requests that touch a package, CI writes a `patch` change file
itself.

Releasing publishes **only** packages that have a change file. A package whose
source you edit without one keeps its version number, so `beachball check` —
which only demands change files for packages touched in a PR — goes quiet the
moment that PR lands, and npm serves the stale tarball indefinitely. Nothing
detects this automatically; when you edit a package, write the change file in
the same PR.

Nothing publishes on merge. Run the Release workflow (`publish.yml`) from the
Actions tab to publish every package with a pending change file through npm
trusted publishing. It cuts no git tags and no GitHub releases: Beachball's
`gitTags` is off, and `publish.yml` passes the shared Packages workflow neither
`tag-template` nor `github-releases`.

Note also that `projen`'s peer range is declared **once**, in the `projenPeer`
constant at the top of `.projenrc.ts`, and spread into each subproject. The
`peerDeps:` key in that constant is load-bearing — Renovate's projenrc
customManager keys off that literal.
