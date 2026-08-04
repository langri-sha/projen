/**
 * The `[toolchain]` table of `rust-toolchain.toml`.
 *
 * Written out by hand rather than generated: SchemaStore's "Rust toolchain"
 * schema types the table as an open bag, so compiling it yields nothing an
 * author can lean on.
 *
 * @see https://rust-lang.github.io/rustup/overrides.html#the-toolchain-file
 */
export interface RustToolchainOptions {
  /**
   * The release channel or version to pin, e.g. `stable`, `1.93.0` or
   * `nightly-2026-01-31`.
   */
  readonly channel?: string

  /**
   * Components to install alongside the toolchain, e.g. `clippy`, `rustfmt`.
   */
  readonly components?: string[]

  /**
   * Compilation targets to install alongside the host's.
   */
  readonly targets?: string[]

  /**
   * Which set of components a bare `channel` installs.
   */
  readonly profile?: 'minimal' | 'default' | 'complete'

  /**
   * An absolute path to a toolchain built outside of rustup. Cannot be
   * combined with any of the fields above.
   */
  readonly path?: string
}
