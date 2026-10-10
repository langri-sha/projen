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
      '@langri-sha/eslint-config@0.9.19',
      '@langri-sha/lint-staged@0.9.10',
      '@langri-sha/prettier@0.4.11',
      '@langri-sha/projen-project@workspace:*',
      '@langri-sha/tsconfig@1.1.1',
      '@types/node@24.19.1',
      'schemastore-to-typescript@1.0.3',
      'vitest@5.0.3',
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
      '**/ruff.ts',
      '**/rustfmt.ts',
      '**/swcrc.ts',
      '**/ty.ts',
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
      'pnpm-workspace.ts',
      'pyproject.ts',
      'renovate.ts',
      'ruff.ts',
      'rustfmt.ts',
      'swcrc.ts',
      'ty.ts',
      'uv.ts',
    ],
  },
  pnpmWorkspace: {
    packages: ['packages/*'],
    minimumReleaseAgeExclude: [
      '@langri-sha/*',
      'schemastore-to-typescript',
      'skills@1.7.2',
    ],
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
project.package?.addField('packageManager', 'pnpm@12.10.0')
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

  project.package?.addDevDeps('@langri-sha/tsconfig@1.1.1')
}

const test = (project: Project) => {
  project.npmIgnore?.exclude('*.test.*', '__snapshots__/')
  project.package?.addDevDeps('@langri-sha/vitest@0.2.3')
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
    name: 'projen-codeowners',
    outdir: path.join('packages', 'projen-codeowners'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for managing CODEOWNERS.',
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
    name: 'projen-dagger',
    outdir: path.join('packages', 'projen-dagger'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description: 'A projen component for Dagger workspaces.',
      type: 'module',
      devDeps: ['smol-toml@1.9.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: 'projen-babel-config',
    outdir: path.join('packages', 'projen-babel'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring Babel.',
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
    name: 'projen-beachball',
    outdir: path.join('packages', 'projen-beachball'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring Beachball.',
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
    name: 'projen-cargo',
    outdir: path.join('packages', 'projen-cargo'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description:
        'projen components for authoring Cargo workspaces and the crates in them.',
      type: 'module',
      devDeps: ['schemastore-to-typescript@1.0.3'],
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
    name: 'projen-editorconfig',
    outdir: path.join('packages', 'projen-editorconfig'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description:
        'A projen component for authoring EditorConfig configurations.',
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
    name: 'projen-eslint',
    outdir: path.join('packages', 'projen-eslint'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring ESLint.',
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
    name: 'projen-github-templates',
    outdir: path.join('packages', 'projen-github-templates'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      type: 'module',
      deps: ['yaml@2.9.1'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: 'projen-husky',
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
      description: 'A projen component for maintaining Git hooks with Husky.',
      devDeps: ['@types/node@24.19.1'],
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
    name: 'projen-jest-config',
    outdir: path.join('packages', 'projen-jest-config'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for authoring Jest configurations.',
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
    name: 'projen-lint-synthesized',
    outdir: path.join('packages', 'projen-lint-synthesized'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description:
        'A projen component for configuring linters for synthesized files.',
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
    name: 'projen-lint-staged',
    outdir: path.join('packages', 'projen-lint-staged'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring lint-staged.',
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
    name: 'projen-license',
    outdir: path.join('packages', 'projen-license'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description:
        'A projen component for generating license files using license-o-matic.',
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
    name: 'projen-pnpm-workspace',
    outdir: path.join('packages', 'projen-pnpm-workspace'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for maintaining pnpm workspaces.',
      type: 'module',
      deps: ['yaml@2.9.1'],
      devDeps: ['schemastore-to-typescript@1.0.3'],
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
    name: 'projen-prettier',
    outdir: path.join('packages', 'projen-prettier'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring Prettier.',
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
      description:
        'Collection of projen templates for bootstrapping monorepos and workspace projects.',
      type: 'module',
      deps: [
        'projen-babel-config@workspace:*',
        'projen-beachball@workspace:*',
        'projen-cargo@workspace:*',
        'projen-codeowners@workspace:*',
        'projen-dagger@workspace:*',
        'projen-editorconfig@workspace:*',
        'projen-eslint@workspace:*',
        'projen-husky@workspace:*',
        'projen-jest-config@workspace:*',
        'projen-license@workspace:*',
        'projen-lint-staged@workspace:*',
        'projen-lint-synthesized@workspace:*',
        'projen-pnpm-workspace@workspace:*',
        'projen-prettier@workspace:*',
        'projen-readme@workspace:*',
        'projen-renovate@workspace:*',
        'projen-ruff@workspace:*',
        'projen-swcrc@workspace:*',
        'projen-ty@workspace:*',
        'projen-typescript-config@workspace:*',
        'projen-uv@workspace:*',
        'projen-worktrunk@workspace:*',
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
    name: 'projen-readme',
    outdir: path.join('packages', 'projen-readme'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for creating sample README files.',
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
    name: 'projen-renovate',
    outdir: path.join('packages', 'projen-renovate'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for authoring Renovate configurations.',
      type: 'module',
      devDeps: ['schemastore-to-typescript@1.0.3'],
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
    name: 'projen-ruff',
    outdir: path.join('packages', 'projen-ruff'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description: 'A projen component for configuring Ruff.',
      type: 'module',
      devDeps: ['schemastore-to-typescript@1.0.3', 'smol-toml@1.9.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('ruff.ts')

    project.package?.setScript(
      'prepare',
      'schemastore-to-typescript --no-cache Ruff src/ruff.ts',
    )

    project.package?.setScript(
      'prepublishOnly',
      'rm -rf dist; tsc --project tsconfig.build.json && test -f dist/ruff.d.ts',
    )
  },
)

project.addSubproject(
  {
    name: 'projen-skills',
    outdir: path.join('packages', 'projen-skills'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description:
        'A projen component for declaring and installing the agent skills a repository uses.',
      type: 'module',
      devDeps: ['@types/node@24.19.1'],
      peerDeps: ['skills@^1.7.2', ...projenPeer.peerDeps],
      peerDependenciesMeta: {
        skills: {
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
    name: 'projen-swcrc',
    outdir: path.join('packages', 'projen-swcrc'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring SWC.',
      type: 'module',
      devDeps: ['schemastore-to-typescript@1.0.3'],
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
    name: 'projen-ty',
    outdir: path.join('packages', 'projen-ty'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description: 'A projen component for configuring ty.',
      type: 'module',
      devDeps: ['schemastore-to-typescript@1.0.3', 'smol-toml@1.9.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
  (project) => {
    project.addGitIgnore('ty.ts')

    project.package?.setScript(
      'prepare',
      'schemastore-to-typescript --no-cache ty src/ty.ts',
    )

    project.package?.setScript(
      'prepublishOnly',
      'rm -rf dist; tsc --project tsconfig.build.json && test -f dist/ty.d.ts',
    )
  },
)

project.addSubproject(
  {
    name: 'projen-typescript-config',
    outdir: path.join('packages', 'projen-typescript-config'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description:
        'A projen component for managing TSConfig files for TypeScript projects.',
      type: 'module',
      deps: ['@schemastore/tsconfig@1.0.11'],
      devDeps: ['@types/node@24.19.1'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)

project.addSubproject(
  {
    name: 'projen-uv',
    outdir: path.join('packages', 'projen-uv'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description:
        'projen components for authoring uv workspaces and the Python packages in them.',
      type: 'module',
      deps: ['smol-toml@1.9.0'],
      devDeps: ['schemastore-to-typescript@1.0.3'],
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
    name: 'projen-worktrunk',
    outdir: path.join('packages', 'projen-worktrunk'),
    npmIgnore: {},
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description:
        "A projen component for authoring Worktrunk project configuration, so the hooks that run across a worktree's lifecycle are declared in your projenrc along with everything else.",
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
