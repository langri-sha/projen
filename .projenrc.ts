import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Project, TypeScriptConfig } from '@langri-sha/projen-project'
import { SampleFile } from 'projen'

const pkg = {
  authorEmail: 'filip.dupanovic@gmail.com',
  authorName: 'Filip Dupanović',
  authorOrganization: false,
  authorUrl: 'https://langri-sha.com',
  bugsUrl: 'https://github.com/langri-sha/projen/issues',
  license: 'MIT',
  licensed: true,
  peerDependencyOptions: {
    pinnedDevDependency: false,
  },
}

// ponytail: projen's peer range lives here so a bump is one edit rather than
// seventeen. The `peerDeps:` key is load-bearing — Renovate's projenrc
// customManager keys off that literal to locate and widen the range, so
// renaming it silently stops Renovate from updating projen's peer anywhere.
const projenPeer = {
  peerDeps: ['projen@^0.86.0'],
}

const project = new Project({
  name: 'projen',
  package: {
    ...pkg,
    copyrightYear: '2016',
    homepage: 'https://github.com/langri-sha/projen',
    minNodeVersion: '24.16.0',
    repository: 'langri-sha/projen',
    type: 'module',

    devDeps: [
      '@langri-sha/eslint-config@0.9.17',
      '@langri-sha/lint-staged@0.9.8',
      '@langri-sha/prettier@0.4.9',
      '@langri-sha/projen-project@workspace:*',
      '@langri-sha/tsconfig@1.1.0',
      '@types/node@24.19.0',
      'schemastore-to-typescript@1.0.1',
      'vitest@5.0.2',
    ],
  },
  beachball: {
    config: {
      ignorePatterns: ['.gitignore', 'tsconfig.json', '**/.projen/**'],
    },
  },
  codeowners: {
    '*': '@langri-sha',
  },
  editorConfig: {},
  eslint: {
    ignorePatterns: [
      '**/cargo.ts',
      '**/pnpm-workspace.ts',
      '**/pyproject.ts',
      '**/renovate.ts',
      '**/rustfmt.ts',
      '**/swcrc.ts',
      '**/uv.ts',
    ],
    config: [
      {
        files: ['packages/*/src/**/*.ts'],
        rules: {
          'no-restricted-syntax': [
            'error',
            {
              selector: 'CallExpression[callee.property.name="addDevDeps"]',
              message:
                'Call #addDefaultDevDeps instead, so a version the project declared for itself is not overwritten.',
            },
          ],
        },
      },
    ],
  },
  husky: {
    'pre-commit': 'lint-staged',
  },
  lintStaged: {},
  lintSynthesized: {},
  prettier: {
    ignorePatterns: [
      '*.frag',
      'cargo.ts',
      'dagger.ts',
      'pnpm-workspace.ts',
      'pyproject.ts',
      'renovate.ts',
      'rustfmt.ts',
      'swcrc.ts',
      'uv.ts',
    ],
  },
  pnpmWorkspace: {
    packages: ['packages/*'],
    minimumReleaseAgeExclude: ['@langri-sha/*', 'schemastore-to-typescript'],
    allowBuilds: {
      '@swc/core': true,
      esbuild: true,
      'unrs-resolver': true,
    },
  },
  readme: {
    filename: 'readme.md',
  },
  renovate: {
    packageRules: [
      {
        description: 'Update our own packages together',
        groupName: 'langri-sha projen toolchain',
        groupSlug: 'langri-sha-projen',
        matchPackageNames: ['@langri-sha/**', 'schemastore-to-typescript'],
      },
      {
        description: 'Install our own packages without waiting them out',
        matchPackageNames: ['@langri-sha/**', 'schemastore-to-typescript'],
        minimumReleaseAge: null,
      },
      {
        description:
          'Install our own GitHub Actions and Terraform modules without waiting them out',
        matchPackageNames: ['langri-sha/**'],
        minimumReleaseAge: null,
      },
    ],
  },
  swcrc: {},
  typeScriptConfig: {},
})

project.package?.addField('private', true)
project.package?.addField('packageManager', 'pnpm@12.8.1')
project.package?.addEngine('pnpm', '>= 11.0.0')

project.gitattributes.addAttributes(
  'readme',
  'text=auto',
  'linguist-language=Markdown',
)

const subproject = (project: Project) => {
  new SampleFile(project, project.package?.entrypoint ?? 'src/index.ts', {
    contents: 'export {}',
  })

  project.package?.addField('repository', {
    type: 'git',
    url: 'git+https://github.com/langri-sha/projen.git',
    directory: path.relative(
      path.dirname(fileURLToPath(import.meta.url)),
      project.outdir,
    ),
  })

  project.package?.addDevDeps('@langri-sha/tsconfig@1.1.0')
}

const test = (project: Project) => {
  project.npmIgnore?.exclude('*.test.*', '__snapshots__/')
  project.package?.addDevDeps('@langri-sha/vitest@0.2.1')
}

const publish = (project: Project) => {
  project.package?.addField('publishConfig', {
    access: 'public',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
  })

  new TypeScriptConfig(project, {
    fileName: 'tsconfig.build.json',
    config: {
      extends: '@langri-sha/tsconfig/build',
      exclude: ['**/*.test.*'],
    },
  })

  project.package?.setScript(
    'prepublishOnly',
    'rm -rf dist; tsc --project tsconfig.build.json',
  )
}

project.addSubproject(
  {
    name: '@langri-sha/projen-codeowners',
    outdir: path.join('packages', 'projen-codeowners'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-dagger',
    outdir: path.join('packages', 'projen-dagger'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      type: 'module',
      devDeps: ['schemastore-to-typescript@1.0.1'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('dagger.ts')

    project.package?.setScript(
      'prepare',
      "schemastore-to-typescript --no-cache 'Dagger module' src/dagger.ts",
    )

    project.package?.setScript(
      'prepublishOnly',
      'rm -rf dist; tsc --project tsconfig.build.json && test -f dist/dagger.d.ts',
    )
  },
)

project.addSubproject(
  {
    name: '@langri-sha/projen-babel',
    outdir: path.join('packages', 'projen-babel'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['serialize-javascript@7.1.2'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['@babel/core@^8.0.0', ...projenPeer.peerDeps],
      peerDependenciesMeta: {
        '@babel/core': {
          optional: true,
        },
      },
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-beachball',
    outdir: path.join('packages', 'projen-beachball'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      peerDeps: ['beachball@^2.0.0', ...projenPeer.peerDeps],
      peerDependenciesMeta: {
        beachball: {
          optional: true,
        },
      },
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-cargo',
    outdir: path.join('packages', 'projen-cargo'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      type: 'module',
      devDeps: ['schemastore-to-typescript@1.0.1'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('cargo.ts')
    project.addGitIgnore('rustfmt.ts')

    project.package?.setScript(
      'prepare',
      [
        "schemastore-to-typescript --no-cache 'cargo manifest' src/cargo.ts",
        'schemastore-to-typescript --no-cache rustfmt src/rustfmt.ts',
      ].join(' && '),
    )

    project.package?.setScript(
      'prepublishOnly',
      'rm -rf dist; tsc --project tsconfig.build.json && test -f dist/cargo.d.ts && test -f dist/rustfmt.d.ts',
    )
  },
)

project.addSubproject(
  {
    name: '@langri-sha/projen-editorconfig',
    outdir: path.join('packages', 'projen-editorconfig'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-eslint',
    outdir: path.join('packages', 'projen-eslint'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['serialize-javascript@7.1.2'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['eslint@^10.4.0', ...projenPeer.peerDeps],
      peerDependenciesMeta: {
        eslint: {
          optional: true,
        },
      },
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-husky',
    outdir: path.join('packages', 'projen-husky'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      type: 'module',
      copyrightYear: '2024',
      devDeps: ['@types/node@24.19.0'],
      peerDeps: ['husky@^9.0.1', ...projenPeer.peerDeps],
      peerDependenciesMeta: {
        husky: {
          optional: true,
        },
      },
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-jest-config',
    outdir: path.join('packages', 'projen-jest-config'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['serialize-javascript@7.1.2'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['jest@^30.0.0', ...projenPeer.peerDeps],
      peerDependenciesMeta: {
        jest: {
          optional: true,
        },
      },
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-lint-synthesized',
    outdir: path.join('packages', 'projen-lint-synthesized'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['debug@4.4.3', 'execa@10.0.1', 'minimatch@10.2.6'],
      devDeps: ['@types/debug@4.1.13', 'prettier@3.9.9', 'projen@0.86.5'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-lint-staged',
    outdir: path.join('packages', 'projen-lint-staged'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['serialize-javascript@7.1.2'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['lint-staged@^17.0.0', ...projenPeer.peerDeps],
      peerDependenciesMeta: {
        'lint-staged': {
          optional: true,
        },
      },
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-license',
    outdir: path.join('packages', 'projen-license'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['license-o-matic@^1.2.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-pnpm-workspace',
    outdir: path.join('packages', 'projen-pnpm-workspace'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['yaml@2.9.1'],
      devDeps: ['schemastore-to-typescript@1.0.1'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('pnpm-workspace.ts')

    project.package?.setScript(
      'prepare',
      "schemastore-to-typescript --no-cache 'pnpm Workspace (pnpm-workspace.yaml)' src/pnpm-workspace.ts",
    )

    project.package?.setScript(
      'prepublishOnly',
      'rm -rf dist; tsc --project tsconfig.build.json && test -f dist/pnpm-workspace.d.ts',
    )
  },
)

project.addSubproject(
  {
    name: '@langri-sha/projen-prettier',
    outdir: path.join('packages', 'projen-prettier'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['serialize-javascript@7.1.2'],
      devDeps: ['@types/serialize-javascript@5.0.4', 'prettier@3.9.9'],
      peerDeps: ['prettier@^3.0.0', ...projenPeer.peerDeps],
      peerDependenciesMeta: {
        prettier: {
          optional: true,
        },
      },
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-project',
    outdir: path.join('packages', 'projen-project'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: [
        '@langri-sha/projen-babel@workspace:*',
        '@langri-sha/projen-beachball@workspace:*',
        '@langri-sha/projen-cargo@workspace:*',
        '@langri-sha/projen-codeowners@workspace:*',
        '@langri-sha/projen-dagger@workspace:*',
        '@langri-sha/projen-editorconfig@workspace:*',
        '@langri-sha/projen-eslint@workspace:*',
        '@langri-sha/projen-husky@workspace:*',
        '@langri-sha/projen-jest-config@workspace:*',
        '@langri-sha/projen-license@workspace:*',
        '@langri-sha/projen-lint-staged@workspace:*',
        '@langri-sha/projen-lint-synthesized@workspace:*',
        '@langri-sha/projen-pnpm-workspace@workspace:*',
        '@langri-sha/projen-prettier@workspace:*',
        '@langri-sha/projen-readme@workspace:*',
        '@langri-sha/projen-renovate@workspace:*',
        '@langri-sha/projen-swcrc@workspace:*',
        '@langri-sha/projen-typescript-config@workspace:*',
        '@langri-sha/projen-uv@workspace:*',
        '@langri-sha/projen-worktrunk@workspace:*',
        'ramda@0.32.0',
        'semver@7.8.5',
      ],
      devDeps: ['@types/ramda@0.32.0', '@types/semver@7.8.0'],
      peerDeps: [
        '@babel/core@^8.0.0',
        '@swc-node/register@^1.0.0',
        '@swc/core@^1.6.0',
        'beachball@^2.0.0',
        'eslint@^10.4.0',
        'husky@^9.0.1',
        'jest@^30.0.0',
        'lint-staged@^17.0.0',
        'prettier@^3.0.0',
        ...projenPeer.peerDeps,
        'tsx@^4.0.0',
        'typescript@^5.5.0',
      ],
      peerDependenciesMeta: {
        '@babel/core': {
          optional: true,
        },
        '@swc-node/register': {
          optional: true,
        },
        '@swc/core': {
          optional: true,
        },
        beachball: {
          optional: true,
        },
        eslint: {
          optional: true,
        },
        husky: {
          optional: true,
        },
        jest: {
          optional: true,
        },
        'lint-staged': {
          optional: true,
        },
        prettier: {
          optional: true,
        },
        tsx: {
          optional: true,
        },
        typescript: {
          optional: true,
        },
      },
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-readme',
    outdir: path.join('packages', 'projen-readme'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-renovate',
    outdir: path.join('packages', 'projen-renovate'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      devDeps: ['schemastore-to-typescript@1.0.1'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('renovate.ts')

    project.package?.setScript(
      'prepare',
      'schemastore-to-typescript --no-cache renovate src/renovate.ts',
    )

    project.package?.setScript(
      'prepublishOnly',
      'rm -rf dist; tsc --project tsconfig.build.json && test -f dist/renovate.d.ts',
    )
  },
)

project.addSubproject(
  {
    name: '@langri-sha/projen-swcrc',
    outdir: path.join('packages', 'projen-swcrc'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      devDeps: ['schemastore-to-typescript@1.0.1'],
      peerDeps: ['@swc/core@^1.6.0', ...projenPeer.peerDeps],
      peerDependenciesMeta: {
        '@swc/core': {
          optional: true,
        },
      },
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('swcrc.ts')

    project.package?.setScript(
      'prepare',
      'schemastore-to-typescript --no-cache swcrc src/swcrc.ts',
    )

    project.package?.setScript(
      'prepublishOnly',
      'rm -rf dist; tsc --project tsconfig.build.json && test -f dist/swcrc.d.ts',
    )
  },
)

project.addSubproject(
  {
    name: '@langri-sha/projen-typescript-config',
    outdir: path.join('packages', 'projen-typescript-config'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['@schemastore/tsconfig@1.0.11'],
      devDeps: ['@types/node@24.19.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/projen-uv',
    outdir: path.join('packages', 'projen-uv'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      type: 'module',
      deps: ['smol-toml@1.9.0'],
      devDeps: ['schemastore-to-typescript@1.0.1'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('pyproject.ts')
    project.addGitIgnore('uv.ts')

    project.package?.setScript(
      'prepare',
      [
        'schemastore-to-typescript --no-cache PyProject src/pyproject.ts',
        'schemastore-to-typescript --no-cache uv src/uv.ts',
      ].join(' && '),
    )

    project.package?.setScript(
      'prepublishOnly',
      'rm -rf dist; tsc --project tsconfig.build.json && test -f dist/pyproject.d.ts && test -f dist/uv.d.ts',
    )
  },
)

project.addSubproject(
  {
    name: '@langri-sha/projen-worktrunk',
    outdir: path.join('packages', 'projen-worktrunk'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      type: 'module',
      devDeps: ['smol-toml@1.9.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.synth()
