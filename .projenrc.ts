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

const project = new Project({
  name: 'projen',
  package: {
    ...pkg,
    copyrightYear: '2016',
    homepage: 'https://github.com/langri-sha/projen',
    minNodeVersion: '24.16.0',
    repository: 'langri-sha/projen',
    type: 'module',

    // ponytail: eslint stays ^9 — the published @langri-sha/eslint-config
    // (0.8.1) still peers eslint ^9 and bundles eslint-9 plugins. Bump to
    // eslint 10 only once that config is republished. projen-eslint's peer is
    // ^9 || ^10, so 9.x satisfies everything here.
    devDeps: [
      '@langri-sha/eslint-config@^0.8.0',
      '@langri-sha/lint-staged@^0.9.0',
      '@langri-sha/prettier@^0.4.0',
      '@langri-sha/projen-project@workspace:*',
      '@langri-sha/schemastore-to-typescript@^0.2.0',
      '@langri-sha/tsconfig@^0.10.1',
      '@swc-node/register@1.11.1',
      '@swc/core@1.15.40',
      '@types/lint-staged@13.3.0',
      '@types/node@24.13.2',
      'eslint@9.9.1',
      'lint-staged@15.5.2',
      'prettier@3.8.3',
      'projen@0.86.5',
      'tsx@4.22.4',
      'vitest@2.1.9',
    ],
  },
  beachball: {},
  codeowners: {
    '*': '@langri-sha',
  },
  editorConfig: {},
  eslint: {
    ignorePatterns: ['**/renovate.d.ts', '**/swcrc.d.ts'],
  },
  husky: {
    'pre-commit': 'lint-staged',
  },
  lintStaged: {},
  lintSynthesized: {},
  prettier: {
    ignorePatterns: ['*.frag', 'renovate.d.ts', 'swcrc.d.ts'],
  },
  pnpmWorkspace: {
    packages: ['packages/*'],
  },
  readme: {
    filename: 'readme.md',
  },
  renovate: {},
  swcrc: {},
  typeScriptConfig: {},
})

project.package?.addField('private', true)
project.package?.addField('packageManager', 'pnpm@9.15.9')
project.package?.addEngine('pnpm', '>=9.0.0')

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

  project
    .tryFindObjectFile('package.json')
    ?.addOverride('devDependencies.@langri-sha/tsconfig', '^0.10.1')
}

const test = (project: Project) => {
  project.npmIgnore?.exclude('*.test.*', '__snapshots__/')
  project.package?.addDevDeps('@langri-sha/vitest@^0.1.1')
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
      peerDeps: ['projen@^0.86.0'],
    },
  },
  subproject,
  test,
  publish,
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
      deps: ['serialize-javascript@6.0.2'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: [
        '@babel/core@^7.8.0',
        '@types/babel__core@^7.8.0',
        'projen@^0.86.0',
      ],
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
      peerDeps: ['beachball@^2.0.0', 'projen@^0.86.0'],
    },
  },
  subproject,
  test,
  publish,
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
      peerDeps: ['projen@^0.86.0'],
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
      deps: ['serialize-javascript@6.0.2'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['eslint@^9.0.0 || ^10.0.0', 'projen@^0.86.0'],
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
      devDeps: ['@types/node@24.13.2'],
      peerDeps: ['husky@^9.0.1', 'projen@^0.86.0'],
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
      deps: ['serialize-javascript@6.0.2'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['jest@^28.00 || ^29.00', 'projen@^0.86.0'],
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
      deps: ['debug@4.4.3', 'execa@8.0.1', 'minimatch@10.2.5'],
      devDeps: ['@types/debug@4.1.13', 'prettier@3.8.3', 'projen@0.86.5'],
      peerDeps: ['projen@^0.86.0'],
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
      deps: ['serialize-javascript@6.0.2'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['lint-staged@^15.0.0', 'projen@^0.86.0'],
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
      peerDeps: ['projen@^0.86.0'],
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
      deps: ['yaml@2.9.0'],
      peerDeps: ['projen@^0.86.0'],
    },
  },
  subproject,
  test,
  publish,
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
      deps: ['serialize-javascript@6.0.2'],
      devDeps: ['@types/serialize-javascript@5.0.4', 'prettier@3.8.3'],
      peerDeps: ['prettier@^3.0.0', 'projen@^0.86.0'],
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
        '@langri-sha/projen-codeowners@workspace:*',
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
        'ramda@0.32.0',
      ],
      devDeps: ['@types/ramda@0.31.1'],
      peerDeps: [
        '@babel/core@^7.8.0',
        '@swc-node/register@^1.0.0',
        '@swc/core@^1.6.0',
        '@types/babel__core@^7.8.0',
        'beachball@^2.0.0',
        'eslint@^9.0.0 || ^10.0.0',
        'husky@^9.0.1',
        'jest@^28.0.0 || ^29.0.0',
        'lint-staged@^15.0.0',
        'prettier@^3.0.0',
        'projen@^0.86.0',
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
        '@types/babel__core': {
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
      peerDeps: ['projen@^0.86.0'],
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
      devDeps: ['@langri-sha/schemastore-to-typescript@^0.2.0', 'tsx@4.22.4'],
      peerDeps: ['projen@^0.86.0'],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('renovate.d.ts')

    project.package?.setScript(
      'prepare',
      'tsx ./node_modules/@langri-sha/schemastore-to-typescript/src/cli.ts --no-cache renovate src/renovate.d.ts',
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
      devDeps: ['@langri-sha/schemastore-to-typescript@^0.2.0', 'tsx@4.22.4'],
      peerDeps: ['projen@^0.86.0', '@swc/core@^1.6.0'],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('swcrc.d.ts')

    project.package?.setScript(
      'prepare',
      'tsx ./node_modules/@langri-sha/schemastore-to-typescript/src/cli.ts --no-cache swcrc src/swcrc.d.ts',
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
      deps: ['@schemastore/tsconfig@0.0.12'],
      devDeps: ['@types/node@24.13.2'],
      peerDeps: ['projen@^0.86.0'],
    },
  },
  subproject,
  test,
  publish,
)

project.synth()
