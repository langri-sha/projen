import { Component, IgnoreFile, type Project, YamlFile } from 'projen'

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
   * Defaults to each module's `package.json`, `tsconfig.json` and `sdk/`
   * directory.
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
}

/**
 * A component for Dagger TypeScript module repositories.
 *
 * Sets up tasks, gitignore patterns, an optional CI workflow, and exposes
 * Renovate configuration for dagger.json engine version management.
 *
 * Spread {@link customManagers} and {@link packageRules} into your Renovate
 * options to enable automatic engine upgrades.
 */
export class Dagger extends Component {
  /**
   * Renovate custom managers for `dagger.json` engine version tracking.
   */
  readonly customManagers: object[]

  /**
   * Renovate package rules for Dagger module repositories.
   */
  readonly packageRules: object[]

  constructor(project: Project, options?: DaggerOptions) {
    super(project)

    this.customManagers = [
      {
        customType: 'regex',
        datasourceTemplate: 'github-releases',
        depNameTemplate: 'dagger/dagger',
        managerFilePatterns: ['/(^|/)dagger\\.json$/'],
        matchStrings: ['"engineVersion":\\s*"v(?<currentValue>[^"]+)"'],
        extractVersionTemplate: '^v(?<version>.+)$',
      },
    ]

    this.packageRules = [
      {
        description:
          'Move every module off one engine release at a time, the way dagger develop writes them',
        groupName: 'Dagger engine',
        groupSlug: 'dagger-engine',
        matchDepNames: ['dagger/dagger'],
      },
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
