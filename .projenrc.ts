import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Project, TypeScriptConfig } from '@langri-sha/projen-project'
import { SampleFile, TextFile } from 'projen'

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
  peerDeps: ['projen@>=0.86.0 <1.0.0'],
}

const project = new Project({
  name: 'projen',
  package: {
    ...pkg,
    copyrightYear: '2016',
    homepage: 'https://github.com/langri-sha/projen',
    minNodeVersion: '24.22.1',
    repository: 'langri-sha/projen',
    type: 'module',

    devDeps: [
      '@langri-sha/projen-project@workspace:*',
      '@langri-sha/tsconfig@1.1.1',
      '@langri-sha/webpack@0.8.2',
      '@types/node@24.19.2',
      'schemastore-to-typescript@1.3.0',
      'webpack@5.112.2',
    ],
  },
  beachball: {
    config: {
      ignorePatterns: ['.gitignore', 'tsconfig.json', '**/.projen/**'],
    },
  },
  claude: {
    settings: { attribution: { commit: '', pr: '', sessionUrl: false } },
  },
  codeowners: {
    '*': '@langri-sha',
  },
  dagger: {
    engineVersion: 'v1.0.0-beta.21',
    modules: {
      '.dagger/smoke': {
        dependencies: ['github.com/langri-sha/dagger/typescript@v2.1.0'],
      },
    },
  },
  editorConfig: {},
  eslint: {
    ignorePatterns: [
      '**/cargo.ts',
      '**/dagger-module.ts',
      '**/dagger-workspace.ts',
      'packages/projen-changesets/src/config.ts',
      'packages/projen-claude/src/settings.ts',
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
  githubTemplates: {},
  husky: {
    'pre-commit': 'lint-staged',
  },
  lintStaged: {},
  lintSynthesized: {},
  prettier: {
    ignorePatterns: [
      '*.frag',
      'cargo.ts',
      'dagger-module.ts',
      'dagger-workspace.ts',
      'packages/projen-changesets/src/config.ts',
      'packages/projen-claude/src/settings.ts',
      'packages/projen-github-templates/src/__fixtures__/malformed-yaml/',
      'packages/projen-project/templates/pull_request_template.md',
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
    extends: ['github>langri-sha/renovate-config'],
    packageRules: [
      {
        description:
          'Update schemastore-to-typescript with our own packages and install it without waiting it out',
        groupName: 'langri-sha projen toolchain',
        groupSlug: 'langri-sha-projen',
        matchPackageNames: ['schemastore-to-typescript'],
        minimumReleaseAge: null,
      },
    ],
  },
  skills: {
    ignore: false,
    skills: [
      {
        source: 'langri-sha/skills',
        ref: 'v1.1.0',
        skills: ['create-commit', 'create-pr'],
      },
    ],
  },
  swcrc: {},
  typeScriptConfig: {},
  vitest: true,
  worktrunk: {},
})

project.package?.addField('private', true)
project.package?.addField('packageManager', 'pnpm@12.16.1')
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
  project.package?.addDevDeps('@langri-sha/vitest@0.2.3')
}

const publish = (
  project: Project,
  build = 'tsc --project tsconfig.build.json',
) => {
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

  project.package?.setScript('prepublishOnly', `rm -rf dist; ${build}`)
}

const publishJsii = (
  project: Project,
  { inline = false }: { inline?: boolean } = {},
) => {
  if (!inline) {
    return publish(project, 'jsii')
  }

  // jsii takes only jsii modules as dependencies, and npm cannot pack
  // `bundledDependencies` out of pnpm's symlinked store. The build inlines the
  // other dependencies into `dist/index.js` after jsii has written the
  // assembly, and a publish leaves them out of its manifest.
  const script = `node ${path.relative(
    project.outdir,
    path.join(project.root.outdir, 'scripts', 'inline-dependencies.mjs'),
  )}`

  publish(project, `${script} build`)
  project.package?.setScript('postpublish', `${script} restore`)
}

/**
 * A script that loads what a package publishes under plain Node and does one
 * real thing with it, run against the packed tarball by the `smoke` Dagger
 * module. The script stays out of the tarball.
 */
const smoke = (
  project: Project,
  { imports, run, check }: { imports: string; run: string; check: string },
) => {
  const file = new TextFile(project, 'smoke.mjs', {
    marker: true,
    readonly: true,
  })

  for (const line of [
    `// ${file.marker}`,
    "import assert from 'node:assert/strict'",
    "import fs from 'node:fs'",
    "import os from 'node:os'",
    "import path from 'node:path'",
    '',
    "import * as projen from 'projen'",
    imports,
    '',
    "const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'))",
    "const project = new projen.Project({ name: 'smoke', outdir })",
    "const read = (file) => fs.readFileSync(path.join(outdir, file), 'utf8')",
    '',
    run,
    '',
    'project.synth()',
    '',
    check,
  ]) {
    file.addLine(line)
  }

  project.npmIgnore?.exclude('smoke.mjs')

  // Its imports name the published packages, which only a tarball resolves.
  project
    .tryFindObjectFile('tsconfig.json')
    ?.addOverride('exclude', ['dist', 'smoke.mjs'])
  project
    .tryFindObjectFile('tsconfig.build.json')
    ?.addToArray('exclude', 'smoke.mjs')
}

project.addSubproject(
  {
    name: 'projen-codeowners',
    outdir: path.join('packages', 'projen-codeowners'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for managing CODEOWNERS.',
      type: 'module',
      devDeps: ['jsii@5.9.57'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publishJsii,
  (project) =>
    smoke(project, {
      imports: "import { Codeowners } from 'projen-codeowners'",
      run: "new Codeowners(project, { '*': '@admins' })",
      check: "assert.ok(read('CODEOWNERS').includes('* @admins'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-dagger',
    outdir: path.join('packages', 'projen-dagger'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description: 'A projen component for Dagger workspaces.',
      type: 'module',
      devDeps: [
        'jsii@5.9.57',
        'schemastore-to-typescript@1.3.0',
        'smol-toml@1.9.1',
      ],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publishJsii,
  (project) => {
    project.addGitIgnore('dagger-module.ts')
    project.addGitIgnore('dagger-workspace.ts')

    project.package?.setScript(
      'prepublishOnly',
      'rm -rf dist; node ../../scripts/dagger-schema-compatibility.mjs build',
    )

    project.package?.setScript(
      'prepare',
      [
        "schemastore-to-typescript --no-cache --jsii 'Dagger module (dagger-module.toml)' src/dagger-module.ts",
        "schemastore-to-typescript --no-cache --jsii 'Dagger workspace (dagger.toml)' src/dagger-workspace.ts",
        'node ../../scripts/dagger-schema-compatibility.mjs prepare',
      ].join(' && '),
    )
  },
  (project) =>
    smoke(project, {
      imports: "import { Dagger } from 'projen-dagger'",
      run: "new Dagger(project, {\n  engineVersion: 'v1.0.0-beta.15',\n  modules: { '.dagger/build': { dependencies: ['../lint'], codegen: { automaticGitignore: false } } },\n  workspace: { ignore: ['node_modules'] },\n})",
      check:
        "assert.ok(read('.dagger/build/dagger-module.toml').includes('v1.0.0-beta.15'))\nassert.ok(read('.dagger/build/dagger-module.toml').includes('../lint'))\nassert.ok(read('dagger.toml').includes('node_modules'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-babel-config',
    outdir: path.join('packages', 'projen-babel'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring Babel.',
      type: 'module',
      deps: ['serialize-javascript@7.1.4'],
      devDeps: [
        '@babel/core@8.0.10',
        '@types/serialize-javascript@5.0.4',
        'jsii@5.9.57',
      ],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publishJsii(project, { inline: true }),
  (project) =>
    smoke(project, {
      imports: "import { Babel } from 'projen-babel-config'",
      run: "new Babel(project, { options: { presets: ['smoke-preset'] } })",
      check: "assert.ok(read('babel.config.js').includes('smoke-preset'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-beachball',
    outdir: path.join('packages', 'projen-beachball'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring Beachball.',
      type: 'module',
      devDeps: ['beachball@2.66.0', 'jsii@5.9.57'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publishJsii,
  (project) =>
    smoke(project, {
      imports: "import { Beachball } from 'projen-beachball'",
      run: "new Beachball(project, { config: { branch: 'main' } })",
      check:
        'assert.ok(read(\'beachball.config.cjs\').includes(\'"branch": "main"\'))',
    }),
)

project.addSubproject(
  {
    name: 'projen-cargo',
    outdir: path.join('packages', 'projen-cargo'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
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
      devDeps: ['jsii@5.9.57', 'schemastore-to-typescript@1.3.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publishJsii,
  (project) => {
    project.addGitIgnore('cargo.ts')
    project.addGitIgnore('rustfmt.ts')
    project
      .tryFindObjectFile('tsconfig.build.json')
      ?.addOverride('include', ['src/**/*.ts'])

    project.package?.setScript(
      'prepare',
      [
        "schemastore-to-typescript --no-cache --jsii 'cargo manifest' src/cargo.ts",
        'schemastore-to-typescript --no-cache --jsii rustfmt src/rustfmt.ts',
      ].join(' && '),
    )

    project.package?.setScript('prepublishOnly', 'rm -rf dist; jsii')
  },
  (project) =>
    smoke(project, {
      imports: "import { CargoWorkspace, CargoPackage } from 'projen-cargo'",
      run: "const workspace = new CargoWorkspace(project, {\n  workspace: { members: ['packages/lib'], package: { edition: '2024' } },\n  deny: { licenses: { allow: ['MIT'] } },\n  rustfmt: { group_imports: 'StdExternalCrate' },\n})\nnew CargoPackage(new projen.Project({ name: 'lib', parent: project, outdir: 'packages/lib' }), { package: { version: '0.1.0' } })\nworkspace.addMember('packages/app')",
      check:
        "assert.ok(read('Cargo.toml').includes('packages/app'))\nassert.ok(read('packages/lib/Cargo.toml').includes('0.1.0'))\nassert.ok(read('packages/lib/src/main.rs').includes('fn main'))\nassert.ok(read('rustfmt.toml').includes('StdExternalCrate'))\nassert.ok(read('deny.toml').includes('MIT'))\nassert.equal(CargoWorkspace[Symbol.for('jsii.rtti')].fqn, 'projen-cargo.CargoWorkspace')\nassert.equal(CargoPackage[Symbol.for('jsii.rtti')].fqn, 'projen-cargo.CargoPackage')",
    }),
)

project.addSubproject(
  {
    name: 'projen-changesets',
    outdir: path.join('packages', 'projen-changesets'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description:
        'A projen component for configuring Changesets, so the change files a repository versions and tags with are declared in your projenrc.',
      type: 'module',
      devDeps: ['jsii@5.9.57', 'schemastore-to-typescript@1.3.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publish(project, 'jsii && test -f dist/config.d.ts'),
  (project) => {
    project.addGitIgnore('config.ts')

    project.package?.setScript(
      'prepare',
      'schemastore-to-typescript --no-cache Changesets src/config.ts',
    )
  },
  (project) =>
    smoke(project, {
      imports: "import { Changesets } from 'projen-changesets'",
      run: 'new Changesets(project)',
      check:
        "assert.equal(JSON.parse(read('.changeset/config.json')).baseBranch, 'main')",
    }),
)

project.addSubproject(
  {
    name: 'projen-claude',
    outdir: path.join('packages', 'projen-claude'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description:
        'A projen component for authoring Claude Code settings, so the permissions, hooks and environment a repository shares are declared in your projenrc along with everything else.',
      type: 'module',
      devDeps: ['jsii@5.9.57', 'schemastore-to-typescript@1.3.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publish(project, 'jsii && test -f dist/settings.d.ts'),
  (project) => {
    project.addGitIgnore('settings.ts')

    project.package?.setScript(
      'prepare',
      "schemastore-to-typescript --no-cache --jsii 'Claude Code Settings' src/settings.ts",
    )
  },
  (project) =>
    smoke(project, {
      imports: "import { Claude } from 'projen-claude'",
      run: "new Claude(project, { settings: { permissions: { allow: ['Bash(ls:*)'] } } })",
      check:
        "assert.deepEqual(JSON.parse(read('.claude/settings.json')).permissions.allow, ['Bash(ls:*)'])",
    }),
)

project.addSubproject(
  {
    name: 'projen-editorconfig',
    outdir: path.join('packages', 'projen-editorconfig'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
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
      devDeps: ['jsii@5.9.57'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publishJsii,
  (project) =>
    smoke(project, {
      imports: "import { EditorConfig } from 'projen-editorconfig'",
      run: "new EditorConfig(project, { '*': { trim_trailing_whitespace: true } })",
      check:
        "assert.ok(read('.editorconfig').includes('trim_trailing_whitespace=true'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-eslint',
    outdir: path.join('packages', 'projen-eslint'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring ESLint.',
      type: 'module',
      deps: ['serialize-javascript@7.1.4'],
      devDeps: [
        '@types/serialize-javascript@5.0.4',
        'eslint@10.13.0',
        'jsii@5.9.57',
      ],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publishJsii(project, { inline: true }),
  (project) =>
    smoke(project, {
      imports: "import { ESLint } from 'projen-eslint'",
      run: "new ESLint(project, { config: [{ rules: { 'no-undef': 'off' } }] })",
      check:
        'assert.ok(read(\'eslint.config.js\').includes(\'"no-undef":"off"\'))',
    }),
)

project.addSubproject(
  {
    name: 'projen-github-templates',
    outdir: path.join('packages', 'projen-github-templates'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      type: 'module',
      deps: ['yaml@2.9.1'],
      devDeps: ['jsii@5.9.57'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publishJsii(project, { inline: true }),
  (project) => {
    project.npmIgnore?.exclude('__fixtures__/')
  },
  (project) =>
    smoke(project, {
      imports: "import { GitHubTemplates } from 'projen-github-templates'",
      run: "new GitHubTemplates(project, {\n  files: {\n    '.github/ISSUE_TEMPLATE/bug.yml': { name: 'Bug report', description: 'Report a bug', body: [{ type: 'input', attributes: { label: 'Version' }, validations: { required: true } }] },\n    '.github/ISSUE_TEMPLATE/config.yml': { blankIssuesEnabled: false },\n    '.github/ISSUE_TEMPLATE/feature.md': { name: 'Feature request', about: 'Request a feature', body: ['Describe it'] },\n    '.github/pull_request_template.md': { body: ['Describe the change'] },\n  },\n})",
      check:
        "assert.ok(read('.github/ISSUE_TEMPLATE/bug.yml').includes('required: true'))\nassert.ok(read('.github/ISSUE_TEMPLATE/config.yml').includes('blank_issues_enabled: false'))\nassert.ok(read('.github/ISSUE_TEMPLATE/feature.md').includes('Describe it'))\nassert.ok(read('.github/pull_request_template.md').includes('Describe the change'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-husky',
    outdir: path.join('packages', 'projen-husky'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      type: 'module',
      copyrightYear: '2024',
      description: 'A projen component for maintaining Git hooks with Husky.',
      devDeps: ['@types/node@24.19.2', 'husky@9.1.7', 'jsii@5.9.57'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publishJsii,
  (project) =>
    smoke(project, {
      imports: "import { Husky } from 'projen-husky'",
      run: "new Husky(project, { 'pre-commit': 'npm run lint' })",
      check: "assert.ok(read('.husky/pre-commit').includes('npm run lint'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-jest-config',
    outdir: path.join('packages', 'projen-jest-config'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for authoring Jest configurations.',
      type: 'module',
      deps: ['serialize-javascript@7.1.4'],
      devDeps: [
        '@types/serialize-javascript@5.0.4',
        'jest@30.5.2',
        'jsii@5.9.57',
      ],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publishJsii(project, { inline: true }),
  (project) =>
    smoke(project, {
      imports: "import { JestConfig } from 'projen-jest-config'",
      run: 'new JestConfig(project, { config: { testTimeout: 1234 } })',
      check: "assert.ok(read('jest.config.ts').includes('1234'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-lint-synthesized',
    outdir: path.join('packages', 'projen-lint-synthesized'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
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
      deps: ['debug@4.4.3', 'execa@10.2.1', 'minimatch@10.2.6'],
      devDeps: ['@types/debug@4.1.13', 'jsii@5.9.57', 'prettier@3.9.9'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publishJsii(project, { inline: true }),
  (project) =>
    smoke(project, {
      imports: "import { LintSynthesized } from 'projen-lint-synthesized'",
      run: "new projen.TextFile(project, 'a.txt', { lines: ['a'] })\nnew LintSynthesized(project, { '*.txt': 'touch linted &&' })",
      check: "assert.equal(read('linted'), '')",
    }),
)

project.addSubproject(
  {
    name: 'projen-lint-staged',
    outdir: path.join('packages', 'projen-lint-staged'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring lint-staged.',
      type: 'module',
      deps: ['serialize-javascript@7.1.4'],
      devDeps: [
        '@types/serialize-javascript@5.0.4',
        'jsii@5.9.57',
        'lint-staged@17.6.0',
      ],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publishJsii(project, { inline: true }),
  (project) =>
    smoke(project, {
      imports: "import { LintStaged } from 'projen-lint-staged'",
      run: "new LintStaged(project, { config: { '*': 'prettier' } })",
      check: "assert.ok(read('lint-staged.config.js').includes('prettier'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-license',
    outdir: path.join('packages', 'projen-license'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
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
      devDeps: ['jsii@5.9.57'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publishJsii(project, { inline: true }),
  (project) => {
    // The ambient typings beside package.json would otherwise make jsii take
    // the package root as the source root.
    project
      .tryFindObjectFile('tsconfig.build.json')
      ?.addOverride('compilerOptions.rootDir', 'src')
  },
  (project) =>
    smoke(project, {
      imports: "import { License } from 'projen-license'",
      run: "new License(project, { copyrightHolder: 'Smoke', spdx: 'MIT', year: '2000' })",
      check: "assert.ok(read('license').includes('MIT License'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-pnpm-workspace',
    outdir: path.join('packages', 'projen-pnpm-workspace'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
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
      devDeps: ['jsii@5.9.57', 'schemastore-to-typescript@1.3.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publishJsii(project, { inline: true }),
  (project) => {
    project.addGitIgnore('pnpm-workspace.ts')

    project.package?.setScript(
      'prepare',
      "schemastore-to-typescript --no-cache --jsii --type-name PnpmWorkspaceSchema 'pnpm Workspace (pnpm-workspace.yaml)' src/pnpm-workspace.ts",
    )
  },
  (project) =>
    smoke(project, {
      imports: "import { PnpmWorkspace } from 'projen-pnpm-workspace'",
      run: "new PnpmWorkspace(project, { packages: ['packages/*'] })",
      check: "assert.ok(read('pnpm-workspace.yaml').includes('packages/*'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-prettier',
    outdir: path.join('packages', 'projen-prettier'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring Prettier.',
      type: 'module',
      deps: ['serialize-javascript@7.1.4'],
      devDeps: [
        '@types/serialize-javascript@5.0.4',
        'jsii@5.9.57',
        'prettier@3.9.9',
      ],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publishJsii(project, { inline: true }),
  (project) =>
    smoke(project, {
      imports: "import { Prettier } from 'projen-prettier'",
      run: "new Prettier(project, { config: { endOfLine: 'lf' } })",
      check: "assert.ok(read('prettier.config.js').includes('endOfLine'))",
    }),
)

project.addSubproject(
  {
    name: '@langri-sha/projen-project',
    outdir: path.join('packages', 'projen-project'),
    npmIgnore: {},
    vitest: true,
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
        'projen-changesets@workspace:*',
        'projen-claude@workspace:*',
        'projen-codeowners@workspace:*',
        'projen-dagger@workspace:*',
        'projen-editorconfig@workspace:*',
        'projen-eslint@workspace:*',
        'projen-github-templates@workspace:*',
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
        'projen-skills@workspace:*',
        'projen-swcrc@workspace:*',
        'projen-ty@workspace:*',
        'projen-typescript-config@workspace:*',
        'projen-uv@workspace:*',
        'projen-worktrunk@workspace:*',
        'hosted-git-info@10.1.1',
        'ramda@0.32.0',
        'semver@7.8.5',
      ],
      devDeps: [
        '@types/hosted-git-info@3.0.5',
        '@types/ramda@0.32.0',
        '@types/semver@7.8.0',
      ],
      peerDeps: [
        '@babel/core@^8.0.0',
        '@changesets/cli@^3.0.0',
        '@langri-sha/babel-preset@^0.6.0',
        '@langri-sha/eslint-config@^0.12.0',
        '@langri-sha/lint-staged@^0.9.0',
        '@langri-sha/prettier@^0.4.0',
        '@swc-node/register@^1.0.0',
        '@swc/core@^1.6.0',
        'beachball@^2.0.0',
        'eslint@^10.4.0',
        'husky@^9.0.1',
        'jest@^30.0.0',
        'lint-staged@^17.0.0',
        'prettier@^3.0.0',
        ...projenPeer.peerDeps,
        'skills@^1.7.2',
        'tsx@^4.0.0',
        'typescript@^5.5.0',
        'vitest@^5.0.0',
      ],
      peerDependenciesMeta: {
        '@babel/core': {
          optional: true,
        },
        '@changesets/cli': {
          optional: true,
        },
        '@langri-sha/babel-preset': {
          optional: true,
        },
        '@langri-sha/eslint-config': {
          optional: true,
        },
        '@langri-sha/lint-staged': {
          optional: true,
        },
        '@langri-sha/prettier': {
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
        skills: {
          optional: true,
        },
        tsx: {
          optional: true,
        },
        typescript: {
          optional: true,
        },
        vitest: {
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
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for creating sample README files.',
      type: 'module',
      devDeps: ['jsii@5.9.57'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publishJsii,
  (project) =>
    smoke(project, {
      imports: "import { ReadmeFile } from 'projen-readme'",
      run: 'new ReadmeFile(project)',
      check: "assert.ok(read('README.md').includes('smoke'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-renovate',
    outdir: path.join('packages', 'projen-renovate'),
    jsii: { tsconfig: 'tsconfig.jsii.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for authoring Renovate configurations.',
      type: 'module',
      devDeps: ['jsii@5.9.57', 'schemastore-to-typescript@1.3.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) =>
    publish(project, 'jsii --compress-assembly && test -f dist/renovate.d.ts'),
  (project) => {
    // The compressed assembly is named `.jsii.gz`, which `.*` would drop.
    project.npmIgnore?.include('/.jsii.gz')

    // jsii reads `T | null` as `T` only with `strictNullChecks` off, which the
    // strict `tsconfig.json` type check does not share.
    new TypeScriptConfig(project, {
      fileName: 'tsconfig.jsii.json',
      config: {
        extends: './tsconfig.build.json',
        compilerOptions: { strictNullChecks: false },
      },
    })

    project.addGitIgnore('renovate.ts')

    project.package?.setScript(
      'prepare',
      'schemastore-to-typescript --no-cache --jsii --keep-null --type-name RenovateSchema renovate src/renovate.ts',
    )
  },
  (project) =>
    smoke(project, {
      imports: "import { Renovate } from 'projen-renovate'",
      run: "new Renovate(project, {\n  packageRules: [{ matchPackageNames: ['smoke'], minimumReleaseAge: null }],\n})",
      check:
        "assert.ok(read('renovate.json5').includes('\"minimumReleaseAge\": null'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-ruff',
    outdir: path.join('packages', 'projen-ruff'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description: 'A projen component for configuring Ruff.',
      type: 'module',
      devDeps: [
        'jsii@5.9.57',
        'schemastore-to-typescript@1.3.0',
        'smol-toml@1.9.1',
      ],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publish(project, 'jsii && test -f dist/ruff.d.ts'),
  (project) => {
    project.addGitIgnore('ruff.ts')

    project.package?.setScript(
      'prepare',
      [
        'schemastore-to-typescript --no-cache --jsii --type-name RuffSchema Ruff src/ruff.ts',
        String.raw`node -e "const f='src/ruff.ts',fs=require('node:fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\bRuffOptions\b/g,'LintRuffOptions'))"`,
      ].join(' && '),
    )
  },
  (project) =>
    smoke(project, {
      imports: "import { Ruff } from 'projen-ruff'",
      run: "new Ruff(project, { 'line-length': 100 })",
      check: "assert.ok(read('ruff.toml').includes('line-length = 100'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-skills',
    outdir: path.join('packages', 'projen-skills'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
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
      devDeps: ['@types/node@24.19.2', 'jsii@5.9.57', 'skills@1.7.4'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publishJsii,
  (project) =>
    smoke(project, {
      imports: "import { Skills } from 'projen-skills'",
      run: "// NodePackage installs its dependencies after synthesis.\nprocess.env.PROJEN_DISABLE_POST = '1'\nnew projen.javascript.NodePackage(project, { packageName: 'smoke' })\nnew Skills(project, {\n  sync: false,\n  skills: [{ source: 'vercel-labs/skills', ref: 'v1.7.4', skills: ['find-skills'] }],\n})",
      check:
        "assert.equal(JSON.parse(read('package.json')).skills[0].skills[0], 'find-skills')",
    }),
)

project.addSubproject(
  {
    name: 'projen-swcrc',
    outdir: path.join('packages', 'projen-swcrc'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2024',
      description: 'A projen component for configuring SWC.',
      type: 'module',
      devDeps: [
        '@swc/core@1.16.2',
        'jsii@5.9.57',
        'schemastore-to-typescript@1.3.0',
      ],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publish(project, 'jsii && test -f dist/swcrc.d.ts'),
  (project) => {
    project.addGitIgnore('swcrc.ts')

    project.package?.setScript(
      'prepare',
      'schemastore-to-typescript --no-cache --jsii --type-name SwcrcSchema swcrc src/swcrc.ts',
    )
  },
  (project) =>
    smoke(project, {
      imports: "import { SWCConfig } from 'projen-swcrc'",
      run: "new SWCConfig(project, { jsc: { parser: { syntax: 'ecmascript' } } })",
      check:
        "assert.equal(JSON.parse(read('.swcrc')).jsc.parser.syntax, 'ecmascript')",
    }),
)

project.addSubproject(
  {
    name: 'projen-ty',
    outdir: path.join('packages', 'projen-ty'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
    readme: {
      filename: 'readme.md',
    },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      description: 'A projen component for configuring ty.',
      type: 'module',
      devDeps: [
        'jsii@5.9.57',
        'schemastore-to-typescript@1.3.0',
        'smol-toml@1.9.1',
      ],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) => publish(project, 'jsii && test -f dist/ty.d.ts'),
  (project) => {
    project.addGitIgnore('ty.ts')

    project.package?.setScript(
      'prepare',
      'schemastore-to-typescript --no-cache --jsii --type-name TySchema ty src/ty.ts',
    )
  },
  (project) =>
    smoke(project, {
      imports: "import { Ty } from 'projen-ty'",
      run: "new Ty(project, { environment: { 'python-version': '3.13' } })",
      check: "assert.ok(read('ty.toml').includes('python-version = \"3.13\"'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-typescript-config',
    outdir: path.join('packages', 'projen-typescript-config'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
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
      bundledDeps: ['@schemastore/tsconfig'],
      devDeps: ['@types/node@24.19.2', 'jsii@5.9.57'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publishJsii,
  (project) =>
    smoke(project, {
      imports: "import { TypeScriptConfig } from 'projen-typescript-config'",
      run: 'new TypeScriptConfig(project, { config: { compilerOptions: { strict: true } } })',
      check: "assert.ok(read('tsconfig.json').includes('\"strict\": true'))",
    }),
)

project.addSubproject(
  {
    name: 'projen-uv',
    outdir: path.join('packages', 'projen-uv'),
    jsii: { tsconfig: 'tsconfig.jsii.json' },
    npmIgnore: {},
    vitest: true,
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
      deps: ['smol-toml@1.9.1'],
      devDeps: ['jsii@5.9.57', 'schemastore-to-typescript@1.3.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  (project) =>
    publish(project, 'node ../../scripts/inline-dependencies.mjs compile'),
  (project) => {
    project.addGitIgnore('pyproject.ts')
    project.addGitIgnore('uv.ts')
    project
      .tryFindObjectFile('tsconfig.build.json')
      ?.addOverride('include', ['src/**/*.ts'])

    new TypeScriptConfig(project, {
      fileName: 'tsconfig.jsii.json',
      config: {
        extends: './tsconfig.build.json',
        compilerOptions: { strictNullChecks: false },
      },
    })

    project.package?.setScript(
      'prepare',
      [
        'schemastore-to-typescript --no-cache --jsii --keep-null PyProject src/pyproject.ts',
        'schemastore-to-typescript --no-cache --jsii --keep-null uv src/uv.ts',
      ].join(' && '),
    )

    project.package?.setScript(
      'prepublishOnly',
      'rm -rf dist; node ../../scripts/inline-dependencies.mjs compile',
    )
  },
  (project) =>
    smoke(project, {
      imports: "import { UvWorkspace, UvPackage } from 'projen-uv'",
      run: "const workspace = new UvWorkspace(project, {\n  pythonVersion: '3.14',\n  'dependency-groups': { lint: ['ruff'], dev: ['ty', { 'include-group': 'lint' }] },\n  tool: { uv: { workspace: { members: null } }, custom: { enabled: true } },\n})\nnew UvPackage(new projen.Project({ name: '@scope/my-lib', parent: project, outdir: 'packages/lib' }), {\n  project: { dynamic: ['version'], 'requires-python': '>=3.14' },\n  'build-system': { requires: ['setuptools'], 'build-backend': 'setuptools.build_meta' },\n})\nworkspace.addMember('packages/lib', 'apps/app')",
      check:
        "assert.ok(read('pyproject.toml').includes('apps/app'))\nassert.ok(read('pyproject.toml').includes('include-group'))\nassert.ok(read('pyproject.toml').includes('enabled = true'))\nassert.ok(read('.python-version').includes('3.14'))\nassert.ok(read('packages/lib/pyproject.toml').includes('requires-python'))\nassert.ok(read('packages/lib/src/my_lib/__init__.py').includes('my-lib'))\nassert.equal(UvWorkspace[Symbol.for('jsii.rtti')].fqn, 'projen-uv.UvWorkspace')\nassert.equal(UvPackage[Symbol.for('jsii.rtti')].fqn, 'projen-uv.UvPackage')",
    }),
)

project.addSubproject(
  {
    name: 'projen-worktrunk',
    outdir: path.join('packages', 'projen-worktrunk'),
    jsii: { tsconfig: 'tsconfig.build.json' },
    npmIgnore: {},
    vitest: true,
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
      devDeps: ['jsii@5.9.57', 'smol-toml@1.9.1'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publishJsii,
  (project) =>
    smoke(project, {
      imports: "import { Worktrunk } from 'projen-worktrunk'",
      run: "const worktrunk = new Worktrunk(project, {\n  config: { 'pre-start': [{ install: 'pnpm install' }, { test: 'pnpm test' }] },\n})\nworktrunk.addCommand('pre-merge', 'check', 'pnpm check')",
      check:
        "assert.ok(read('.config/wt.toml').includes('[[pre-start]]'))\nassert.ok(read('.config/wt.toml').includes('pnpm check'))\nassert.ok(read('.config/wt.toml').includes('Generated by projen'))",
    }),
)

project.synth()
