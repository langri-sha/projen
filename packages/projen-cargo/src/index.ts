import { Component, type Project, SampleFile, TomlFile } from 'projen'

import { type CargoManifest } from './cargo'
import { type CargoDenyOptions } from './deny'
import { type Rustfmt } from './rustfmt'
import { type RustToolchainOptions } from './toolchain'

export * from './deny'
export * from './toolchain'

/**
 * A Cargo manifest, as published in SchemaStore's "Cargo Manifest" schema.
 *
 * The schema closes both the manifest and its `[package]` table to unknown
 * keys, so it lags Cargo by whatever the latest release added — `[hints]`, at
 * the time of writing. Reach for `manifest.addOverride()` on the component for
 * those, rather than waiting on SchemaStore.
 *
 * `[package] name` is optional here where the schema requires it, because both
 * components fall back to the project's own name.
 */
export interface CargoManifestOptions extends Omit<CargoManifest, 'package'> {
  /**
   * The `[package]` table. Omit it entirely for a virtual manifest — one that
   * only opens a workspace.
   *
   * @default The project's name, when the table is declared at all
   */
  readonly package?: Partial<NonNullable<CargoManifest['package']>>
}

/**
 * Cargo workspace options.
 */
export interface CargoWorkspaceOptions extends CargoManifestOptions {
  /**
   * `deny.toml` contents. Omit to leave `cargo deny` unconfigured.
   */
  readonly deny?: CargoDenyOptions

  /**
   * `rustfmt.toml` contents.
   *
   * @default The edition declared by `[workspace.package]`
   */
  readonly rustfmt?: Rustfmt

  /**
   * The `[toolchain]` table of `rust-toolchain.toml`.
   *
   * @default { channel: "stable" }
   */
  readonly toolchain?: RustToolchainOptions
}

/**
 * A component for authoring the root of a Cargo workspace.
 */
export class CargoWorkspace extends Component {
  /**
   * The workspace manifest.
   */
  readonly manifest: TomlFile

  /**
   * The toolchain rustup selects for anything run inside the workspace.
   */
  readonly toolchain: TomlFile

  /**
   * The formatting rustfmt applies across the workspace.
   */
  readonly rustfmt: TomlFile

  /**
   * The `cargo deny` configuration, when one was asked for.
   */
  readonly deny?: TomlFile

  /**
   * The paths in `[workspace] members`.
   *
   * Read at synthesis rather than at construction, so that members added
   * afterwards — as `@langri-sha/projen-project` does, for every subproject
   * that declares a crate — still reach the manifest.
   */
  readonly members: string[]

  /**
   * The `[workspace.package]` keys member crates may inherit with
   * `key.workspace = true`.
   */
  readonly inheritable: string[]

  constructor(project: Project, options: CargoWorkspaceOptions = {}) {
    super(project)

    const {
      deny,
      package: crate,
      rustfmt,
      toolchain,
      workspace,
      ...manifest
    } = options

    this.members = [...(workspace?.members ?? [])]
    this.inheritable = Object.keys(workspace?.package ?? {})

    // Spelled out in the order a manifest is usually written in, rather than
    // in whichever order the options happened to arrive in.
    this.manifest = new TomlFile(project, 'Cargo.toml', {
      obj: {
        workspace: {
          ...workspace,
          members: this.members,
        },
        ...(crate && {
          package: {
            name: project.name,
            ...crate,
          },
        }),
        ...manifest,
      },
    })

    this.toolchain = new TomlFile(project, 'rust-toolchain.toml', {
      obj: {
        toolchain: {
          channel: 'stable',
          ...toolchain,
        },
      },
    })

    this.rustfmt = new TomlFile(project, 'rustfmt.toml', {
      obj: {
        edition: workspace?.package?.edition,
        ...rustfmt,
      },
    })

    if (deny) {
      this.deny = new TomlFile(project, 'deny.toml', { obj: deny })
    }

    project.addGitIgnore('/target/')
  }

  /**
   * Add paths to `[workspace] members`, skipping any already listed.
   */
  addMember(...paths: string[]): void {
    for (const path of paths) {
      if (!this.members.includes(path)) {
        this.members.push(path)
      }
    }
  }
}

/**
 * Cargo package options.
 */
export interface CargoPackageOptions extends CargoManifestOptions {
  /**
   * Whether to write a sample `src/main.rs`, so that a freshly scaffolded
   * crate compiles before anything has been written into it.
   *
   * @default true
   */
  readonly sampleCode?: boolean
}

/**
 * Options for either of the components, for callers that route on
 * `project.parent` rather than choosing between them up front.
 */
export interface CargoOptions
  extends CargoWorkspaceOptions, CargoPackageOptions {}

/**
 * A component for authoring a Cargo package.
 */
export class CargoPackage extends Component {
  /**
   * The crate manifest.
   */
  readonly manifest: TomlFile

  constructor(project: Project, options: CargoPackageOptions = {}) {
    super(project)

    const { package: crate, sampleCode = true, ...manifest } = options

    this.manifest = new TomlFile(project, 'Cargo.toml', {
      obj: {
        package: {
          name: project.name,
          ...crate,
        },
        ...manifest,
      },
    })

    if (sampleCode) {
      new SampleFile(project, 'src/main.rs', {
        contents: 'fn main() {\n    println!("Hello, world!");\n}\n',
      })
    }
  }
}
