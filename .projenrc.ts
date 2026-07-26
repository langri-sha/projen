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
      '@langri-sha/eslint-config@workspace:*',
      '@langri-sha/lint-staged@workspace:*',
      '@langri-sha/prettier@workspace:*',
      '@langri-sha/projen-project@workspace:*',
      '@langri-sha/schemastore-to-typescript@workspace:*',
      '@langri-sha/tsconfig@workspace:*',
      '@swc-node/register@1.11.1',
      '@swc/core@1.15.40',
      '@types/node@24.13.3',
      'eslint@10.8.0',
      'lint-staged@17.2.0',
      'prettier@3.8.3',
      'projen@0.86.5',
      'tsx@4.23.1',
      'vitest@4.1.10',
    ],
  },
  beachball: {},
  codeowners: {
    '*': '@langri-sha',
  },
  editorConfig: {},
  eslint: {
    ignorePatterns: ['**/pnpm-workspace.ts', '**/renovate.ts', '**/swcrc.ts'],
  },
  husky: {
    'pre-commit': 'lint-staged',
  },
  lintStaged: {},
  lintSynthesized: {},
  prettier: {
    ignorePatterns: ['*.frag', 'pnpm-workspace.ts', 'renovate.ts', 'swcrc.ts'],
  },
  pnpmWorkspace: {
    packages: ['packages/*'],
  },
  readme: {
    filename: 'readme.md',
  },
  renovate: {
    packageRules: [
      {
        description: 'Install our own packages without waiting them out',
        matchPackageNames: ['@langri-sha/**'],
        minimumReleaseAge: null,
      },
    ],
  },
  swcrc: {},
  typeScriptConfig: {},
})

project.package?.addField('private', true)
project.package?.addField('packageManager', 'pnpm@11.17.0')
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

  if (project.name !== '@langri-sha/tsconfig') {
    project
      .tryFindObjectFile('package.json')
      ?.addOverride('devDependencies.@langri-sha/tsconfig', 'workspace:*')
  }
}

const test = (project: Project) => {
  project.npmIgnore?.exclude('*.test.*', '__snapshots__/')
  project.package?.addDevDeps('@langri-sha/vitest@workspace:*')
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

const publishRaw = (project: Project) => {
  project.package?.addField('publishConfig', {
    access: 'public',
  })

  // TypeScript only resolves a bare package-name `extends` target via this
  // field (or a `tsconfig.json` at the package root, which we deliberately
  // don't publish) — it does not fall back to `main`.
  project.package?.addField('tsconfig', 'base.json')
}

project.addSubproject(
  {
    name: '@langri-sha/eslint-config',
    outdir: path.join('packages', 'eslint-config'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2021',
      type: 'module',
      entrypoint: 'src/index.js',
      deps: [
        '@eslint/compat@2.1.0',
        '@eslint/js@10.0.1',
        'eslint-config-prettier@10.1.8',
        'eslint-plugin-import-x@4.17.1',
        'eslint-plugin-jsdoc@63.3.1',
        'eslint-plugin-prettier@5.5.6',
        'eslint-plugin-react@7.37.5',
        'eslint-plugin-react-hooks@7.1.1',
        'eslint-plugin-unicorn@72.0.0',
        'globals@17.8.0',
        'typescript-eslint@8.65.0',
      ],
      peerDeps: ['eslint@^9.0.0 || ^10.0.0'],
    },
  },
  subproject,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/lint-staged',
    outdir: path.join('packages', 'lint-staged'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2021',
      type: 'module',
      entrypoint: 'src/index.js',
      peerDeps: [
        'eslint@^9.0.0 || ^10.0.0',
        'lint-staged@^17.0.0',
        'prettier@^3.0.0',
      ],
      peerDependenciesMeta: {
        eslint: {
          optional: true,
        },
        prettier: {
          optional: true,
        },
      },
    },
  },
  subproject,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/monorepo',
    outdir: path.join('packages', 'monorepo'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['find-up@8.0.0'],
      devDeps: ['@types/node@24.13.3'],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/prettier',
    outdir: path.join('packages', 'prettier'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      entrypoint: 'src/index.js',
      deps: ['prettier-plugin-ini@1.3.0'],
      devDeps: ['prettier@3.8.3'],
      peerDeps: ['prettier@^3.0.0'],
    },
  },
  subproject,
  publish,
)

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
      deps: ['serialize-javascript@7.0.7'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['@babel/core@^8.0.0', ...projenPeer.peerDeps],
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
      deps: ['serialize-javascript@7.0.7'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['eslint@^9.0.0 || ^10.0.0', ...projenPeer.peerDeps],
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
      devDeps: ['@types/node@24.13.3'],
      peerDeps: ['husky@^9.0.1', ...projenPeer.peerDeps],
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
      deps: ['serialize-javascript@7.0.7'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['jest@^28.00 || ^29.00', ...projenPeer.peerDeps],
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
      deps: ['debug@4.4.3', 'execa@10.0.0', 'minimatch@10.2.5'],
      devDeps: ['@types/debug@4.1.13', 'prettier@3.8.3', 'projen@0.86.5'],
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
      deps: ['serialize-javascript@7.0.7'],
      devDeps: ['@types/serialize-javascript@5.0.4'],
      peerDeps: ['lint-staged@^17.0.0', ...projenPeer.peerDeps],
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
      deps: ['yaml@2.9.0'],
      devDeps: [
        '@langri-sha/schemastore-to-typescript@workspace:*',
        'tsx@4.23.1',
      ],
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
      "tsx ./node_modules/@langri-sha/schemastore-to-typescript/src/cli.ts --no-cache 'pnpm Workspace (pnpm-workspace.yaml)' src/pnpm-workspace.ts",
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
      deps: ['serialize-javascript@7.0.7'],
      devDeps: ['@types/serialize-javascript@5.0.4', 'prettier@3.8.3'],
      peerDeps: ['prettier@^3.0.0', ...projenPeer.peerDeps],
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
      devDeps: ['@types/ramda@0.32.0'],
      peerDeps: [
        '@babel/core@^8.0.0',
        '@swc-node/register@^1.0.0',
        '@swc/core@^1.6.0',
        'beachball@^2.0.0',
        'eslint@^9.0.0 || ^10.0.0',
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
      devDeps: [
        '@langri-sha/schemastore-to-typescript@workspace:*',
        'tsx@4.23.1',
      ],
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
      'tsx ./node_modules/@langri-sha/schemastore-to-typescript/src/cli.ts --no-cache renovate src/renovate.ts',
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
      devDeps: [
        '@langri-sha/schemastore-to-typescript@workspace:*',
        'tsx@4.23.1',
      ],
      peerDeps: ['@swc/core@^1.6.0', ...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('swcrc.ts')

    project.package?.setScript(
      'prepare',
      'tsx ./node_modules/@langri-sha/schemastore-to-typescript/src/cli.ts --no-cache swcrc src/swcrc.ts',
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
      deps: ['@schemastore/tsconfig@1.0.9'],
      devDeps: ['@types/node@24.13.3'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: '@langri-sha/schemastore-to-typescript',
    outdir: path.join('packages', 'schemastore-to-typescript'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      bin: {
        'schemastore-to-typescript': 'src/cli.ts',
      },
      deps: [
        'commander@15.0.0',
        'debug@4.4.3',
        'env-paths@4.0.0',
        'es-main@1.4.0',
        'got@14.4.7',
        'json-schema-to-typescript@15.0.4',
        'keyv-file@5.3.5',
        'keyv@4.5.4',
      ],
      devDeps: ['@types/debug@4.1.13'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project
      .tryFindObjectFile('package.json')
      ?.addOverride(
        'publishConfig.bin.schemastore-to-typescript',
        'dist/cli.js',
      )
  },
)

project.addSubproject(
  {
    name: '@langri-sha/tsconfig',
    outdir: path.join('packages', 'tsconfig'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      entrypoint: 'base.json',
      peerDeps: ['typescript@^5.5.0'],
    },
  },
  subproject,
  publishRaw,
)

project.addSubproject(
  {
    name: '@langri-sha/vitest',
    outdir: path.join('packages', 'vitest'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      type: 'module',
      deps: ['nock@14.0.16', 'tempy@3.2.0'],
      peerDeps: ['vitest@^4.0.0'],
    },
  },
  subproject,
  publish,
)

project.synth()
