import { createRequire } from 'node:module'
import * as path from 'node:path'

import { Babel, BabelOptions } from '@langri-sha/projen-babel'
import { Beachball, BeachballOptions } from '@langri-sha/projen-beachball'
import {
  type CargoOptions,
  CargoPackage,
  CargoWorkspace,
} from '@langri-sha/projen-cargo'
import {
  Codeowners,
  type CodeownersOptions,
} from '@langri-sha/projen-codeowners'
import {
  EditorConfig,
  type EditorConfigOptions,
} from '@langri-sha/projen-editorconfig'
import { ESLint, ESLintOptions } from '@langri-sha/projen-eslint'
import { Husky, type HuskyOptions } from '@langri-sha/projen-husky'
import { JestConfig, JestConfigOptions } from '@langri-sha/projen-jest-config'
import { License } from '@langri-sha/projen-license'
import { LintStaged, LintStagedOptions } from '@langri-sha/projen-lint-staged'
import {
  LintSynthesized,
  type LintSynthesizedOptions,
} from '@langri-sha/projen-lint-synthesized'
import {
  PnpmWorkspace,
  PnpmWorkspaceOptions,
} from '@langri-sha/projen-pnpm-workspace'
import { Prettier, PrettierOptions } from '@langri-sha/projen-prettier'
import { ReadmeFile, type ReadmeFileOptions } from '@langri-sha/projen-readme'
import { Renovate, type RenovateOptions } from '@langri-sha/projen-renovate'
import { SWCConfig, type SWCConfigOptions } from '@langri-sha/projen-swcrc'
import {
  TypeScriptConfig,
  type TypeScriptConfigOptions,
} from '@langri-sha/projen-typescript-config'
import {
  Project as BaseProject,
  type ProjectOptions as BaseProjectOptions,
  DependencyType,
  IgnoreFile,
  IgnoreFileOptions,
  javascript,
} from 'projen'
import * as R from 'ramda'
import { satisfies, valid } from 'semver'

import { GitAttributesFile } from './lib/gitattributes.js'
import { NodePackage, NodePackageOptions, ProjenrcFile } from './lib/index.js'

export * from '@langri-sha/projen-typescript-config'

/**
 * The package manager assumed when a project does not name one.
 */
const DEFAULT_PACKAGE_MANAGER = javascript.NodePackageManager.PNPM

/**
 * The shell command used to run the projen CLI, per package manager. Projen
 * itself defaults to `npx projen` regardless of the manager in use; generated
 * files should name the one the project is actually installed with.
 */
const PROJEN_COMMANDS: Record<javascript.NodePackageManager, string> = {
  [javascript.NodePackageManager.BUN]: 'bunx projen',
  [javascript.NodePackageManager.NPM]: 'npx projen',
  [javascript.NodePackageManager.PNPM]: 'pnpm exec projen',
  [javascript.NodePackageManager.YARN]: 'yarn projen',
  [javascript.NodePackageManager.YARN2]: 'yarn projen',
  [javascript.NodePackageManager.YARN_BERRY]: 'yarn projen',
  [javascript.NodePackageManager.YARN_CLASSIC]: 'yarn projen',
}

/**
 * How long a release must have been published before Renovate proposes it.
 *
 * This must stay at or above pnpm's own `minimumReleaseAge`, which has been a
 * built-in 24 hours since pnpm 11 (`minimum-release-age: 24 * 60` — pnpm counts
 * minutes, Renovate parses a duration string). pnpm re-verifies every lockfile
 * entry on install, so anything Renovate proposes below pnpm's cutoff fails
 * `pnpm install` until the release simply ages out of the window — a red default
 * branch that heals itself with no human action, which teaches people to re-run
 * failed jobs instead of reading them.
 *
 * Three days rather than a bare day: it leaves headroom should pnpm raise its
 * built-in, and it clears npm's 72-hour unpublish window, so a version cannot
 * vanish from under a merged update. That is the same reasoning behind
 * Renovate's own `npm:unpublishSafe` preset.
 */
const RENOVATE_MINIMUM_RELEASE_AGE = '3 days'

/**
 * The versions of the packages this preset supplies that it can support,
 * taken from its own `peerDependencies`.
 *
 * Read rather than restated so that the range a project is held to is the
 * same one the package publishes, and widening support stays a single edit
 * to `peerDeps` in `.projenrc.ts`.
 */
const SUPPORTED_VERSIONS: Record<string, string | undefined> =
  createRequire(import.meta.url)('../package.json').peerDependencies ?? {}

export interface ProjectOptions extends Omit<
  BaseProjectOptions,
  'renovatebot' | 'renovatebotOptions'
> {
  /*
   * Pass in to set up Beachball.
   */
  babel?: BabelOptions

  /*
   * Pass in to set up Beachball.
   */
  beachball?: BeachballOptions

  /*
   * Pass in to set up Cargo. Root projects get a workspace, subprojects a
   * crate in it.
   */
  cargo?: CargoOptions

  /*
   * Pass in to set up Beachball.
   */
  codeowners?: CodeownersOptions

  /**
   * EditorConfig options.
   */
  editorConfig?: EditorConfigOptions

  /**
   * Pass in to configure ESLint.
   */
  eslint?: ESLintOptions

  /**
   * Husky options.
   */
  husky?: HuskyOptions

  /**
   * Configures Jest, when provided.
   */
  jestConfig?: JestConfigOptions

  /**
   * Configures `lint-staged`, when provided.
   */
  lintStaged?: LintStagedOptions

  /*
   * Options for the linting synthesized files.
   */
  lintSynthesized?: LintSynthesizedOptions

  /**
   * Package configuration options.
   */
  package?: {
    /**
     * License copyright year.
     *
     * @default "Current full year"
     */
    copyrightYear?: string
  } & NodePackageOptions

  /*
   * PNPM workspaces to generate, if provided.
   */
  pnpmWorkspace?: PnpmWorkspaceOptions

  /**
   * Pass in to configure Prettier.
   */
  prettier?: PrettierOptions

  /**
   * Pass in to configure NPM ignore options.
   */
  npmIgnore?: IgnoreFileOptions

  /*
   * Add a sample `README`.
   */
  readme?: ReadmeFileOptions

  /*
   * Pass in to configure Renovate.
   */
  renovate?: RenovateOptions

  /*
   * Pass in to configure SWC.
   */
  swcrc?: SWCConfigOptions

  /**
   * TypeScript configuration options.
   */
  typeScriptConfig?: TypeScriptConfigOptions

  /*
   * Whether to use Terrafom.
   */
  withTerraform?: boolean
}

export class Project extends BaseProject {
  babel?: Babel
  beachball?: Beachball
  cargo?: CargoPackage | CargoWorkspace
  codeowners?: Codeowners
  editorConfig?: EditorConfig
  eslint?: ESLint
  husky?: Husky
  jestConfig?: JestConfig
  license?: License
  lintStaged?: LintStaged
  npmIgnore?: IgnoreFile
  override readonly gitattributes: GitAttributesFile
  package?: NodePackage
  pnpmWorkspace?: PnpmWorkspace
  prettier?: Prettier
  projenrc?: ProjenrcFile
  readme?: ReadmeFile
  renovate?: Renovate
  swcrc?: SWCConfig
  typeScriptConfig?: TypeScriptConfig

  /**
   * Packages whose version this preset supplied because the project did not
   * declare one, collected by `#addDefaultDevDeps` and read by
   * `#configureRenovate` — which is why that hook runs last.
   */
  readonly #ownedDevDeps = new Set<string>()

  constructor(options: ProjectOptions) {
    super({
      // Resolved from the options rather than `this.package`, which does not
      // exist until `#configurePackage` runs further down.
      projenCommand: getProjenCommand(options),
      ...options,
      gitIgnoreOptions: getGitIgnoreOptions(options),
    })

    this.tryRemoveFile('.gitattributes')
    this.gitattributes = new GitAttributesFile(this)

    // Clean up tasks not required at top-level.
    this.tasks.removeTask('build')
    this.tasks.removeTask('compile')
    this.tasks.removeTask('eject')
    this.tasks.removeTask('package')
    this.tasks.removeTask('post-compile')
    this.tasks.removeTask('pre-compile')
    this.tasks.removeTask('watch')

    this.#configurePackage(options)
    this.#configureTypeScript(options)
    this.#configureSWC(options)
    this.#configureProjenrc(options)

    if (this.parent) {
      this.tryRemoveFile('.gitattributes')
      this.tasks.tryFind('default')?.reset()
      this.tasks.tryFind('install')?.reset()
      this.tasks.tryFind('install:ci')?.reset()
    }

    this.#configureESLint(options)
    this.#configurePrettier(options)

    this.#configureBabel(options)
    this.#configureBeachball(options)
    this.#configureCargo(options)
    this.#configureCodeowners(options)
    this.#configureEditorConfig(options)
    this.#configureGitAttributes()
    this.#configureHusky(options)
    this.#configureJestConfig(options)
    this.#configureLicense(options)
    this.#configureLintStaged(options)
    this.#configureLintSynthesized(options)
    this.#configureNpmIgnore(options)
    this.#configurePnpmWorkspace(options)
    this.#configureReadme(options)
    this.#configureRenovate(options)
  }

  /**
   * Annotate generated files on root projects.
   */
  override annotateGenerated(glob: string): void {
    if (this.parent) {
      if (path.isAbsolute(glob)) {
        this.root.gitattributes.addAttributes(
          `/${path.relative(this.root.outdir, path.join(this.outdir, glob))}`,
          'linguist-generated',
        )
      }

      return
    }

    this.gitattributes.addAttributes(glob, 'linguist-generated')
  }

  override preSynthesize(): void {
    super.preSynthesize()

    this.#populateTypeScriptProjectReferencesFromDependencies()
  }

  get allSubprojects(): BaseProject[] {
    return this.root.node
      .findAll(0)
      .filter((node) => node !== this.root)
      .filter((node): node is BaseProject => node instanceof BaseProject)
  }

  get allSubprojectsKind(): Project[] {
    return this.allSubprojects.filter(
      (project): project is Project => project instanceof Project,
    )
  }

  /**
   * Add a subproject.
   */
  addSubproject(
    projectOptions: ProjectOptions,
    ...compose: Array<(project: Project) => void>
  ): Project {
    const project = new Project({
      parent: this,
      ...projectOptions,
    })

    for (const callback of compose) {
      callback(project)
    }

    return project
  }

  /**
   * Find a project by it's name, e.g. `@acme/some`.
   */
  findSubproject(name: string): Project | undefined {
    return this.allSubprojectsKind.find((project) => project.name === name)
  }

  /**
   * Add development dependencies a feature needs, without overriding versions
   * the project declared for itself.
   *
   * Every `#configure*` hook runs after `#configurePackage` has registered
   * `package.devDeps`, and Projen's `Dependencies` is last-writer-wins, so an
   * unconditional `addDevDeps` silently replaces the version the project asked
   * for. That is invisible until a bot tries to upgrade one of these packages:
   * the bump is reverted by the next synthesis, the pull request merges as a
   * no-op, and the dependency is proposed again forever.
   *
   * Only `BUILD` declarations are consulted, which is the type `addDevDeps`
   * writes; a package the project lists as a runtime dependency is still added
   * here, exactly as before.
   */
  #addDefaultDevDeps(...specs: string[]) {
    for (const spec of specs) {
      // `MODULE[@VERSION]`, where `MODULE` may itself be scoped and so start
      // with an `@` of its own.
      const separator = spec.lastIndexOf('@')
      const name = separator > 0 ? spec.slice(0, separator) : spec
      const version = separator > 0 ? spec.slice(separator + 1) : '*'

      const declared = this.deps.tryGetDependency(name, DependencyType.BUILD)

      if (declared) {
        this.#assertSupported(name, declared.version)
        continue
      }

      // eslint-disable-next-line no-restricted-syntax
      this.package?.addDevDeps(spec)

      // A default that resolves rather than dictates — `*` takes whatever is
      // installed, `workspace:*` the sibling package — already tracks upgrades,
      // so leave those to the bot. A literal version is re-asserted on every
      // synthesis and is what #ownedDevDeps exists to protect.
      if (version !== '*' && !version.startsWith('workspace:')) {
        this.#ownedDevDeps.add(name)
      }
    }
  }

  /**
   * Fail synthesis when a project declares a version this preset cannot
   * support.
   *
   * A declared version only began taking effect in 0.23.0 — before that a
   * feature pin overwrote it, so a declaration could sit stale for a long
   * time with nothing to show for it. Honouring one of those now would
   * quietly move the project onto a version this preset was never built
   * against, and the failure surfaces later as an unexplained diff in a
   * generated file rather than as the downgrade it is.
   *
   * The bound is the preset's own `peerDependencies` entry, so the range is
   * declared in one reviewable place and widening support is a deliberate
   * edit rather than a number buried in a hook. Staying behind is fine as
   * long as the range allows it.
   *
   * Only concrete versions are checked. A range or `*` is the project asking
   * to resolve rather than naming a version, and `workspace:` is not semver
   * at all.
   */
  #assertSupported(name: string, declared: string | undefined) {
    const supported = SUPPORTED_VERSIONS[name]

    if (!declared || !supported || !valid(declared)) {
      return
    }

    if (satisfies(declared, supported)) {
      return
    }

    throw new Error(
      `This project declares ${name}@${declared}, which @langri-sha/projen-project does not support — its peer range is ${supported}.\n\n` +
        `Raise the declaration to satisfy ${supported}, or remove it from \`package.devDeps\` and take the version the preset supplies.`,
    )
  }

  #configureBabel({ babel, package: pkg }: ProjectOptions) {
    if (!babel) {
      return
    }

    const defaults: BabelOptions = {
      filename: pkg?.type === 'module' ? 'babel.config.js' : 'babel.config.mjs',
      options: {
        presets: ['@langri-sha/babel-preset'],
      },
    }

    this.babel = new Babel(this, deepMerge(defaults, babel))

    this.typeScriptConfig?.addFile(this.babel.path)
  }

  #configureBeachball({ beachball, package: pkg }: ProjectOptions) {
    if (!beachball || this.parent) {
      return
    }

    const defaults: BeachballOptions = {
      filename:
        pkg?.type === 'module' ? 'beachball.config.cjs' : 'beachball.config.js',
      config: {
        branch: 'origin/main',
        gitTags: false,
        ignorePatterns: [
          '*.test.*',
          '.*/**',
          '__snapshots__/',
          'dist/',
          'node_modules/',
        ],
      },
    }

    this.beachball = new Beachball(this, deepMerge(defaults, beachball))

    this.prettier?.ignore.addPatterns('CHANGELOG.md')
    this.#addDefaultDevDeps('beachball@2.65.5')
    this.typeScriptConfig?.addFile(this.beachball!.path)
  }

  /**
   * Set up Cargo, as a workspace at the root and as a crate in it below.
   *
   * A crate inherits exactly the keys the workspace offers in
   * `[workspace.package]`, so that the edition, licence and authorship are
   * declared once and a crate that wants its own still says so. It registers
   * itself as a member on the way, which is the pairing that otherwise drifts:
   * a subproject added here and a path forgotten over there.
   */
  #configureCargo({ cargo }: ProjectOptions) {
    if (!cargo) {
      return
    }

    if (!this.parent) {
      const defaults: CargoOptions = {
        workspace: {
          resolver: '3',
          package: {
            edition: '2024',
          },
        },
      }

      this.cargo = new CargoWorkspace(this, deepMerge(defaults, cargo))

      return
    }

    const workspace =
      this.root instanceof Project && this.root.cargo instanceof CargoWorkspace
        ? this.root.cargo
        : undefined

    const inherited = Object.fromEntries(
      (workspace?.inheritable ?? []).map((key) => [key, { workspace: true }]),
    )

    this.cargo = new CargoPackage(this, {
      ...cargo,
      package: {
        name: this.name.replace(/^@[^/]+\//, ''),
        ...inherited,
        ...cargo.package,
      },
    })

    workspace?.addMember(
      path.relative(this.root.outdir, this.outdir).split(path.sep).join('/'),
    )
  }

  #configureCodeowners({ codeowners: codeownersOptions }: ProjectOptions) {
    if (!codeownersOptions) {
      return
    }

    this.codeowners = new Codeowners(this, codeownersOptions)
  }

  #configureEditorConfig({
    editorConfig: editorConfigOptions,
  }: ProjectOptions) {
    if (!editorConfigOptions || this.parent) {
      return
    }

    const defaults: EditorConfigOptions = {
      '*': {
        charset: 'utf-8',
        end_of_line: 'lf',
        indent_style: 'space',
        indent_size: 2,
        insert_final_newline: true,
        trim_trailing_whitespace: true,
      },
      Dockerfile: {
        indent_style: 'tab',
      },
    }

    this.editorConfig = new EditorConfig(
      this,
      deepMerge(editorConfigOptions ?? {}, defaults),
    )

    this.prettier?.ignore.addPatterns('!.editorconfig')
  }

  #configureGitAttributes() {
    this.annotateGenerated('/.gitignore')
    this.annotateGenerated('/.projen/**')
    this.annotateGenerated(`/${this.gitattributes.path}`)
  }

  #configureESLint({ eslint, package: pkg }: ProjectOptions) {
    if (!eslint) {
      return
    }

    const defaults: ESLintOptions = {
      filename:
        pkg?.type === 'module' ? 'eslint.config.js' : 'eslint.config.mjs',
      ignorePatterns: ['**/.*', '**/dist/'],
      extends: '@langri-sha/eslint-config',
    }

    this.eslint = new ESLint(this, deepMerge(defaults, eslint))

    if (this.projenrc?.filePath) {
      this.eslint.ignorePatterns.push(`!${this.projenrc.filePath}`)
    }

    this.typeScriptConfig?.addFile(this.eslint.path)
  }

  #configureHusky({ husky: huskyOptions }: ProjectOptions) {
    if (!huskyOptions || this.parent) {
      return
    }

    this.husky = new Husky(this, huskyOptions)

    this.#addDefaultDevDeps('husky@9.1.7')
    this.package?.setScript('prepare', 'husky')
    this.tryFindObjectFile('package.json')?.addDeletionOverride('pnpm')
  }

  #configureJestConfig({ jestConfig: jestConfigOptions }: ProjectOptions) {
    if (!jestConfigOptions || this.parent) {
      return
    }

    this.jestConfig = new JestConfig(this, jestConfigOptions)

    this.typeScriptConfig?.addFile(this.jestConfig.path)
  }

  #configureLicense({ package: pkg }: ProjectOptions) {
    if (!pkg?.license) {
      return
    }

    if (!pkg.authorName) {
      throw new Error(
        'Missing package author name. Set `package.authorName` in the project',
      )
    }

    this.license = new License(this, {
      spdx: pkg.license,
      copyrightHolder: [
        pkg.authorName,
        pkg.authorEmail ? `<${pkg.authorEmail}>` : undefined,
        pkg.authorUrl ? `(${pkg.authorUrl})` : undefined,
      ]
        .filter(Boolean)
        .join(' '),
      year: pkg.copyrightYear ?? new Date().getFullYear().toString(),
    })
  }

  #configureLintStaged({ lintStaged, package: pkg }: ProjectOptions) {
    if (!lintStaged) {
      return
    }

    const defaults: LintStagedOptions = {
      filename:
        pkg?.type === 'module'
          ? 'lint-staged.config.js'
          : 'lint-staged.config.mjs',
      extends: '@langri-sha/lint-staged',
    }

    this.lintStaged = new LintStaged(this, deepMerge(defaults, lintStaged))

    this.typeScriptConfig?.addFile(this.lintStaged!.path)
  }

  #configureLintSynthesized({
    eslint,
    lintSynthesized,
    prettier,
  }: ProjectOptions) {
    if (!lintSynthesized) {
      return
    }

    const defaults: LintSynthesizedOptions = {
      'package.json': 'pnpx sort-package-json',
      ...(eslint && {
        '*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}': 'pnpm eslint --fix',
      }),
      ...(prettier && { '*': 'pnpm prettier --write --ignore-unknown' }),
    }

    new LintSynthesized(this, deepMerge(defaults, lintSynthesized))
  }

  #configureNpmIgnore({
    typeScriptConfig,
    jestConfig,
    npmIgnore,
  }: ProjectOptions) {
    if (!npmIgnore) {
      return
    }

    const defaults: IgnoreFileOptions = {
      ignorePatterns: [
        '.*',
        ...(jestConfig ? ['*.test.*', '__snapshots__/'] : []),
        ...(typeScriptConfig ? ['tsconfig*.json'] : []),
      ],
    }

    this.npmIgnore = new IgnoreFile(
      this,
      '.npmignore',
      deepMerge(defaults, npmIgnore),
    )
  }

  #configurePackage({ package: pkg }: ProjectOptions) {
    if (!pkg) {
      return
    }

    const defaults: NodePackageOptions = {
      entrypoint: 'src/index.ts',
      packageManager: DEFAULT_PACKAGE_MANAGER,
    }

    this.package = new NodePackage(this, deepMerge(defaults, pkg))

    if (!this.parent) {
      this.#addDefaultDevDeps('@langri-sha/projen-project@*', 'projen@0.86.5')
    }

    this.package.removeScript('start')
    this.package.removeScript('test')

    if (this.parent) {
      this.package.removeScript('default')
    }
  }

  #configurePnpmWorkspace({ pnpmWorkspace, swcrc }: ProjectOptions) {
    if (!pnpmWorkspace) {
      return
    }

    const defaults: PnpmWorkspaceOptions = {
      allowBuilds: {
        '@swc/core': Boolean(swcrc),
        esbuild: false,
        'unrs-resolver': false,
      },
    }

    this.pnpmWorkspace = new PnpmWorkspace(
      this,
      deepMerge(defaults, pnpmWorkspace),
    )
  }

  #configurePrettier({ prettier, package: pkg }: ProjectOptions) {
    if (!prettier || this.parent) {
      return
    }

    const defaults: PrettierOptions = {
      filename:
        pkg?.type === 'module' ? 'prettier.config.js' : 'prettier.config.mjs',
      extends: '@langri-sha/prettier',
      ignorePatterns: ['.*', 'dist/'],
    }

    this.prettier = new Prettier(this, deepMerge(defaults, prettier))

    if (this.projenrc?.filePath) {
      this.prettier.ignore.include(this.projenrc.filePath)
    }

    if (this.package?.packageManager === javascript.NodePackageManager.PNPM) {
      this.prettier.ignore.addPatterns('pnpm-lock.yaml')
    }

    this.typeScriptConfig?.addFile(this.prettier!.path)
  }

  #configureProjenrc({ package: pkg }: ProjectOptions) {
    this.projenrc = new ProjenrcFile(this, {
      filename: pkg?.type === 'module' ? '.projenrc.ts' : '.projenrc.mts',
    })

    if (!this.parent) {
      this.typeScriptConfig?.addFile(this.projenrc.filePath)
    }
  }

  #configureReadme({ readme }: ProjectOptions) {
    if (!readme) {
      return
    }

    this.readme = new ReadmeFile(this, readme)
  }

  #configureRenovate({
    renovate: renovateOptions,
    package: pkg,
  }: ProjectOptions) {
    if (!renovateOptions || this.parent) {
      return
    }

    // The `node` datasource below is LTS-gated, but the npm datasource that
    // manages `@types/node` is not, so the typings otherwise jump to each new
    // Node major the day DefinitelyTyped publishes it. Constrain them to the
    // major `minNodeVersion` targets so both pins move together.
    const nodeTypesMajor = pkg?.minNodeVersion?.match(/^(\d+)\./)?.[1]

    const defaults: RenovateOptions = {
      configMigration: true,
      extends: ['config:recommended'],
      labels: ['dependencies'],
      minimumReleaseAge: RENOVATE_MINIMUM_RELEASE_AGE,
      reviewersFromCodeOwners: true,
      lockFileMaintenance: {
        enabled: true,
      },
      packageRules: [
        {
          description: 'Prioritize updates in Projen configurations',
          matchFileNames: ['/\\.?projen.*\\.(js|cjs|mjs|ts|mts|cts)$/'],
          enabled: true,
        },
        ...(nodeTypesMajor
          ? [
              {
                description:
                  'Keep Node.js typings on the major supported by the runtime',
                matchPackageNames: ['@types/node'],
                allowedVersions: `^${nodeTypesMajor}`,
              },
            ]
          : []),
        // The manifest carries these versions only because this preset put
        // them there. Left enabled, every upgrade Renovate proposed against it
        // would be undone by the next synthesis and reopened on the run after
        // that. They are upgraded where they are written instead, in this
        // preset, and reach projects with its next release.
        //
        // Scoped to the npm manager, which is the one reading the manifest and
        // the lockfile. The custom managers above read `.projenrc` files —
        // including this preset's own sources, where these pins are declared —
        // and must stay enabled or the versions could never move at all.
        //
        // Declaring one of these in `.projenrc.ts` takes it off this list, and
        // `#addDefaultDevDeps` then leaves that version alone — so opting a
        // package back into upgrades here is a one-line change over there.
        ...(this.#ownedDevDeps.size
          ? [
              {
                description:
                  'Versions owned by @langri-sha/projen-project. Declare the dependency in `.projenrc.ts` to manage it here instead',
                matchManagers: ['npm'],
                matchPackageNames: [...this.#ownedDevDeps].sort(),
                enabled: false,
              },
            ]
          : []),
      ],
      customManagers: [
        {
          customType: 'regex',
          datasourceTemplate: 'node',
          depNameTemplate: 'node',
          versioningTemplate: 'node',
          currentValueTemplate: '>= {{currentValue}}',
          managerFilePatterns: ['/\\.?projen.*.(js|cjs|mjs|ts|mts|cts)$/'],
          matchStrings: ["minNodeVersion:\\s*'(?<currentValue>[^']+)'"],
        },
        {
          customType: 'regex',
          datasourceTemplate: 'npm',
          managerFilePatterns: ['/\\.?projen.*.(js|cjs|mjs|ts|mts|cts)$/'],
          matchStringsStrategy: 'recursive',
          matchStrings: [
            // `#addDefaultDevDeps` is this package's own private helper, and
            // the private-name `#` sits between the dot and the method name.
            // It is matched here so the pins it carries stay upgradable; the
            // paths of the files declaring them contain `projen`, so they are
            // covered by `managerFilePatterns` above.
            '\\.#?(?<depType>addDeps|addDevDeps|addPeerDeps|addDefaultDevDeps)\\([^)]*\\)',
            "'(?<depName>@?[\\w-\\/]+)@(?<currentValue>[^']+)'",
          ],
          // Anything that is not explicitly a runtime or peer dependency is a
          // development dependency, so that every `*DevDeps` spelling maps to
          // `devDependencies` rather than falling through to peers.
          depTypeTemplate:
            "{{#if (equals depType 'addDeps')}}dependencies{{else if (equals depType 'addPeerDeps')}}peerDependencies{{else}}devDependencies{{/if}}",
        },
        {
          customType: 'regex',
          datasourceTemplate: 'npm',
          managerFilePatterns: ['/\\.?projen.*.(js|cjs|mjs|ts|mts|cts)$/'],
          matchStringsStrategy: 'recursive',
          matchStrings: [
            '(?<depType>deps|devDeps|peerDeps):\\s*\\[[^\\]]*\\]',
            "'(?<depName>@?[\\w-\\/]+)@(?<currentValue>[^']+)'",
          ],
          depTypeTemplate:
            "{{#if (equals depType 'deps')}}dependencies{{else if (equals depType 'devDeps')}}devDependencies{{else}}peerDependencies{{/if}}",
        },
        // Crate versions live here; the synthesized `Cargo.toml` only repeats
        // them. Renovate's cargo manager keeps that manifest and `Cargo.lock`
        // current, so on its own it opens a pull request the next synthesis
        // reverts. Both name the same crate at the same version, so the two
        // land on one branch and the synthesis check stays green — which is
        // why the cargo manager is left enabled.
        //
        // Four narrowing passes: the table, its braces, one whole entry, then
        // the version inside it. Drop the second and `dependencies` is itself
        // read as a crate, since recursion feeds the whole match forward; drop
        // the third and a detail key is, turning a pinned `rev` into a proposal
        // to move onto a crates.io release.
        {
          customType: 'regex',
          datasourceTemplate: 'crate',
          managerFilePatterns: ['/\\.?projen.*.(js|cjs|mjs|ts|mts|cts)$/'],
          matchStringsStrategy: 'recursive',
          matchStrings: [
            "(?<depType>dependencies|dev-dependencies|build-dependencies)'?:\\s*\\{(?:[^{}]|\\{[^{}]*\\})*\\}",
            '\\{(?:[^{}]|\\{[^{}]*\\})*\\}',
            "'?(?<depName>[\\w-]+)'?:\\s*(?:'[^']*'|\\{[^{}]*\\})",
            // A bare requirement is the only string ahead of a brace that
            // never opens; in a table, the version is the key that says so.
            // Entries carrying neither — a path, a revision, the
            // `workspace = true` a member inherits with — are left alone.
            "(?:^[^{]*|version:\\s*)'(?<currentValue>[^']+)'",
          ],
        },
        {
          customType: 'regex',
          datasourceTemplate: 'npm',
          managerFilePatterns: ['/\\.?projen.*.(js|cjs|mjs|ts|mts|cts)$/'],
          matchStrings: ["pnpm@(?<currentValue>[^']+)"],
          depNameTemplate: 'pnpm',
          depTypeTemplate: 'dependencies',
        },
        {
          customType: 'regex',
          datasourceTemplate: 'npm',
          managerFilePatterns: ['/\\.(js|cjs|mjs|ts|mts|cts|ya?ml)$/'],
          matchStrings: [
            '(bun|p?np)x (?<depName>[\\w\\-\\/]+)@(?<currentValue>[^s]+)',
          ],
          depNameTemplate: 'pnpm',
          depTypeTemplate: 'dependencies',
        },
      ],
    }

    this.addTask('renovate', {
      description: 'Run Renovate locally for debugging',
      exec: 'pnpx renovate --platform=local --repository-cache=reset --dry-run=full',
    })

    this.renovate = new Renovate(this, deepMerge(defaults, renovateOptions))
  }

  #configureSWC({ swcrc, typeScriptConfig }: ProjectOptions) {
    if (!swcrc) {
      return
    }

    if (!this.parent) {
      this.#addDefaultDevDeps('@swc/core@1.15.47', '@swc-node/register@1.12.1')
    }

    const defaults: SWCConfigOptions = {
      $schema: 'https://json.schemastore.org/swcrc',
      ...(typeScriptConfig
        ? {
            jsc: {
              parser: {
                syntax: 'typescript',
              },
            },
          }
        : {}),
      env: {
        targets: {
          node: 'current',
        },
      },
    }

    this.swcrc = new SWCConfig(this, deepMerge(defaults, swcrc))
  }

  #configureTypeScript({ parent, typeScriptConfig, swcrc }: ProjectOptions) {
    if (!typeScriptConfig) {
      return
    }

    const defaults: TypeScriptConfigOptions = parent
      ? {
          config: {
            extends: '@langri-sha/tsconfig/project',
          },
        }
      : {
          config: {
            extends: '@langri-sha/tsconfig/base',
          },
        }

    const merged = deepMerge(defaults, typeScriptConfig)

    // `extends` may be a single configuration or an array of configurations
    // to combine (e.g. `@langri-sha/tsconfig` plus a project-specific
    // override). An explicit override always replaces the default outright
    // regardless of its shape, rather than being concatenated with it like
    // genuinely repeatable arrays (e.g. `exclude`) are elsewhere via
    // `deepMerge`.
    if (typeScriptConfig.config?.extends !== undefined) {
      merged.config = {
        ...merged.config,
        extends: typeScriptConfig.config.extends,
      }
    }

    this.typeScriptConfig = new TypeScriptConfig(this, merged)

    if (!this.parent) {
      this.#addDefaultDevDeps('typescript@5.9.3')

      if (!swcrc) {
        this.#addDefaultDevDeps('tsx@4.23.1')
      }
    }

    if (this.name !== '@langri-sha/tsconfig') {
      this.#addDefaultDevDeps('@langri-sha/tsconfig@*')
    }
  }

  #populateTypeScriptProjectReferencesFromDependencies() {
    if (this.parent || !this.package || !this.typeScriptConfig) {
      return
    }

    const subprojects = this.allSubprojectsKind.filter(
      (project) => project.package && project.typeScriptConfig,
    )

    const root = path.dirname(this.package!.file.absolutePath)

    for (const project of subprojects) {
      const from = path.dirname(project.package!.file.absolutePath)

      if (project.name !== '@langri-sha/tsconfig') {
        this.typeScriptConfig!.addReference(path.relative(root, from))
      }

      for (const dep of project.deps.all) {
        const reference = subprojects.find(({ name }) => name === dep.name)

        if (!reference) {
          continue
        }

        const to = path.dirname(reference.package!.file.absolutePath)

        project.typeScriptConfig!.addReference(path.relative(from, to))
      }
    }
  }
}

const getProjenCommand = ({ package: pkg }: ProjectOptions) =>
  PROJEN_COMMANDS[pkg?.packageManager ?? DEFAULT_PACKAGE_MANAGER]

const getGitIgnoreOptions = ({
  gitIgnoreOptions,
  husky: huskyOptions,
  parent,
  typeScriptConfig: typeScriptConfigOptions,
  withTerraform,
}: ProjectOptions): ProjectOptions['gitIgnoreOptions'] =>
  parent
    ? gitIgnoreOptions
    : {
        ignorePatterns: [
          ...`
    .*
    !.babelrc
    !.dockerignore
    !.editorconfig
    !.gitattributes
    !.gitignore
    !.gitkeep
    !.npmignore
    !.openssl
    !.prettierignore
    ${withTerraform ? '!.terraform.lock.hcl' : ''}
    ${withTerraform ? '*.tfstate' : ''}
    ${withTerraform ? '*.tfstate.*' : ''}
    ${withTerraform ? '*.tfvars' : ''}
    ${withTerraform ? '*.auto.tfvars' : ''}
    *.db
    *.log
    ${typeScriptConfigOptions ? '*.tsbuildinfo' : ''}

    !.github/
    ${huskyOptions ? '!.husky/' : ''}
    !.projen/
    dist/
    node_modules/
    `
            .split('\n')
            .map((pattern) => pattern.trim())
            .filter((pattern) => pattern.length > 0),
          ...(gitIgnoreOptions?.ignorePatterns ?? []),
        ],
      }

const deepMerge = R.mergeDeepWith(
  R.cond([
    // When both arguments are strings, use the right string.
    [R.allPass([R.is(String), R.is(String)]), R.nthArg(1)],
    // Same for booleans, which cannot be concatenated at all.
    [R.allPass([R.is(Boolean), R.is(Boolean)]), R.nthArg(1)],
    // Otherwise, concatenate.
    [R.T, R.concat],
  ]),
)
