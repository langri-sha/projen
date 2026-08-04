# @langri-sha/projen-cargo

[projen] components for authoring [Cargo] workspaces and the crates in them.

## Usage

```sh
npm install -D projen @langri-sha/projen-cargo
```

`CargoWorkspace` writes the workspace root — `Cargo.toml`,
`rust-toolchain.toml`, `rustfmt.toml`, a `deny.toml` if you ask for one, and
`/target/` into `.gitignore`:

```js
import { Project } from 'projen'
import { CargoWorkspace } from '@langri-sha/projen-cargo'

const project = new Project({
  name: 'my-project',
})

new CargoWorkspace(project, {
  workspace: {
    resolver: '3',
    members: ['apps/api'],
    package: {
      edition: '2024',
      license: 'MIT',
    },
    dependencies: {
      anyhow: '1.0.100',
      tokio: { version: '1.48.0', features: ['full'] },
    },
  },
  toolchain: {
    channel: '1.93.0',
    components: ['clippy', 'rustfmt'],
  },
})
```

`CargoPackage` writes a crate, which inherits from the workspace rather than
restating it, and a sample `src/main.rs` so it compiles before anything has been
written into it:

```js
import { CargoPackage } from '@langri-sha/projen-cargo'

new CargoPackage(crate, {
  package: {
    edition: { workspace: true },
    license: { workspace: true },
  },
  dependencies: {
    tokio: { workspace: true },
  },
})
```

The crate's `name` defaults to the project's own; pass `sampleCode: false` to
skip `src/main.rs`.

Members added after construction still reach the manifest, which is what
`@langri-sha/projen-project` uses to keep `[workspace] members` in step with the
subprojects that declare a crate:

```js
workspace.addMember('apps/worker')
```

## Manifest typings

Manifest options come from [SchemaStore's Cargo Manifest schema][schema],
compiled on install. The schema closes the manifest and its `[package]` table to
unknown keys, so it lags Cargo by whatever the latest release added — `[hints]`,
at the time of writing. Reach past it through the file rather than waiting on
SchemaStore:

```js
workspace.manifest.addOverride('hints.mostly-unused', true)
```

`rustfmt.toml` is typed the same way, from [SchemaStore's rustfmt
schema][rustfmt]. `rust-toolchain.toml` and `deny.toml` are not: rustup's schema
types its one table as an open bag, and no schema is published for `cargo deny`
at all, so both are written out by hand.

## rustfmt and the edition

`cargo fmt` reads the edition out of `Cargo.toml`, but rustfmt invoked directly
— as editors and `rustfmt --check` do — falls back to 2015 and formats
differently. `rustfmt.toml` therefore carries over the edition
`[workspace.package]` declares, unless you set one yourself.

[cargo]: https://doc.rust-lang.org/cargo/
[projen]: https://projen.io/
[rustfmt]: https://www.schemastore.org/rustfmt.json
[schema]: https://www.schemastore.org/cargo.json
