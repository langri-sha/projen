import * as path from 'node:path'

import { Component, IgnoreFile, JsonFile, type Project, YamlFile } from 'projen'

/**
 * Argument override applied by a toolchain dependency.
 */
export interface DaggerModuleArgumentOptions {
  /**
   * Function chain the override applies to. Omit for the constructor.
   */
  readonly function?: string[]

  /**
   * Name of the argument to override.
   */
  readonly argument: string

  /**
   * Default value for the argument.
   */
  readonly default?: string

  /**
   * Default path for `File` or `Directory` arguments.
   */
  readonly defaultPath?: string

  /**
   * Default address for `Container` arguments.
   */
  readonly defaultAddress?: string

  /**
   * Ignore patterns for `Directory` arguments.
   */
  readonly ignore?: string[]
}

/**
 * A module referenced by another module, as a dependency, a blueprint or a
 * toolchain.
 */
export interface DaggerModuleDependencyOptions {
  /**
   * Name the dependency is addressed by.
   *
   * Defaults to the last path segment of the source, which is the name
   * `dagger install` writes for a sibling module.
   */
  readonly name?: string

  /**
   * Source ref of the dependency, e.g. `../tailscale` or
   * `github.com/user/repo/module@v1.2.3`.
   */
  readonly source: string

  /**
   * Version the dependency is pinned to. Written by `dagger install` for
   * remote refs.
   */
  readonly pin?: string

  /**
   * Argument overrides, for toolchains only.
   */
  readonly customizations?: DaggerModuleArgumentOptions[]

  /**
   * Glob patterns of checks to exclude, for toolchains only.
   */
  readonly ignoreChecks?: string[]

  /**
   * Glob patterns of generators to exclude, for toolchains only.
   */
  readonly ignoreGenerators?: string[]

  /**
   * Glob patterns of services to exclude, for toolchains only.
   */
  readonly ignoreServices?: string[]

  /**
   * Port forwarding rules per service name, e.g. `{ web: ['3000:80'] }`. For
   * toolchains only.
   */
  readonly portMappings?: Record<string, string[]>
}

/**
 * A source ref, or the full dependency configuration.
 */
export type DaggerModuleDependency = string | DaggerModuleDependencyOptions

/**
 * A client generated for a module.
 */
export interface DaggerModuleClientOptions {
  /**
   * Generator the client is generated with.
   */
  readonly generator: string

  /**
   * Directory the client is generated into.
   */
  readonly directory: string
}

/**
 * Codegen configuration for a module.
 */
export interface DaggerModuleCodegenOptions {
  /**
   * Whether the SDK generates a `.gitignore` for the module.
   */
  readonly automaticGitignore?: boolean
}

export interface DaggerModuleOptions {
  /**
   * Name of the module.
   *
   * @default - the module directory name
   */
  readonly name?: string

  /**
   * SDK the module is implemented with, or `false` for a module without one.
   * @default 'typescript'
   */
  readonly sdk?: string | false

  /**
   * Version the SDK is pinned to, for SDKs loaded from a git ref.
   */
  readonly sdkPin?: string

  /**
   * Modules this module depends on.
   */
  readonly dependencies?: DaggerModuleDependency[]

  /**
   * Blueprint module this module is derived from.
   */
  readonly blueprint?: DaggerModuleDependency

  /**
   * Toolchain modules.
   */
  readonly toolchains?: DaggerModuleDependency[]

  /**
   * Paths to include from the module directory. Prefix a pattern with `!` to
   * exclude it.
   */
  readonly include?: string[]

  /**
   * Subdirectory holding the implementation, relative to `dagger.json`.
   *
   * `.` is dropped, the way `dagger init` writes it.
   */
  readonly source?: string

  /**
   * Clients generated for the module.
   */
  readonly clients?: DaggerModuleClientOptions[]

  /**
   * Codegen configuration.
   */
  readonly codegen?: DaggerModuleCodegenOptions

  /**
   * Whether to opt the module out of default function caching.
   */
  readonly disableDefaultFunctionCaching?: boolean

  /**
   * `$schema` to declare in the manifest. Dagger preserves it verbatim.
   *
   * @default - omitted
   */
  readonly schema?: string
}

export interface DaggerWorkflowOptions {
  /**
   * Checkout action reference.
   * @default 'actions/checkout@v7'
   */
  readonly checkoutAction?: string

  /**
   * PNPM setup action reference.
   * @default 'langri-sha/github/actions/pnpm@11.25.0'
   */
  readonly pnpmSetupAction?: string
}

export interface DaggerOptions {
  /**
   * Patterns for `.prettierignore` to skip SDK-managed files.
   * Added automatically when a `.prettierignore` file exists on the project.
   *
   * Defaults to each module's `dagger.json`, `package.json`, `tsconfig.json`
   * and `sdk/` directory.
   */
  readonly prettierIgnorePatterns?: string[]

  /**
   * Gitignore patterns for SDK-generated output.
   *
   * Defaults to every `sdk/` directory and `*.tsbuildinfo`.
   */
  readonly gitignorePatterns?: string[]

  /**
   * CI workflow options, or `false` to disable workflow generation.
   * @default {}
   */
  readonly workflow?: DaggerWorkflowOptions | false

  /**
   * Module manifests to synthesize, keyed by the module directory.
   *
   * @default {}
   */
  readonly modules?: Record<string, DaggerModuleOptions>

  /**
   * Engine version recorded in every module manifest, e.g. `v0.21.7`.
   *
   * Required to declare a module. Renovate moves the pin here rather than in
   * the manifests, so this is the one place the repository names an engine.
   */
  readonly engineVersion?: string
}

/**
 * A component for Dagger TypeScript module repositories.
 *
 * Synthesizes each module's `dagger.json`, sets up tasks, gitignore patterns,
 * an optional CI workflow, and exposes Renovate configuration for engine
 * version management.
 *
 * Spread {@link customManagers} and {@link packageRules} into your Renovate
 * options to enable automatic engine upgrades.
 */
export class Dagger extends Component {
  /**
   * Renovate custom managers that track the engine version in the projenrc.
   */
  readonly customManagers: object[]

  /**
   * Renovate package rules for Dagger module repositories.
   */
  readonly packageRules: object[]

  /**
   * Synthesized module manifests, keyed by the module directory.
   */
  readonly modules: Record<string, JsonFile> = {}

  readonly #engineVersion?: string

  constructor(project: Project, options?: DaggerOptions) {
    super(project)

    this.#engineVersion = options?.engineVersion

    this.customManagers = [
      {
        customType: 'regex',
        datasourceTemplate: 'github-releases',
        depNameTemplate: 'dagger/dagger',
        managerFilePatterns: ['/\\.?projen.*\\.(js|cjs|mjs|ts|mts|cts)$/'],
        matchStrings: ["engineVersion:\\s*'v(?<currentValue>[^']+)'"],
        extractVersionTemplate: '^v(?<version>.+)$',
      },
    ]

    this.packageRules = [
      {
        description:
          'The Dagger SDK writes the module manifests, including the TypeScript pin',
        matchManagers: ['npm'],
        matchFileNames: ['*/package.json'],
        enabled: false,
      },
      {
        description:
          'Track the TypeScript major the Dagger SDK installs into the modules',
        matchManagers: ['npm'],
        matchPackageNames: ['typescript'],
        allowedVersions: '^5',
        enabled: true,
      },
    ]

    project.addTask('dagger:develop', {
      description: 'Regenerate sdk/ for every Dagger module',
      exec: 'status=0; for m in */dagger.json; do [ -e "$m" ] || continue; (cd "$(dirname "$m")" && dagger develop) || status=1; done; exit $status',
    })

    project.addTask('check:types', {
      description: 'Typecheck every Dagger module against its generated sdk/',
      exec: 'status=0; for m in */dagger.json; do [ -e "$m" ] || continue; tsc --noEmit -p "$(dirname "$m")" || status=1; done; exit $status',
    })

    const gitignorePatterns = options?.gitignorePatterns ?? [
      '**/sdk/',
      '*.tsbuildinfo',
    ]
    project.gitignore.addPatterns(...gitignorePatterns)

    const prettierIgnorePatterns = options?.prettierIgnorePatterns ?? [
      '*/dagger.json',
      '*/package.json',
      '*/tsconfig.json',
      '*/sdk/',
    ]
    const prettierIgnore = project.tryFindFile('.prettierignore')
    if (prettierIgnore instanceof IgnoreFile) {
      prettierIgnore.addPatterns(...prettierIgnorePatterns)
    }

    if (options?.workflow !== false) {
      const workflowOptions =
        typeof options?.workflow === 'object' ? options.workflow : {}
      this.#createWorkflow(project, workflowOptions)
    }

    for (const [directory, moduleOptions] of Object.entries(
      options?.modules ?? {},
    )) {
      this.addModule(directory, moduleOptions)
    }
  }

  /**
   * Synthesizes a `dagger.json` for a module directory.
   *
   * The manifest is written in the field order and formatting the Dagger CLI
   * marshals, so `dagger develop` leaves it untouched.
   */
  addModule(directory: string, options: DaggerModuleOptions = {}): JsonFile {
    if (!this.#engineVersion) {
      throw new Error(
        `Cannot add the Dagger module "${directory}" without an engineVersion. Pass one to the Dagger component.`,
      )
    }

    const file = new JsonFile(
      this.project,
      path.posix.join(directory, 'dagger.json'),
      {
        // The CLI round-trips the manifest through its own struct and drops
        // every field it does not know, the marker included.
        marker: false,
        obj: {
          $schema: options.schema,
          name: options.name ?? path.posix.basename(directory),
          engineVersion: this.#engineVersion,
          sdk:
            options.sdk === false
              ? undefined
              : {
                  source: options.sdk ?? 'typescript',
                  pin: options.sdkPin,
                },
          blueprint: options.blueprint && renderDependency(options.blueprint),
          toolchains: options.toolchains?.map(renderDependency),
          include: options.include,
          dependencies: options.dependencies?.map(renderDependency),
          // `dagger init` writes the implicit root as an absent field.
          source: options.source === '.' ? undefined : options.source,
          codegen: options.codegen,
          clients: options.clients,
          disableDefaultFunctionCaching: options.disableDefaultFunctionCaching,
        },
        omitEmpty: true,
      },
    )

    this.modules[directory] = file

    return file
  }

  #createWorkflow(project: Project, options: DaggerWorkflowOptions) {
    const checkoutAction = options.checkoutAction ?? 'actions/checkout@v7'
    const pnpmSetupAction =
      options.pnpmSetupAction ?? 'langri-sha/github/actions/pnpm@11.25.0'

    const paths = [
      '.github/workflows/modules.yml',
      '*/dagger.json',
      '*/package.json',
      '*/src/**',
      '*/tsconfig.json',
    ]

    new YamlFile(project, '.github/workflows/modules.yml', {
      obj: {
        name: 'Modules',
        on: {
          push: {
            branches: ['main'],
            paths,
          },
          pull_request: {
            paths,
          },
        },
        jobs: {
          typecheck: {
            name: 'Typecheck',
            'runs-on': 'ubuntu-latest',
            permissions: {
              contents: 'read',
            },
            steps: [
              {
                name: 'Checkout',
                uses: checkoutAction,
                with: { 'persist-credentials': false },
              },
              {
                name: 'Setup PNPM',
                uses: pnpmSetupAction,
              },
              {
                name: 'Resolve engine version',
                id: 'engine',
                run: [
                  'set -o pipefail',
                  '',
                  'versions=$(jq -r .engineVersion */dagger.json | sort -u)',
                  '',
                  'if [[ -z "$versions" || "$versions" == *null* ]]; then',
                  '  echo "::error::Could not resolve engineVersion from */dagger.json"',
                  '  exit 1',
                  'fi',
                  '',
                  'if [[ $(wc -l <<< "$versions") -ne 1 ]]; then',
                  '  echo "::error::Modules disagree on engineVersion: $(tr \'\\n\' \' \' <<< "$versions")"',
                  '  exit 1',
                  'fi',
                  '',
                  'echo "version=${versions#v}" >> "$GITHUB_OUTPUT"',
                ].join('\n'),
              },
              {
                name: 'Install Dagger',
                env: {
                  DAGGER_VERSION: '${{ steps.engine.outputs.version }}',
                },
                run: [
                  'curl -fsSL https://dl.dagger.io/dagger/install.sh |',
                  '  BIN_DIR=/usr/local/bin sh',
                ].join('\n'),
              },
              {
                name: 'Generate SDKs',
                run: 'pnpm dagger:develop',
              },
              {
                name: 'Check for drift',
                run: [
                  'if [[ $(git status --porcelain) ]]; then',
                  "  echo '::error::`dagger develop` rewrote tracked files. Regenerate them locally and commit the result.'",
                  '  git status --porcelain',
                  '  git diff',
                  '  exit 1',
                  'fi',
                ].join('\n'),
              },
              {
                name: 'Typecheck',
                run: 'pnpm check:types',
              },
            ],
          },
        },
      },
    })
  }
}

function renderDependency(dependency: DaggerModuleDependency) {
  const options =
    typeof dependency === 'string' ? { source: dependency } : dependency

  return {
    name: options.name ?? dependencyName(options.source),
    source: options.source,
    pin: options.pin,
    customizations: options.customizations,
    ignoreChecks: options.ignoreChecks,
    ignoreGenerators: options.ignoreGenerators,
    ignoreServices: options.ignoreServices,
    portMappings: options.portMappings,
  }
}

/**
 * Derives the name `dagger install` records for a source ref, by taking its
 * last path segment without any version suffix.
 */
function dependencyName(source: string): string {
  const [ref] = source.split('@')

  return path.posix.basename(ref ?? source)
}
