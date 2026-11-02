/**
 * A `deny.toml` section.
 *
 * The keys `cargo deny` reads are named where they have outlived a few of its
 * releases; the rest are left to the index signature. Deprecating and moving
 * keys between sections is routine for the tool, and a hand-copied list of
 * them would be wrong within a release or two of being written — whereas the
 * six section names have been stable since `cargo deny` 0.9.
 */
export interface CargoDenySection {
  /** @jsii ignore */
  readonly [key: string]: unknown
}

/**
 * Open deny tables exposed as JSON maps through JSII.
 */
export interface CargoDenyOptionsBase {
  readonly graph?: { readonly [key: string]: unknown }
  readonly output?: { readonly [key: string]: unknown }
  readonly sources?: { readonly [key: string]: unknown }
}

/**
 * `cargo deny` configuration.
 *
 * Written out by hand: SchemaStore publishes no schema for `deny.toml`.
 *
 * @see https://embarkstudios.github.io/cargo-deny/checks/cfg.html
 */
export interface CargoDenyOptions extends CargoDenyOptionsBase {
  /**
   * How the dependency graph `cargo deny` checks is built — the targets to
   * resolve for, the features to enable, the crates to leave out.
   * @jsii ignore
   */
  readonly graph?: CargoDenySection

  /**
   * How findings are reported.
   * @jsii ignore
   */
  readonly output?: CargoDenySection

  /**
   * The `cargo deny check advisories` pass, over RustSec advisories and
   * yanked or unmaintained crates.
   */
  readonly advisories?: CargoDenyAdvisoriesOptions

  /**
   * The `cargo deny check licenses` pass.
   */
  readonly licenses?: CargoDenyLicensesOptions

  /**
   * The `cargo deny check bans` pass, over duplicate, unwanted or
   * build-script-running crates.
   */
  readonly bans?: CargoDenyBansOptions

  /**
   * The `cargo deny check sources` pass, over the registries and Git remotes
   * dependencies are fetched from.
   * @jsii ignore
   */
  readonly sources?: CargoDenySection
}

export interface CargoDenyAdvisoriesOptions extends CargoDenySection {
  /**
   * Advisory identifiers to accept, each ideally with the reason it is
   * tolerable.
   */
  readonly ignore?: Array<string | CargoDenyIgnoredAdvisory>

  /**
   * How to treat a dependency whose version has been yanked.
   */
  readonly yanked?: 'deny' | 'warn' | 'allow'
}

export interface CargoDenyLicensesOptions extends CargoDenySection {
  /**
   * SPDX expressions a dependency's license must satisfy.
   */
  readonly allow?: string[]

  /**
   * Per-crate exemptions from `allow`.
   */
  readonly exceptions?: CargoDenyLicenseException[]
}

export interface CargoDenyBansOptions extends CargoDenySection {
  /**
   * How to treat a crate resolved at more than one version.
   * @jsii ignore
   */
  readonly 'multiple-versions'?: 'deny' | 'warn' | 'allow'

  /**
   * How to treat a dependency requirement of `*`.
   */
  readonly wildcards?: 'deny' | 'warn' | 'allow'
}

export interface CargoDenyIgnoredAdvisory {
  readonly id: string
  readonly reason?: string
}

export interface CargoDenyLicenseException {
  readonly name: string
  readonly version?: string
  readonly allow: string[]
}
