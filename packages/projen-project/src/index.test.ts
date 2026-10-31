import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from '@langri-sha/vitest'
import {
  Project as BaseProject,
  Component,
  IgnoreFile,
  javascript,
} from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import { Babel } from 'projen-babel-config'
import { Beachball } from 'projen-beachball'
import { CargoPackage, CargoWorkspace } from 'projen-cargo'
import { Changesets } from 'projen-changesets'
import { Claude } from 'projen-claude'
import { Codeowners } from 'projen-codeowners'
import { Dagger } from 'projen-dagger'
import { EditorConfig } from 'projen-editorconfig'
import { ESLint } from 'projen-eslint'
import { GitHubTemplates } from 'projen-github-templates'
import { Husky } from 'projen-husky'
import { JestConfig } from 'projen-jest-config'
import { License } from 'projen-license'
import { LintStaged } from 'projen-lint-staged'
import { LintSynthesized } from 'projen-lint-synthesized'
import { PnpmWorkspace, type PnpmWorkspaceOptions } from 'projen-pnpm-workspace'
import { Prettier } from 'projen-prettier'
import { ReadmeFile } from 'projen-readme'
import { Renovate } from 'projen-renovate'
import { Ruff } from 'projen-ruff'
import { Skills } from 'projen-skills'
import { SWCConfig } from 'projen-swcrc'
import { Ty } from 'projen-ty'
import { TypeScriptConfig } from 'projen-typescript-config'
import { UvPackage, UvWorkspace } from 'projen-uv'
import { Worktrunk } from 'projen-worktrunk'
import { valid } from 'semver'
import { vi } from 'vitest'

import { NodePackage, type NodePackageOptions, ProjenrcFile } from './lib'
import { GitAttributesFile } from './lib/gitattributes'

import { Project, type ProjectDaggerOptions } from './index'

const skillsOptions = {
  skills: [
    {
      source: 'vercel-labs/skills',
      ref: '0b8fb22aaa7f82447d4befe1b6a95d30a5b279b8',
      skills: ['find-skills'],
    },
  ],
}

vi.mock('projen-lint-synthesized', () => ({
  LintSynthesized: vi.fn(),
}))

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawnSync: vi.fn(),
}))

// Mock system time to January 1, 2024 for consistent test snapshots
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-01-01'))
})

afterAll(() => {
  vi.useRealTimers()
})

afterEach(() => {
  vi.resetAllMocks()
})

test('defaults', () => {
  const project = new Project({
    name: 'test-project',
  })

  expect(synthSnapshot(project)).toMatchSnapshot()
  expect(project.babel).toBeUndefined()
  expect(project.beachball).toBeUndefined()
  expect(project.codeowners).toBeUndefined()
  expect(project.editorConfig).toBeUndefined()
  expect(project.eslint).toBeUndefined()
  expect(project.gitattributes).toBeInstanceOf(GitAttributesFile)
  expect(project.husky).toBeUndefined()
  expect(project.jestConfig).toBeUndefined()
  expect(project.license).toBeUndefined()
  expect(project.lintStaged).toBeUndefined()
  expect(project.npmIgnore).toBeUndefined()
  expect(project.package).toBeUndefined()
  expect(project.pnpmWorkspace).toBeUndefined()
  expect(project.prettier).toBeUndefined()
  expect(project.projenrc).toBeInstanceOf(ProjenrcFile)
  expect(project.readme).toBeUndefined()
  expect(project.renovate).toBeUndefined()
  expect(project.swcrc).toBeUndefined()
  expect(project.typeScriptConfig).toBeUndefined()
})

describe('projen command', () => {
  test('defaults to pnpm', () => {
    const project = new Project({
      name: 'test-project',
    })

    const subproject = project.addSubproject({
      name: '@someproject/test',
      outdir: path.join('sub', '@some', 'test'),
    })

    expect(project.projenCommand).toBe('pnpm exec projen')
    expect(subproject.projenCommand).toBe('pnpm exec projen')
  })

  test.each([
    [javascript.NodePackageManager.BUN, 'bunx projen'],
    [javascript.NodePackageManager.NPM, 'npx projen'],
    [javascript.NodePackageManager.PNPM, 'pnpm exec projen'],
    [javascript.NodePackageManager.YARN, 'yarn projen'],
    [javascript.NodePackageManager.YARN2, 'yarn projen'],
    [javascript.NodePackageManager.YARN_BERRY, 'yarn projen'],
    [javascript.NodePackageManager.YARN_CLASSIC, 'yarn projen'],
  ])('follows the %s package manager', (packageManager, expected) => {
    const project = new Project({
      name: 'test-project',
      package: { packageManager },
    })

    expect(project.projenCommand).toBe(expected)
  })

  test('can be overridden', () => {
    const project = new Project({
      name: 'test-project',
      projenCommand: 'scripts/run-task',
    })

    expect(project.projenCommand).toBe('scripts/run-task')
  })
})

test('get all subprojects', () => {
  const project = new Project({
    name: 'test-project',
  })

  const subproject = project.addSubproject({
    name: '@someproject/test',
    outdir: path.join('sub', '@some', 'test'),
    typeScriptConfig: {},
  })

  subproject.addSubproject({
    name: '@someproject/test2',
    outdir: path.join('subsub', '@some', 'test2'),
    typeScriptConfig: {},
  })

  expect(project.allSubprojects).toHaveLength(2)
})

test('get all subprojects kind', () => {
  const project = new Project({
    name: 'test-project',
  })

  new BaseProject({
    name: 'project-a',
    parent: project,
    outdir: 'project-a',
  })

  new Project({
    name: 'project-b',
    parent: project,
    outdir: 'project-b',
  })

  expect(project.allSubprojectsKind).toHaveLength(1)
  expect(project.allSubprojectsKind[0]).toBeInstanceOf(Project)
  expect(project.allSubprojectsKind[0].name).toBe('project-b')
})

describe('add subproject', () => {
  test('with options', () => {
    const project = new Project({
      name: 'test-project',
    })

    const sub = project.addSubproject({
      name: '@someproject/test',
      outdir: path.join('someproject', '@some', 'test'),
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(sub.projenrc).toBeInstanceOf(ProjenrcFile)
  })

  test('with callback', () =>
    new Promise((resolve) => {
      expect.assertions(2)

      const project = new Project({
        name: 'test-project',
      })

      project.addSubproject(
        {
          name: '@someproject/test',
          outdir: path.join('someproject', '@some', 'test'),
          typeScriptConfig: {},
        },
        (p) => {
          expect(p).toBeInstanceOf(Project)
          expect(p.name).toBe('@someproject/test')

          resolve(undefined)
        },
      )
    }))
})

test('find subproject', () => {
  const project = new Project({
    name: 'test-project',
  })

  const subproject = project.addSubproject({
    name: '@someproject/test',
    outdir: path.join('sub', '@some', 'test'),
    typeScriptConfig: {},
  })

  subproject.addSubproject({
    name: '@someproject/test2',
    outdir: path.join('subsub', '@some', 'test2'),
    typeScriptConfig: {},
  })

  expect(project.findSubproject('@someproject/test')).toBeInstanceOf(Project)
  expect(project.findSubproject('@someproject/test2')).toBeInstanceOf(Project)
  expect(project.findSubproject('non-existing')).toBeUndefined()
})

describe('creates `.projenrc` Projen project configuration', () => {
  test('with defaults', () => {
    const project = new Project({
      name: 'test-project',
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
  })

  test('with ESM package', () => {
    const project = new Project({
      name: 'test-project',
      package: {
        type: 'module',
      },
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
  })
})

describe('with Babel configuration', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      babel: {},
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(project.babel).toBeInstanceOf(Babel)
  })

  test('with ESM package', () => {
    const project = new Project({
      name: 'test-project',
      package: {
        type: 'module',
      },
      babel: {},
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
  })
})

describe('with Beachball configuration', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      beachball: {},
      prettier: {},
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(project.beachball).toBeInstanceOf(Beachball)
  })

  test('with ESM package', () => {
    const project = new Project({
      name: 'test-project',
      package: {
        type: 'module',
      },
      beachball: {},
      prettier: {},
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
  })
})

describe('with Changesets configuration', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      changesets: {},
      prettier: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(project.changesets).toBeInstanceOf(Changesets)
  })

  test('leaves private packages unset', () => {
    const project = new Project({
      name: 'test-project',
      changesets: {},
    })

    expect(synthSnapshot(project)['.changeset/config.json']).not.toHaveProperty(
      'privatePackages',
    )
  })

  test('passes the options through', () => {
    const project = new Project({
      name: 'test-project',
      changesets: {
        config: { privatePackages: { version: true, tag: true } },
      },
    })

    expect(synthSnapshot(project)['.changeset/config.json']).toMatchObject({
      privatePackages: { version: true, tag: true },
    })
  })

  test('ignores generated changelogs in Prettier', () => {
    const project = new Project({
      name: 'test-project',
      changesets: {},
      prettier: {},
    })

    expect(synthSnapshot(project)['.prettierignore']).toContain('CHANGELOG.md')
  })

  test('cannot be combined with Beachball', () => {
    expect(
      () =>
        new Project({
          name: 'test-project',
          beachball: {},
          changesets: {},
        }),
    ).toThrowError(/only one of `beachball` and `changesets`/)
  })

  test('writes nothing in a subproject', () => {
    const project = new Project({ name: 'test-project', package: {} })

    project.addSubproject({
      name: '@someproject/test',
      outdir: path.join('packages', 'test'),
      package: {},
      changesets: {},
    })

    expect(synthSnapshot(project)).not.toHaveProperty([
      'packages/test/.changeset/config.json',
    ])
  })

  test('writes nothing without the option', () => {
    const project = new Project({ name: 'test-project' })

    expect(project.changesets).toBeUndefined()
    expect(synthSnapshot(project)).not.toHaveProperty([
      '.changeset/config.json',
    ])
  })
})

describe('with Cargo configuration', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      cargo: {},
    })

    const files = synthSnapshot(project)

    expect(cargoFiles(files)).toMatchInlineSnapshot(`
      {
        "Cargo.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [workspace]
      resolver = "3"
      members = [ ]

        [workspace.package]
        edition = "2024"
      ",
        "rust-toolchain.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [toolchain]
      channel = "stable"
      ",
        "rustfmt.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      edition = "2024"
      ",
      }
    `)
    expect(files['.gitignore']).toContain('/target/')
    expect(project.cargo).toBeInstanceOf(CargoWorkspace)
  })

  test('with a crate', () => {
    const project = new Project({
      name: 'test-project',
      cargo: {
        workspace: {
          package: {
            license: 'MIT',
          },
          dependencies: {
            tokio: {
              version: '1.48.0',
              features: ['full'],
            },
          },
        },
      },
    })

    const subproject = project.addSubproject({
      name: 'api',
      outdir: path.join('apps', 'api'),
      cargo: {
        dependencies: {
          tokio: {
            workspace: true,
          },
        },
      },
    })

    expect(cargoFiles(synthSnapshot(project))).toMatchInlineSnapshot(`
      {
        "Cargo.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [workspace]
      resolver = "3"
      members = [ "apps/api" ]

        [workspace.package]
        edition = "2024"
        license = "MIT"

      [workspace.dependencies.tokio]
      version = "1.48.0"
      features = [ "full" ]
      ",
        "apps/api/Cargo.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [package]
      name = "api"

        [package.edition]
        workspace = true

        [package.license]
        workspace = true

      [dependencies.tokio]
      workspace = true
      ",
        "apps/api/src/main.rs": "fn main() {
          println!("Hello, world!");
      }
      ",
        "rust-toolchain.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [toolchain]
      channel = "stable"
      ",
        "rustfmt.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      edition = "2024"
      ",
      }
    `)
    expect(subproject.cargo).toBeInstanceOf(CargoPackage)
  })

  test('with a crate declaring what it would otherwise inherit', () => {
    const project = new Project({
      name: 'test-project',
      cargo: {
        workspace: {
          package: {
            edition: '2021',
          },
        },
      },
    })

    project.addSubproject({
      name: 'api',
      outdir: path.join('apps', 'api'),
      cargo: {
        package: {
          edition: '2015',
        },
      },
    })

    expect(cargoFiles(synthSnapshot(project))).toMatchInlineSnapshot(`
      {
        "Cargo.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [workspace]
      resolver = "3"
      members = [ "apps/api" ]

        [workspace.package]
        edition = "2021"
      ",
        "apps/api/Cargo.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [package]
      name = "api"
      edition = "2015"
      ",
        "apps/api/src/main.rs": "fn main() {
          println!("Hello, world!");
      }
      ",
        "rust-toolchain.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [toolchain]
      channel = "stable"
      ",
        "rustfmt.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      edition = "2021"
      ",
      }
    `)
  })

  test('with a crate in a project named for npm', () => {
    const project = new Project({
      name: 'test-project',
      cargo: {},
    })

    const subproject = project.addSubproject({
      name: '@langri-sha/api',
      outdir: path.join('apps', 'api'),
      cargo: {},
    })

    expect(cargoFiles(synthSnapshot(project))).toMatchInlineSnapshot(`
      {
        "Cargo.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [workspace]
      resolver = "3"
      members = [ "apps/api" ]

        [workspace.package]
        edition = "2024"
      ",
        "apps/api/Cargo.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [package]
      name = "api"

        [package.edition]
        workspace = true
      ",
        "apps/api/src/main.rs": "fn main() {
          println!("Hello, world!");
      }
      ",
        "rust-toolchain.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [toolchain]
      channel = "stable"
      ",
        "rustfmt.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      edition = "2024"
      ",
      }
    `)
    expect(subproject.cargo).toBeInstanceOf(CargoPackage)
  })

  test('with a crate outside of a workspace', () => {
    const project = new Project({
      name: 'test-project',
    })

    const subproject = project.addSubproject({
      name: 'api',
      outdir: path.join('apps', 'api'),
      cargo: {
        package: {
          version: '0.1.0',
        },
      },
    })

    expect(cargoFiles(synthSnapshot(project))).toMatchInlineSnapshot(`
      {
        "apps/api/Cargo.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [package]
      name = "api"
      version = "0.1.0"
      ",
        "apps/api/src/main.rs": "fn main() {
          println!("Hello, world!");
      }
      ",
      }
    `)
    expect(subproject.cargo).toBeInstanceOf(CargoPackage)
  })
})

test('with code owners configured', () => {
  const project = new Project({
    name: 'test-project',
    codeowners: {
      '*': '@admin',
    },
  })

  expect(synthSnapshot(project)).toMatchSnapshot()
  expect(project.codeowners).toBeInstanceOf(Codeowners)
})

describe('with Dagger options', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      dagger: {
        engineVersion: 'v1.0.0-beta.15',
        modules: {
          terraform: {},
          'terraform/e2e': {
            dependencies: ['..'],
          },
        },
        workspace: {
          modules: {
            terraform: { source: 'terraform' },
          },
        },
      },
    })

    expect(daggerFiles(synthSnapshot(project))).toMatchInlineSnapshot(`
      {
        "dagger.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [modules.terraform]
      source = "terraform"
      ",
        "terraform/dagger-module.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      name = "terraform"
      engineVersion = "v1.0.0-beta.15"

      [runtime]
      source = "dang"
      ",
        "terraform/e2e/dagger-module.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      name = "e2e"
      engineVersion = "v1.0.0-beta.15"

      [runtime]
      source = "dang"

      [[dependencies]]
      source = ".."
      ",
      }
    `)
    expect(project.dagger).toBeInstanceOf(Dagger)
  })

  test('is a root project property', () => {
    const project = new Project({
      name: 'test-project',
    })

    const subproject = project.addSubproject({
      name: 'subproject',
      outdir: 'packages/subproject',
      dagger: {},
    })

    expect(subproject.dagger).toBeUndefined()
  })
})

test('with EditorConfig options', () => {
  const project = new Project({
    name: 'test-project',
    editorConfig: {},
    prettier: {},
  })

  expect(synthSnapshot(project)).toMatchSnapshot()
  expect(project.editorConfig).toBeInstanceOf(EditorConfig)
})

test('with EditorConfig options overriding the defaults for all files', () => {
  const project = new Project({
    name: 'test-project',
    editorConfig: {
      '*': {
        end_of_line: 'crlf',
        indent_size: 4,
        trim_trailing_whitespace: false,
      },
    },
  })

  expect(synthSnapshot(project)['.editorconfig']).toMatchInlineSnapshot(`
    "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

    root=true

    [*]
    charset=utf-8
    end_of_line=crlf
    indent_style=space
    indent_size=4
    insert_final_newline=true
    trim_trailing_whitespace=false

    [Dockerfile]
    indent_style=tab
    "
  `)
})

test('with EditorConfig options adding a section of their own', () => {
  const project = new Project({
    name: 'test-project',
    editorConfig: {
      '*.md': {
        trim_trailing_whitespace: false,
      },
    },
  })

  expect(synthSnapshot(project)['.editorconfig']).toMatchInlineSnapshot(`
    "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

    root=true

    [*]
    charset=utf-8
    end_of_line=lf
    indent_style=space
    indent_size=2
    insert_final_newline=true
    trim_trailing_whitespace=true

    [Dockerfile]
    indent_style=tab

    [*\\.md]
    trim_trailing_whitespace=false
    "
  `)
})

test('with EditorConfig options overriding the defaults for Dockerfiles', () => {
  const project = new Project({
    name: 'test-project',
    editorConfig: {
      Dockerfile: {
        indent_size: 8,
      },
    },
  })

  expect(synthSnapshot(project)['.editorconfig']).toMatchInlineSnapshot(`
    "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

    root=true

    [*]
    charset=utf-8
    end_of_line=lf
    indent_style=space
    indent_size=2
    insert_final_newline=true
    trim_trailing_whitespace=true

    [Dockerfile]
    indent_style=tab
    indent_size=8
    "
  `)
})

test('with EditorConfig and uv options, indenting Python with four spaces', () => {
  const project = new Project({
    name: 'test-project',
    editorConfig: {},
    uv: {},
  })

  expect(synthSnapshot(project)['.editorconfig']).toMatchInlineSnapshot(`
    "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

    root=true

    [*]
    charset=utf-8
    end_of_line=lf
    indent_style=space
    indent_size=2
    insert_final_newline=true
    trim_trailing_whitespace=true

    [Dockerfile]
    indent_style=tab

    [*\\.{py,pyi}]
    indent_style=space
    indent_size=4
    "
  `)
})

describe('with ESLint options', () => {
  test('default', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      eslint: {},
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(project.eslint).toBeInstanceOf(ESLint)
  })

  test('with ESM package', () => {
    const project = new Project({
      name: 'test-project',
      package: {
        type: 'module',
      },
      eslint: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
  })
})

test('with Husky options', () => {
  const project = new Project({
    name: 'test-project',
    package: {},
    husky: {
      'pre-commit': 'lint-staged',
    },
  })

  expect(synthSnapshot(project)).toMatchSnapshot()
  expect(project.husky).toBeInstanceOf(Husky)
})

describe('with Worktrunk options', () => {
  const worktrunk = {
    config: {
      'pre-start': 'pnpm install --frozen-lockfile',
      'pre-merge': { test: 'pnpm exec vitest run' },
    },
  }

  test('synthesizes the config', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      worktrunk,
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(project.worktrunk).toBeInstanceOf(Worktrunk)
  })

  test('supplies a default pre-start pipeline', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      worktrunk: {},
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [[pre-start]]
      sync = "{% if remote and base and base == default_branch %}git fetch {{ remote }} {{ default_branch }} && git merge --ff-only --quiet {{ remote }}/{{ default_branch }}{% endif %}"

      [[pre-start]]
      env = 'git ls-files -- ":(glob)**/.env.example" | while read -r example; do target=\${example%.example}; [ -e "$target" ] || cp "$example" "$target"; done'
      pnpm = "pnpm i --frozen-lockfile"
      "
    `)
  })

  test('leaves out the install command without a package', () => {
    const project = new Project({
      name: 'test-project',
      worktrunk: {},
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [[pre-start]]
      sync = "{% if remote and base and base == default_branch %}git fetch {{ remote }} {{ default_branch }} && git merge --ff-only --quiet {{ remote }}/{{ default_branch }}{% endif %}"

      [[pre-start]]
      env = 'git ls-files -- ":(glob)**/.env.example" | while read -r example; do target=\${example%.example}; [ -e "$target" ] || cp "$example" "$target"; done'
      "
    `)
  })

  test.each([
    [javascript.NodePackageManager.BUN, 'bun', 'bun install --frozen-lockfile'],
    [javascript.NodePackageManager.NPM, 'npm', 'npm ci'],
    [javascript.NodePackageManager.PNPM, 'pnpm', 'pnpm i --frozen-lockfile'],
    [
      javascript.NodePackageManager.YARN,
      'yarn',
      'yarn install --check-files --frozen-lockfile',
    ],
    [javascript.NodePackageManager.YARN2, 'yarn', 'yarn install --immutable'],
    [
      javascript.NodePackageManager.YARN_BERRY,
      'yarn',
      'yarn install --immutable',
    ],
    [
      javascript.NodePackageManager.YARN_CLASSIC,
      'yarn',
      'yarn install --check-files --frozen-lockfile',
    ],
  ])(
    'names the install command after the %s package manager',
    (packageManager, name, command) => {
      const project = new Project({
        name: 'test-project',
        package: { packageManager },
        worktrunk: {},
      })

      expect(synthSnapshot(project)['.config/wt.toml']).toContain(
        `\n${name} = "${command}"\n`,
      )
    },
  )

  test.each([
    { name: 'a virtual workspace', cargo: {} },
    { name: 'a workspace with a root package', cargo: { package: {} } },
  ])('fetches Cargo dependencies in $name', ({ cargo }) => {
    const project = new Project({
      name: 'test-project',
      cargo,
      worktrunk: {},
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toContain(
      '\ncargo = "cargo fetch --locked"\n',
    )
  })

  test('leaves out the Cargo command for a crate in a subproject', () => {
    const project = new Project({
      name: 'test-project',
      worktrunk: {},
    })

    new Project({
      name: 'api',
      parent: project,
      outdir: 'api',
      cargo: {},
    })

    expect(synthSnapshot(project)['.config/wt.toml']).not.toContain('cargo =')
  })

  test('fetches Cargo dependencies beside the Node install', () => {
    const project = new Project({
      name: 'test-project',
      cargo: {},
      package: {},
      worktrunk: {},
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [[pre-start]]
      sync = "{% if remote and base and base == default_branch %}git fetch {{ remote }} {{ default_branch }} && git merge --ff-only --quiet {{ remote }}/{{ default_branch }}{% endif %}"

      [[pre-start]]
      env = 'git ls-files -- ":(glob)**/.env.example" | while read -r example; do target=\${example%.example}; [ -e "$target" ] || cp "$example" "$target"; done'
      pnpm = "pnpm i --frozen-lockfile"
      cargo = "cargo fetch --locked"
      "
    `)
  })

  test.each([
    { name: 'a virtual workspace', uv: {} },
    { name: 'a workspace with a root package', uv: { project: {} } },
  ])('syncs uv dependencies in $name', ({ uv }) => {
    const project = new Project({
      name: 'test-project',
      uv,
      worktrunk: {},
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toContain(
      '\nuv = "uv sync --locked --all-packages"\n',
    )
  })

  test('leaves out the uv command for a package in a subproject', () => {
    const project = new Project({
      name: 'test-project',
      worktrunk: {},
    })

    new Project({
      name: 'api',
      parent: project,
      outdir: 'api',
      uv: {},
    })

    expect(synthSnapshot(project)['.config/wt.toml']).not.toContain('uv =')
  })

  test('syncs uv dependencies beside the other installs', () => {
    const project = new Project({
      name: 'test-project',
      cargo: {},
      package: {},
      uv: {},
      worktrunk: {},
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [[pre-start]]
      sync = "{% if remote and base and base == default_branch %}git fetch {{ remote }} {{ default_branch }} && git merge --ff-only --quiet {{ remote }}/{{ default_branch }}{% endif %}"

      [[pre-start]]
      env = 'git ls-files -- ":(glob)**/.env.example" | while read -r example; do target=\${example%.example}; [ -e "$target" ] || cp "$example" "$target"; done'
      pnpm = "pnpm i --frozen-lockfile"
      cargo = "cargo fetch --locked"
      uv = "uv sync --locked --all-packages"
      "
    `)
  })

  test('replaces the default pre-start with a command', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      worktrunk: { config: { 'pre-start': 'pnpm install --frozen-lockfile' } },
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      pre-start = "pnpm install --frozen-lockfile"
      "
    `)
  })

  test('replaces the default pre-start with named commands', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      worktrunk: {
        config: { 'pre-start': { install: 'pnpm install --frozen-lockfile' } },
      },
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [pre-start]
      install = "pnpm install --frozen-lockfile"
      "
    `)
  })

  test('replaces the default pre-start with a pipeline', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      worktrunk: {
        config: {
          'pre-start': [
            { install: 'pnpm install --frozen-lockfile' },
            { build: 'pnpm build' },
          ],
        },
      },
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [[pre-start]]
      install = "pnpm install --frozen-lockfile"

      [[pre-start]]
      build = "pnpm build"
      "
    `)
  })

  test('replaces the toolchain commands along with the default pre-start', () => {
    const project = new Project({
      name: 'test-project',
      cargo: {},
      package: {},
      uv: {},
      worktrunk: {
        config: { 'pre-start': { install: 'pnpm install --frozen-lockfile' } },
      },
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [pre-start]
      install = "pnpm install --frozen-lockfile"
      "
    `)
  })

  test('keeps the default pre-start beside other events', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      worktrunk: {
        config: { 'pre-merge': { test: 'pnpm exec vitest run' } },
      },
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [[pre-start]]
      sync = "{% if remote and base and base == default_branch %}git fetch {{ remote }} {{ default_branch }} && git merge --ff-only --quiet {{ remote }}/{{ default_branch }}{% endif %}"

      [[pre-start]]
      env = 'git ls-files -- ":(glob)**/.env.example" | while read -r example; do target=\${example%.example}; [ -e "$target" ] || cp "$example" "$target"; done'
      pnpm = "pnpm i --frozen-lockfile"

      [pre-merge]
      test = "pnpm exec vitest run"
      "
    `)
  })

  test('keeps the default pre-start when it is left undefined', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      worktrunk: { config: { 'pre-start': undefined } },
    })

    expect(synthSnapshot(project)['.config/wt.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [[pre-start]]
      sync = "{% if remote and base and base == default_branch %}git fetch {{ remote }} {{ default_branch }} && git merge --ff-only --quiet {{ remote }}/{{ default_branch }}{% endif %}"

      [[pre-start]]
      env = 'git ls-files -- ":(glob)**/.env.example" | while read -r example; do target=\${example%.example}; [ -e "$target" ] || cp "$example" "$target"; done'
      pnpm = "pnpm i --frozen-lockfile"
      "
    `)
  })

  test('leaves the config trackable under the deny-by-default ignore file', () => {
    const project = new Project({
      name: 'test-project',
      worktrunk,
    })

    project.synth()

    execFileSync('git', ['init', '--quiet'], { cwd: project.outdir })

    expect(synthSnapshot(project)['.gitignore']).toMatch(/^\.\*$/m)
    expect(() =>
      execFileSync('git', ['check-ignore', '--quiet', '.config/wt.toml'], {
        cwd: project.outdir,
      }),
    ).toThrow()
  })

  test.each(['.env.example', 'apps/web/.env.example'])(
    'leaves %s trackable under the deny-by-default ignore file',
    (template) => {
      const project = new Project({
        name: 'test-project',
        worktrunk,
      })

      project.synth()

      execFileSync('git', ['init', '--quiet'], { cwd: project.outdir })

      expect(() =>
        execFileSync('git', ['check-ignore', '--quiet', template], {
          cwd: project.outdir,
        }),
      ).toThrow()
    },
  )

  test('keeps the config expanded in review', () => {
    const project = new Project({
      name: 'test-project',
      worktrunk,
    })

    expect(synthSnapshot(project)['.gitattributes']).toContain(
      '/.config/wt.toml linguist-generated -linguist-generated',
    )
  })

  test('touches nothing else', () => {
    const { '.config/wt.toml': _, ...withWorktrunk } = synthSnapshot(
      new Project({ name: 'test-project', package: {}, worktrunk }),
    )
    const without = synthSnapshot(
      new Project({ name: 'test-project', package: {} }),
    )

    for (const file of [
      '.gitattributes',
      '.gitignore',
      '.projen/files.json',
      '.projen/tasks.json',
    ]) {
      delete withWorktrunk[file]
      delete without[file]
    }

    delete withWorktrunk['package.json'].scripts['worktrunk:dry-run']
    delete withWorktrunk['package.json'].scripts['worktrunk:show']

    expect(withWorktrunk).toEqual(without)
  })

  test('is left to the root project', () => {
    const parent = new Project({
      name: 'parent',
    })
    const project = new Project({
      name: 'test-project',
      parent,
      outdir: 'test-project',
      worktrunk,
    })

    expect(project.worktrunk).toBeUndefined()
  })
})

describe('with skills options', () => {
  test('declares the skills in package.json', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      skills: skillsOptions,
    })

    const { 'package.json': pkg } = synthSnapshot(project)

    expect(project.skills).toBeInstanceOf(Skills)
    expect(pkg.skills).toEqual(skillsOptions.skills)
  })

  test('supplies the skills CLI', () => {
    const { 'package.json': pkg } = synthSnapshot(
      new Project({
        name: 'test-project',
        package: {},
        skills: skillsOptions,
      }),
    )

    expect(pkg.devDependencies.skills).toMatchInlineSnapshot('"1.7.4"')
  })

  test('leaves skills-lock.json to the CLI', () => {
    const files = synthSnapshot(
      new Project({
        name: 'test-project',
        package: {},
        skills: skillsOptions,
      }),
    )

    expect(files['skills-lock.json']).toBeUndefined()
    expect(files['.gitignore']).not.toMatch(/skills-lock\.json/)
  })

  test('is left to the root project', () => {
    const parent = new Project({
      name: 'parent',
      package: {},
    })
    const project = new Project({
      name: 'test-project',
      parent,
      outdir: 'test-project',
      package: {},
      skills: skillsOptions,
    })

    expect(project.skills).toBeUndefined()
  })
})

describe('with Claude options', () => {
  const claude = {
    settings: { permissions: { deny: ['Read(./.env)'] } },
  }

  test('writes the settings', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      claude,
    })

    const files = synthSnapshot(project)

    expect(project.claude).toBeInstanceOf(Claude)
    expect(files['.claude/settings.json'].permissions).toEqual(
      claude.settings.permissions,
    )
  })

  test('writes nothing without it', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
    })

    const files = synthSnapshot(project)

    expect(project.claude).toBeUndefined()
    expect(
      Object.keys(files).filter((file) => file.startsWith('.claude')),
    ).toEqual([])
    expect(files['.gitignore']).not.toContain('.claude')
  })

  test('supplies no settings of its own', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      claude: {},
    })

    expect(
      Object.keys(synthSnapshot(project)['.claude/settings.json']).sort(),
    ).toEqual(['$schema', '//'])
  })

  describe('as git reads it under the deny-by-default ignore file', () => {
    const ignored = (file: string) => {
      const project = new Project({
        name: 'test-project',
        claude: {},
      })

      project.synth()

      execFileSync('git', ['init', '--quiet'], { cwd: project.outdir })

      try {
        execFileSync('git', ['check-ignore', '--quiet', file], {
          cwd: project.outdir,
        })

        return true
      } catch {
        return false
      }
    }

    test('the preset ignores dot-directories', () => {
      const project = new Project({
        name: 'test-project',
        claude: {},
      })

      expect(synthSnapshot(project)['.gitignore']).toMatch(/^\.\*$/m)
    })

    test('the settings are tracked', () => {
      expect(ignored('.claude/settings.json')).toBe(false)
    })

    test('the personal settings are ignored', () => {
      expect(ignored('.claude/settings.local.json')).toBe(true)
    })
  })

  test('is left to the root project', () => {
    const parent = new Project({
      name: 'parent',
      package: {},
    })
    const project = new Project({
      name: 'test-project',
      parent,
      outdir: 'test-project',
      package: {},
      claude,
    })

    expect(project.claude).toBeUndefined()
  })
})

describe('with GitHub templates options', () => {
  const repository = 'langri-sha/projen'

  const githubFiles = (project: Project) =>
    Object.fromEntries(
      Object.entries(synthSnapshot(project)).filter(([file]) =>
        file.startsWith('.github/'),
      ),
    )

  test('writes the default templates', () => {
    const project = new Project({
      name: 'test-project',
      package: { repository },
      githubTemplates: {},
    })

    expect(githubFiles(project)).toMatchSnapshot()
    expect(project.githubTemplates).toBeInstanceOf(GitHubTemplates)
  })

  test('leaves out excluded templates', () => {
    const project = new Project({
      name: 'test-project',
      package: { repository },
      githubTemplates: {
        exclude: [
          '.github/ISSUE_TEMPLATE/03-maintenance.yml',
          '.github/pull_request_template.md',
        ],
      },
    })

    expect(githubFiles(project)).toMatchSnapshot()
  })

  test('rejects an excluded path that is not a default template', () => {
    expect(
      () =>
        new Project({
          name: 'test-project',
          package: { repository },
          githubTemplates: { exclude: ['.github/ISSUE_TEMPLATE/nope.yml'] },
        }),
    ).toThrow(
      'githubTemplates.exclude: `.github/ISSUE_TEMPLATE/nope.yml` not among the default templates',
    )
  })

  test('leaves out the Discussions link without discussions', () => {
    const project = new Project({
      name: 'test-project',
      package: { repository },
      githubTemplates: { discussions: false },
    })

    expect(
      githubFiles(project)['.github/ISSUE_TEMPLATE/config.yml'],
    ).toMatchSnapshot()
  })

  test.each([
    'langri-sha/projen',
    'github:langri-sha/projen',
    'git+https://github.com/langri-sha/projen.git',
  ])('derives contact links from the repository %s', (repository) => {
    const project = new Project({
      name: 'test-project',
      package: { repository },
      githubTemplates: {},
    })

    expect(githubFiles(project)['.github/ISSUE_TEMPLATE/config.yml']).toContain(
      'https://github.com/langri-sha/projen/security/advisories/new',
    )
  })

  test.each([
    ['without a repository', undefined],
    ['of another host', 'https://gitlab.com/langri-sha/projen.git'],
  ])('writes no contact links for a repository %s', (_, repository) => {
    const project = new Project({
      name: 'test-project',
      package: { repository },
      githubTemplates: {},
    })

    expect(
      githubFiles(project)['.github/ISSUE_TEMPLATE/config.yml'],
    ).toMatchSnapshot()
  })

  test('merges files over the defaults, the same path winning', () => {
    const project = new Project({
      name: 'test-project',
      package: { repository },
      githubTemplates: {
        files: {
          '.github/pull_request_template.md': { body: '## Summary\n' },
          '.github/PULL_REQUEST_TEMPLATE/release.md': { body: '## Release\n' },
          '.github/ISSUE_TEMPLATE/config.yml': { blankIssuesEnabled: false },
        },
      },
    })

    expect(githubFiles(project)).toMatchSnapshot()
  })

  test('reminds about a change file with Beachball', () => {
    const project = new Project({
      name: 'test-project',
      package: { repository },
      beachball: {},
      githubTemplates: {},
    })

    expect(
      githubFiles(project)['.github/pull_request_template.md'],
    ).toMatchSnapshot()
  })

  test('reminds about a change file with Changesets', () => {
    const project = new Project({
      name: 'test-project',
      package: { repository },
      changesets: {},
      githubTemplates: {},
    })

    expect(
      githubFiles(project)['.github/pull_request_template.md'],
    ).toMatchSnapshot()
  })

  test('leaves the reminder out without Beachball', () => {
    const project = new Project({
      name: 'test-project',
      package: { repository },
      githubTemplates: {},
    })

    expect(
      githubFiles(project)['.github/pull_request_template.md'],
    ).toMatchSnapshot()
  })

  test('writes no templates without the option', () => {
    const project = new Project({
      name: 'test-project',
      package: { repository },
    })

    expect(githubFiles(project)).toEqual({})
    expect(project.githubTemplates).toBeUndefined()
  })

  test('ignores the option on a subproject', () => {
    const parent = new Project({ name: 'parent', package: {} })

    const project = new Project({
      name: 'test-project',
      parent,
      outdir: 'test-project',
      package: { repository },
      githubTemplates: {},
    })

    expect(project.githubTemplates).toBeUndefined()
  })
})

describe('with Jest configuration', () => {
  test('assigns jestConfig property', () => {
    const project = new Project({
      name: 'test-project',
      jestConfig: {},
    })

    expect(project.jestConfig).toBeInstanceOf(JestConfig)
  })

  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      npmIgnore: {},
      jestConfig: {},
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
  })
})

describe('with Vitest', () => {
  test('runs it from the test script', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      vitest: true,
    })

    expect(synthSnapshot(project)['package.json'].scripts.test).toBe('vitest')
  })

  test('leaves the test script out without it', () => {
    const project = new Project({ name: 'test-project', package: {} })

    expect(synthSnapshot(project)['package.json'].scripts).not.toHaveProperty(
      'test',
    )
  })
})

describe('with license', () => {
  test('without author name', () => {
    expect(
      () =>
        new Project({
          name: 'test-project',
          package: {
            license: 'MIT',
          },
        }),
    ).toThrowError(/Missing package author name/)
  })

  test('assigns license property', () => {
    const project = new Project({
      name: 'test-project',
      package: {
        authorName: 'John Smith',
        license: 'MIT',
      },
    })

    expect(project.license).toBeInstanceOf(License)
  })

  test('with author name', () => {
    const project = new Project({
      name: 'test-project',
      package: {
        authorName: 'John Smith',
        license: 'MIT',
      },
    })

    expect(synthSnapshot(project)['license']).toMatchSnapshot()
  })

  test('with copyright year', () => {
    const project = new Project({
      name: 'test-project',
      package: {
        authorName: 'John Smith',
        copyrightYear: '2000',
        license: 'MIT',
      },
    })

    expect(synthSnapshot(project)['license']).toMatchSnapshot()
  })

  test('with author email', () => {
    const project = new Project({
      name: 'test-project',
      package: {
        authorEmail: 'john@example.com',
        authorName: 'John Smith',
        license: 'MIT',
      },
    })

    expect(synthSnapshot(project)['license']).toMatchSnapshot()
  })

  test('with author URL', () => {
    const project = new Project({
      name: 'test-project',
      package: {
        authorEmail: 'john@example.com',
        authorName: 'John Smith',
        authorUrl: 'https://example.com',
        license: 'MIT',
      },
    })

    expect(synthSnapshot(project)['license']).toMatchSnapshot()
  })
})

describe('with `lint-staged`', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      lintStaged: {},
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(project.lintStaged).toBeInstanceOf(LintStaged)
  })

  test('with ESM package', () => {
    const project = new Project({
      name: 'test-project',
      lintStaged: {},
      package: {
        type: 'module',
      },
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(project.lintStaged).toBeInstanceOf(LintStaged)
  })

  test('with Ruff, fixing and formatting staged Python', () => {
    const project = new Project({
      name: 'test-project',
      lintStaged: {},
      ruff: {},
    })

    expect(synthSnapshot(project)['lint-staged.config.mjs'])
      .toMatchInlineSnapshot(`
      "import defaults from '@langri-sha/lint-staged'

      /** @type {import('lint-staged').Configuration} */
          const config = {
            ...defaults,
            "*.{py,pyi}":["ruff check --fix --force-exclude","ruff format --force-exclude"]}

          export default config
          "
    `)
  })

  test('with Ruff and uv, running Ruff out of the uv workspace', () => {
    const project = new Project({
      name: 'test-project',
      lintStaged: {},
      ruff: {},
      uv: {},
    })

    expect(synthSnapshot(project)['lint-staged.config.mjs'])
      .toMatchInlineSnapshot(`
      "import defaults from '@langri-sha/lint-staged'

      /** @type {import('lint-staged').Configuration} */
          const config = {
            ...defaults,
            "*.{py,pyi}":["uv run --frozen ruff check --fix --force-exclude","uv run --frozen ruff format --force-exclude"]}

          export default config
          "
    `)
  })

  test("with Ruff, running it from a subproject's configuration too", () => {
    const project = new Project({
      name: 'test-project',
      lintStaged: {},
      ruff: {},
      uv: {},
    })

    project.addSubproject({
      name: 'subproject',
      outdir: 'packages/subproject',
      lintStaged: {},
      uv: {},
    })

    expect(synthSnapshot(project)['packages/subproject/lint-staged.config.mjs'])
      .toMatchInlineSnapshot(`
      "import defaults from '@langri-sha/lint-staged'

      /** @type {import('lint-staged').Configuration} */
          const config = {
            ...defaults,
            "*.{py,pyi}":["uv run --frozen ruff check --fix --force-exclude","uv run --frozen ruff format --force-exclude"]}

          export default config
          "
    `)
  })

  test('with Ruff and a Python glob of its own, replacing the default', () => {
    const project = new Project({
      name: 'test-project',
      lintStaged: {
        config: {
          '*.{py,pyi}': ['ruff check'],
        },
      },
      ruff: {},
    })

    expect(synthSnapshot(project)['lint-staged.config.mjs'])
      .toMatchInlineSnapshot(`
      "import defaults from '@langri-sha/lint-staged'

      /** @type {import('lint-staged').Configuration} */
          const config = {
            ...defaults,
            "*.{py,pyi}":["ruff check"]}

          export default config
          "
    `)
  })
})

describe('with `lint-synthesized`', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      lintSynthesized: {},
    })

    synthSnapshot(project)
    expect(LintSynthesized).toHaveBeenCalledWith(project, {
      'package.json': 'pnpx sort-package-json',
    })
  })

  test('with ESLint', () => {
    const project = new Project({
      name: 'test-project',
      eslint: {},
      lintSynthesized: {},
    })

    synthSnapshot(project)
    expect(LintSynthesized).toHaveBeenCalledWith(project, {
      'package.json': 'pnpx sort-package-json',
      '*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}': 'pnpm eslint --fix',
    })
  })

  test('with Prettier', () => {
    const project = new Project({
      name: 'test-project',
      lintSynthesized: {},
      prettier: {},
    })

    synthSnapshot(project)
    expect(LintSynthesized).toHaveBeenCalledWith(project, {
      'package.json': 'pnpx sort-package-json',
      '*': 'pnpm prettier --write --ignore-unknown',
    })
  })
})

describe('with NPM ignore', () => {
  test('assigns npmIgnore property', () => {
    const project = new Project({
      name: 'test-project',
      npmIgnore: {},
    })

    expect(project.npmIgnore).toBeInstanceOf(IgnoreFile)
  })

  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      npmIgnore: {},
    })

    expect(synthSnapshot(project)['.npmignore']).toMatchSnapshot()
  })
})

describe('with package', () => {
  test('assigns package property', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
    })

    expect(project.package).toBeInstanceOf(NodePackage)
  })

  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
    })

    expect(synthSnapshot(project)['package.json']).toMatchSnapshot()
  })
})

test('with PNPM workspace', () => {
  const project = new Project({
    name: 'test-project',
    eslint: {},
    prettier: {},
    pnpmWorkspace: {
      packages: ['packages/*'],
    },
  })

  expect(synthSnapshot(project)).toMatchSnapshot()
  expect(project.pnpmWorkspace).toBeInstanceOf(PnpmWorkspace)
})

describe('PNPM allowed builds', () => {
  const allowBuilds = (options = {}) => {
    const workspace = synthSnapshot(
      new Project({
        name: 'test-project',
        pnpmWorkspace: { packages: ['packages/*'] },
        ...options,
      }),
    )['pnpm-workspace.yaml'] as string

    return Object.fromEntries(
      [...workspace.matchAll(/^ {2}['"]?([\w@/-]+)['"]?: (true|false)$/gm)].map(
        ([, name, value]) => [name, value === 'true'],
      ),
    )
  }

  test('are declined by default', () => {
    expect(allowBuilds()).toEqual({
      '@parcel/watcher': false,
      '@swc/core': false,
      esbuild: false,
      'unrs-resolver': false,
    })
  })

  test('allow SWC when the project uses it', () => {
    expect(allowBuilds({ swcrc: {} })['@swc/core']).toBe(true)
  })

  test('yield to the value the project sets', () => {
    expect(
      allowBuilds({
        pnpmWorkspace: {
          packages: ['packages/*'],
          allowBuilds: { esbuild: true },
        },
      }),
    ).toEqual({
      '@parcel/watcher': false,
      '@swc/core': false,
      esbuild: true,
      'unrs-resolver': false,
    })
  })
})

describe('PNPM release age exclusions', () => {
  const excluded = (options = {}) => {
    const workspace = synthSnapshot(
      new Project({
        name: 'test-project',
        pnpmWorkspace: { packages: ['packages/*'] },
        ...options,
      }),
    )['pnpm-workspace.yaml'] as string

    const [, list = ''] =
      workspace.match(/^minimumReleaseAgeExclude:\n((?: {2}- .+\n)+)/m) ?? []

    return [...list.matchAll(/^ {2}- ['"]?([^'"\n]+)['"]?$/gm)].map(
      ([, entry]) => entry,
    )
  }

  test('are empty by default', () => {
    expect(excluded()).toEqual([])
  })

  test('list the preset packages when the project spreads them', () => {
    expect(
      excluded({
        pnpmWorkspace: {
          packages: ['packages/*'],
          minimumReleaseAgeExclude: [
            '@langri-sha/*',
            ...Project.presetPackages,
          ],
        },
      }),
    ).toEqual(['@langri-sha/*', ...Project.presetPackages])
  })
})

describe('Project.presetPackages', () => {
  const { name, dependencies } = createRequire(import.meta.url)(
    '../package.json',
  ) as { name: string; dependencies: Record<string, string> }

  test('starts with the preset', () => {
    expect(Project.presetPackages[0]).toBe(name)
  })

  test('lists every projen component the preset depends on, sorted', () => {
    const components = Object.keys(dependencies)
      .filter((dependency) => dependency.startsWith('projen-'))
      .sort()

    expect(components.length).toBeGreaterThan(0)
    expect(Project.presetPackages.slice(1)).toEqual(components)
  })

  test('leaves third-party dependencies out', () => {
    expect(Project.presetPackages).not.toContain('ramda')
    expect(Project.presetPackages).not.toContain('semver')
  })

  test('lists nothing beyond the preset and its components', () => {
    expect(Project.presetPackages).toMatchInlineSnapshot(`
      [
        "@langri-sha/projen-project",
        "projen-babel-config",
        "projen-beachball",
        "projen-cargo",
        "projen-changesets",
        "projen-claude",
        "projen-codeowners",
        "projen-dagger",
        "projen-editorconfig",
        "projen-eslint",
        "projen-github-templates",
        "projen-husky",
        "projen-jest-config",
        "projen-license",
        "projen-lint-staged",
        "projen-lint-synthesized",
        "projen-pnpm-workspace",
        "projen-prettier",
        "projen-readme",
        "projen-renovate",
        "projen-ruff",
        "projen-skills",
        "projen-swcrc",
        "projen-ty",
        "projen-typescript-config",
        "projen-uv",
        "projen-worktrunk",
      ]
    `)
  })
})

describe('with Prettier options', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      prettier: {},
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(project.prettier).toBeInstanceOf(Prettier)
  })

  test('with ESM package', () => {
    const project = new Project({
      name: 'test-project',
      prettier: {},
      package: {
        type: 'module',
      },
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(project.prettier).toBeInstanceOf(Prettier)
  })
})

test('With README options', () => {
  const project = new Project({
    name: 'test-project',
    readme: {},
  })

  expect(synthSnapshot(project)).toMatchSnapshot()
  expect(project.readme).toBeInstanceOf(ReadmeFile)
})

test('with Renovate options', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
  })

  expect(synthSnapshot(project)).toMatchSnapshot()
  expect(project.renovate).toBeInstanceOf(Renovate)
})

test('with Renovate options, holding releases until pnpm accepts them', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
  })

  expect(synthSnapshot(project)['renovate.json5'].minimumReleaseAge).toBe(
    '3 days',
  )
})

test('with Renovate options overriding the minimum release age', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {
      minimumReleaseAge: '7 days',
    },
  })

  expect(synthSnapshot(project)['renovate.json5'].minimumReleaseAge).toBe(
    '7 days',
  )
})

test('with Renovate options disabling the minimum release age', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {
      minimumReleaseAge: null,
    },
  })

  expect(synthSnapshot(project)['renovate.json5'].minimumReleaseAge).toBeNull()
})

test('with Renovate options, deduping the pnpm lockfile after updates', () => {
  const project = new Project({
    name: 'test-project',
    package: {},
    renovate: {},
  })

  expect(synthSnapshot(project)['renovate.json5'].postUpdateOptions).toEqual([
    'pnpmDedupe',
  ])
})

test('with Renovate options and a package manager other than pnpm', () => {
  const project = new Project({
    name: 'test-project',
    package: { packageManager: javascript.NodePackageManager.NPM },
    renovate: {},
  })

  expect(
    synthSnapshot(project)['renovate.json5'].postUpdateOptions,
  ).toBeUndefined()
})

test('with Renovate options and a minimum Node.js version', () => {
  const project = new Project({
    name: 'test-project',
    package: {
      minNodeVersion: '24.16.0',
    },
    renovate: {},
  })

  expect(synthSnapshot(project)['renovate.json5'].packageRules).toContainEqual({
    description: 'Keep Node.js typings on the major supported by the runtime',
    matchPackageNames: ['@types/node'],
    allowedVersions: '^24',
  })
})

test('with Renovate options and no crates to read', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
  })

  expect(
    synthSnapshot(project)['renovate.json5'].customManagers.map(
      ({ datasourceTemplate }: { datasourceTemplate: string }) =>
        datasourceTemplate,
    ),
  ).not.toContain('crate')
})

type CustomManager = {
  datasourceTemplate: string
  matchStrings: string[]
}

type Extraction = Record<string, string | undefined>

const customManagers = (options: ConstructorParameters<typeof Project>[0]) =>
  synthSnapshot(new Project(options))['renovate.json5']
    .customManagers as CustomManager[]

const extract = (
  matchStrings: string[],
  text: string,
  index = 0,
  inherited: Extraction = {},
): Extraction[] =>
  index === matchStrings.length
    ? [inherited]
    : [...text.matchAll(new RegExp(matchStrings[index], 'g'))].flatMap(
        (match) =>
          extract(
            matchStrings,
            match[0],
            index + 1,
            Object.assign(
              {},
              inherited,
              Object.fromEntries(
                Object.entries(match.groups ?? {}).filter(
                  ([, value]) => value !== undefined,
                ),
              ),
            ),
          ),
      )

const extractCrates = (projenrc: string) =>
  customManagers({ name: 'test-project', cargo: {}, renovate: {} })
    .filter(({ datasourceTemplate }) => datasourceTemplate === 'crate')
    .flatMap(({ matchStrings }) => extract(matchStrings, projenrc))

const extractNpmDeps = (projenrc: string) =>
  customManagers({ name: 'test-project', cargo: {}, renovate: {} })
    .filter(({ datasourceTemplate }) => datasourceTemplate === 'npm')
    .flatMap(({ matchStrings }) => extract(matchStrings, projenrc))

test('with Renovate options, reading the crates the cargo option declares', () => {
  expect(
    customManagers({ name: 'test-project', cargo: {}, renovate: {} }).find(
      ({ datasourceTemplate }) => datasourceTemplate === 'crate',
    ),
  ).toMatchInlineSnapshot(`
    {
      "customType": "regex",
      "datasourceTemplate": "crate",
      "managerFilePatterns": [
        "/\\.?projen.*.(js|cjs|mjs|ts|mts|cts)$/",
      ],
      "matchStrings": [
        "\\bcargo'?:\\s*\\{(?:[^{}]|\\{(?:[^{}]|\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*\\})*\\})*\\}",
        "(?<depType>dependencies|dev-dependencies|build-dependencies)'?:\\s*\\{(?:[^{}]|\\{[^{}]*\\})*\\}",
        "\\{(?:[^{}]|\\{[^{}]*\\})*\\}",
        "'?(?<depName>[\\w-]+)'?:\\s*(?:'[^']*'|\\{[^{}]*\\})",
        "^[^{]*(?:\\{[^{}]*?package:\\s*'(?<packageName>[^']+)')?[\\s\\S]*",
        "(?:^'?[\\w-]+'?:\\s*|version:\\s*)'(?<currentValue>[^']+)'",
      ],
      "matchStringsStrategy": "recursive",
    }
  `)
})

describe('with Renovate options, reading a projenrc that declares crates and npm packages', () => {
  const projenrc = `
    const project = new Project({
      name: 'test-project',
      package: {
        devDeps: ['vitest@5.0.5'],
        dependencies: { express: '4.0.0' },
      },
      cargo: {
        workspace: {
          package: { license: 'MIT' },
          dependencies: {
            anyhow: '1.0.104',
            tokio: { version: '1.53.2', features: ['rt', 'macros'] },
            'rustls-pki-types': '1.15.1',
          },
        },
      },
      deps: ['left-pad@1.3.0'],
    })

    project.addSubproject({
      name: 'api',
      cargo: {
        dependencies: {
          serde: { version: '1.0.229', features: ['derive'] },
          telemetry: { path: '../telemetry' },
          shared: { workspace: true },
          http: { package: 'http-types', version: '2.12.0' },
        },
        'dev-dependencies': {
          insta: '1.43.2',
          tokio: { workspace: true, features: ['test-util'] },
        },
        'build-dependencies': { 'tonic-build': '0.14.2' },
        target: {
          'cfg(unix)': { dependencies: { libc: '0.2.177' } },
        },
      },
    })

    new PnpmWorkspace(project, {
      dependencies: { 'dev-only': '2.0.0' },
      'dev-dependencies': { 'build-only': '3.0.0' },
    })
  `

  test('extracts every crate the cargo options declare', () => {
    expect(extractCrates(projenrc)).toEqual([
      { depType: 'dependencies', depName: 'anyhow', currentValue: '1.0.104' },
      { depType: 'dependencies', depName: 'tokio', currentValue: '1.53.2' },
      {
        depType: 'dependencies',
        depName: 'rustls-pki-types',
        currentValue: '1.15.1',
      },
      {
        depType: 'dependencies',
        depName: 'serde',
        currentValue: '1.0.229',
      },
      {
        depType: 'dependencies',
        depName: 'http',
        packageName: 'http-types',
        currentValue: '2.12.0',
      },
      {
        depType: 'dev-dependencies',
        depName: 'insta',
        currentValue: '1.43.2',
      },
      {
        depType: 'build-dependencies',
        depName: 'tonic-build',
        currentValue: '0.14.2',
      },
      { depType: 'dependencies', depName: 'libc', currentValue: '0.2.177' },
    ])
  })

  test('leaves the dependencies outside the cargo options to the npm managers', () => {
    expect(
      extractNpmDeps(projenrc).map(({ depName, currentValue }) => ({
        depName,
        currentValue,
      })),
    ).toEqual([
      { depName: 'vitest', currentValue: '5.0.5' },
      { depName: 'left-pad', currentValue: '1.3.0' },
    ])
  })

  test('extracts no crates from a projenrc with no cargo option', () => {
    expect(
      extractCrates(`
        new Project({
          package: { dependencies: { express: '4.0.0' } },
          deps: ['left-pad@1.3.0'],
        })
      `),
    ).toEqual([])
  })

  test('reads a quoted cargo key', () => {
    expect(
      extractCrates(`
        new Project({
          'cargo': { dependencies: { anyhow: '1.0.104' } },
        })
      `),
    ).toEqual([
      { depType: 'dependencies', depName: 'anyhow', currentValue: '1.0.104' },
    ])
  })

  test('ignores a key that only ends in cargo', () => {
    expect(
      extractCrates(`
        new Project({
          notcargo: { dependencies: { anyhow: '1.0.104' } },
        })
      `),
    ).toEqual([])
  })
})

test('with Renovate options and no Dagger modules to read', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
  })

  expect(
    synthSnapshot(project)['renovate.json5'].customManagers.map(
      ({ depNameTemplate }: { depNameTemplate?: string }) => depNameTemplate,
    ),
  ).not.toContain('dagger/dagger')
})

test('with Renovate options, reading the Dagger engine out of the projenrc', () => {
  const project = new Project({
    name: 'test-project',
    dagger: {},
    renovate: {},
  })

  const { customManagers, packageRules } =
    synthSnapshot(project)['renovate.json5']

  expect(
    customManagers.find(
      ({ depNameTemplate }: { depNameTemplate?: string }) =>
        depNameTemplate === 'dagger/dagger',
    ),
  ).toMatchInlineSnapshot(`
    {
      "customType": "regex",
      "datasourceTemplate": "github-tags",
      "depNameTemplate": "dagger/dagger",
      "extractVersionTemplate": "^v(?<version>.+)$",
      "managerFilePatterns": [
        "/(^|/)\\.?projenrc\\.(js|cjs|mjs|ts|mts|cts)$/",
      ],
      "matchStrings": [
        "engineVersion:\\s*'v(?<currentValue>[^']+)'",
      ],
      "versioningTemplate": "semver",
    }
  `)

  expect(
    packageRules.filter(({ description }: { description: string }) =>
      /Dagger/.test(description),
    ),
  ).toMatchInlineSnapshot(`
    [
      {
        "description": "Move every Dagger module off one engine release at a time",
        "groupName": "Dagger engine",
        "groupSlug": "dagger-engine",
        "matchDepNames": [
          "dagger/dagger",
        ],
      },
    ]
  `)
})

test('with Renovate options, grouping the langri-sha/dagger modules', () => {
  const project = new Project({
    name: 'test-project',
    dagger: {},
    renovate: {},
  })

  const { packageRules } = synthSnapshot(project)['renovate.json5']

  expect(
    packageRules.filter(
      ({ groupSlug }: { groupSlug?: string }) =>
        groupSlug === 'langri-sha-dagger-modules',
    ),
  ).toMatchInlineSnapshot(`
    [
      {
        "description": "Move the langri-sha/dagger modules together, as they are released in lockstep",
        "groupName": "langri-sha Dagger modules",
        "groupSlug": "langri-sha-dagger-modules",
        "matchDepNames": [
          "github.com/langri-sha/dagger/**",
        ],
      },
    ]
  `)
})

test('with Renovate options and no Dagger, not grouping the langri-sha/dagger modules', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
  })

  const { packageRules } = synthSnapshot(project)['renovate.json5']

  expect(
    packageRules.map(({ groupSlug }: { groupSlug?: string }) => groupSlug),
  ).not.toContain('langri-sha-dagger-modules')
})

test('with Renovate options, reading the Dagger version pinned in workflows', () => {
  const project = new Project({
    name: 'test-project',
    dagger: {},
    renovate: {},
  })

  const { customManagers } = synthSnapshot(project)['renovate.json5']

  expect(
    customManagers.filter(
      ({ depNameTemplate }: { depNameTemplate?: string }) =>
        depNameTemplate === 'dagger/dagger',
    ),
  ).toHaveLength(2)
  expect(
    customManagers.find(({ matchStrings }: { matchStrings: string[] }) =>
      matchStrings.some((matchString) =>
        matchString.includes('dagger-version'),
      ),
    ),
  ).toMatchInlineSnapshot(`
    {
      "customType": "regex",
      "datasourceTemplate": "github-tags",
      "depNameTemplate": "dagger/dagger",
      "extractVersionTemplate": "^v(?<version>.+)$",
      "managerFilePatterns": [
        "/^\\.github/workflows/[^/]+\\.ya?ml$/",
      ],
      "matchStrings": [
        "(?:^|\\n)[ \\t]*dagger-version:[ \\t]*['"]?v(?<currentValue>\\d[^\\s'"]*)",
      ],
      "versioningTemplate": "semver",
    }
  `)
})

test('with Renovate options and no Dagger, leaving workflow inputs alone', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
  })

  expect(
    JSON.stringify(synthSnapshot(project)['renovate.json5'].customManagers),
  ).not.toContain('dagger-version')
})

test('with Renovate options, reading Dagger module refs pinned to a tag', () => {
  const project = new Project({
    name: 'test-project',
    dagger: {},
    renovate: {},
  })

  expect(
    synthSnapshot(project)['renovate.json5'].customManagers.find(
      ({ packageNameTemplate }: { packageNameTemplate?: string }) =>
        packageNameTemplate === '{{{repo}}}',
    ),
  ).toMatchInlineSnapshot(`
    {
      "customType": "regex",
      "datasourceTemplate": "github-tags",
      "depNameTemplate": "github.com/{{{repo}}}{{#if subdir}}/{{{subdir}}}{{/if}}",
      "extractVersionTemplate": "^{{#if tagDir}}{{{tagDir}}}{{else}}{{#if subdir}}{{#unless (includes (toArray 'dagger/python' 'langri-sha/dagger') repo)}}{{{subdir}}}/{{/unless}}{{/if}}{{/if}}v(?<version>.+)$",
      "managerFilePatterns": [
        "/(^|/)\\.?projenrc\\.(js|cjs|mjs|ts|mts|cts)$/",
        "/(^|/)dagger\\.toml$/",
        "/(^|/)dagger-module\\.toml$/",
      ],
      "matchStrings": [
        "['"]github\\.com/(?<repo>[\\w.-]+/[\\w.-]+)(?:/(?<subdir>[^'"@]+))?@(?<tagDir>[^'"@]+/)?v(?<currentValue>\\d[^'"]*)['"]",
      ],
      "packageNameTemplate": "{{{repo}}}",
      "versioningTemplate": "semver",
    }
  `)
})

const moduleRefManager = (dagger: ProjectDaggerOptions) =>
  synthSnapshot(
    new Project({
      name: 'test-project',
      dagger,
      renovate: {},
    }),
  )['renovate.json5'].customManagers.find(
    ({ packageNameTemplate }: { packageNameTemplate?: string }) =>
      packageNameTemplate === '{{{repo}}}',
  )

test('with Renovate options, reading module refs of the named root-tagged repositories against the root tags', () => {
  expect(
    moduleRefManager({ rootTaggedRepositories: ['acme/modules'] })
      .extractVersionTemplate,
  ).toMatchInlineSnapshot(
    `"^{{#if tagDir}}{{{tagDir}}}{{else}}{{#if subdir}}{{#unless (includes (toArray 'acme/modules') repo)}}{{{subdir}}}/{{/unless}}{{/if}}{{/if}}v(?<version>.+)$"`,
  )
})

test('with Renovate options and no root-tagged repositories, reading every module ref against its subdirectory', () => {
  expect(
    moduleRefManager({ rootTaggedRepositories: [] }).extractVersionTemplate,
  ).toMatchInlineSnapshot(
    `"^{{#if tagDir}}{{{tagDir}}}{{else}}{{#if subdir}}{{{subdir}}}/{{/if}}{{/if}}v(?<version>.+)$"`,
  )
})

test('with Renovate options, rejecting a root-tagged repository that is not owner/name', () => {
  expect(() =>
    moduleRefManager({ rootTaggedRepositories: ["acme/modules') x ('"] }),
  ).toThrow(
    `Cannot read Dagger module tags at the root of "acme/modules') x ('". Name the repository as owner/name.`,
  )
})

test('with Renovate options and no uv workspace', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
  })

  expect(
    synthSnapshot(project)['renovate.json5'].packageRules.flatMap(
      ({ matchManagers }: { matchManagers?: string[] }) => matchManagers ?? [],
    ),
  ).not.toContain('pep621')
})

test('with Renovate options, holding uv to the ranges its manifests declare', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
    uv: {},
  })

  expect(
    synthSnapshot(project)['renovate.json5'].packageRules.filter(
      ({ matchManagers }: { matchManagers?: string[] }) =>
        matchManagers?.includes('pep621'),
    ),
  ).toMatchInlineSnapshot(`
    [
      {
        "description": "Synthesis writes the pyproject.toml manifests and reverts edits to them. Move only what uv.lock pins, within the ranges they declare",
        "matchManagers": [
          "pep621",
        ],
        "rangeStrategy": "in-range-only",
      },
    ]
  `)
})

test('with Renovate options and no Python version to read', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
    uv: {},
  })

  expect(
    synthSnapshot(project)['renovate.json5'].customManagers.map(
      ({ depNameTemplate }: { depNameTemplate?: string }) => depNameTemplate,
    ),
  ).not.toContain('python')
})

test('with Renovate options, reading the Python version out of the projenrc', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
    uv: {
      pythonVersion: '3.14',
    },
  })

  expect(
    synthSnapshot(project)['renovate.json5'].customManagers.filter(
      ({ depNameTemplate }: { depNameTemplate?: string }) =>
        depNameTemplate === 'python',
    ),
  ).toMatchInlineSnapshot(`
    [
      {
        "customType": "regex",
        "datasourceTemplate": "docker",
        "depNameTemplate": "python",
        "managerFilePatterns": [
          "/(^|/)\\.?projenrc\\.(js|cjs|mjs|ts|mts|cts)$/",
        ],
        "matchStrings": [
          "pythonVersion:\\s*'(?<currentValue>[^']+)'",
        ],
        "versioningTemplate": "docker",
      },
    ]
  `)
})

describe('with Renovate and skills options', () => {
  const renovate = (options = {}) =>
    synthSnapshot(
      new Project({
        name: 'test-project',
        package: {},
        renovate: {},
        ...options,
      }),
    )['renovate.json5']

  test('reads skill commits out of the projenrc', () => {
    expect(
      renovate({ skills: skillsOptions }).customManagers.filter(
        ({ datasourceTemplate }: { datasourceTemplate?: string }) =>
          datasourceTemplate === 'git-refs',
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "customType": "regex",
          "datasourceTemplate": "git-refs",
          "depTypeTemplate": "skills",
          "managerFilePatterns": [
            "/(^|/)\\.?projenrc\\.(js|cjs|mjs|ts|mts|cts)$/",
          ],
          "matchStrings": [
            "source:\\s*['"](?<depName>[\\w.-]+/[\\w.-]+)['"],\\s*ref:\\s*['"](?<currentDigest>[0-9a-f]{40})['"]",
          ],
          "packageNameTemplate": "https://github.com/{{{depName}}}",
        },
      ]
    `)
  })

  test('reads skill tags out of the projenrc', () => {
    expect(
      renovate({ skills: skillsOptions }).customManagers.filter(
        ({ depTypeTemplate, datasourceTemplate }: Record<string, string>) =>
          depTypeTemplate === 'skills' && datasourceTemplate === 'github-tags',
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "customType": "regex",
          "datasourceTemplate": "github-tags",
          "depTypeTemplate": "skills",
          "extractVersionTemplate": "^v(?<version>.+)$",
          "managerFilePatterns": [
            "/(^|/)\\.?projenrc\\.(js|cjs|mjs|ts|mts|cts)$/",
          ],
          "matchStrings": [
            "source:\\s*['"](?<depName>[\\w.-]+/[\\w.-]+)['"],\\s*ref:\\s*['"]v(?<currentValue>\\d+\\.\\d+\\.\\d+)['"]",
          ],
          "versioningTemplate": "semver",
        },
      ]
    `)
  })

  test('lets skill commits past the release age', () => {
    expect(
      renovate({ skills: skillsOptions }).packageRules.filter(
        ({ matchDepTypes }: { matchDepTypes?: string[] }) =>
          matchDepTypes?.includes('skills'),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "description": "Skill commits carry no release date. Propose them without waiting out the release age",
          "matchDepTypes": [
            "skills",
          ],
          "matchManagers": [
            "custom.regex",
          ],
          "minimumReleaseAgeBehaviour": "timestamp-optional",
        },
      ]
    `)
  })

  test('reads nothing without skills', () => {
    const { customManagers, packageRules } = renovate()

    expect(JSON.stringify(customManagers)).not.toContain('git-refs')
    expect(JSON.stringify(packageRules)).not.toContain('skills')
  })
})

/**
 * A custom manager is two loose patterns away from rewriting something that
 * only looks like a dependency. `pnpm@` matched the tail of
 * `langri-sha/github/actions/pnpm@v0.14.1` in a package source, and Renovate
 * walked that GitHub Action reference through four pnpm releases before anyone
 * noticed. Assert what the patterns reach, against the strings themselves.
 */
describe('with Renovate options, the custom managers', () => {
  interface CustomManager {
    datasourceTemplate?: string
    depNameTemplate?: string
    depTypeTemplate?: string
    managerFilePatterns: string[]
    matchStrings: string[]
    matchStringsStrategy?: string
  }

  // With Cargo, Dagger and a Python version, so that their managers are
  // among them.
  const customManagers = (): CustomManager[] =>
    synthSnapshot(
      new Project({
        name: 'test-project',
        cargo: {},
        dagger: {},
        renovate: {},
        uv: {
          pythonVersion: '3.14',
        },
      }),
    )['renovate.json5'].customManagers

  const covers = ({ managerFilePatterns }: CustomManager, file: string) =>
    managerFilePatterns.some((pattern) =>
      new RegExp(pattern.slice(1, -1)).test(file),
    )

  test('read the package manager out of a projenrc and nowhere else', () => {
    const manager = customManagers().find(
      ({ depNameTemplate }) => depNameTemplate === 'pnpm',
    )!
    const [matchString] = manager.matchStrings

    expect(covers(manager, '.projenrc.ts')).toBe(true)
    expect(covers(manager, 'packages/projen-dagger/src/index.ts')).toBe(false)

    expect(
      new RegExp(matchString).exec(
        "project.package?.addField('packageManager', 'pnpm@12.3.4')",
      )?.groups?.currentValue,
    ).toBe('12.3.4')
    expect(
      "options.pnpmSetupAction ?? 'langri-sha/github/actions/pnpm@v0.14.1'",
    ).not.toMatch(new RegExp(matchString))
  })

  test('read the Dagger engine out of a projenrc and nowhere else', () => {
    const manager = customManagers().find(
      ({ depNameTemplate }) => depNameTemplate === 'dagger/dagger',
    )!
    const [matchString] = manager.matchStrings

    expect(covers(manager, '.projenrc.ts')).toBe(true)
    expect(covers(manager, 'packages/some/.projenrc.mjs')).toBe(true)
    // Where this preset declares the option, and where its tests restate an
    // engine version, are both `.ts` files under a path containing `projen`.
    expect(covers(manager, 'packages/projen-dagger/src/index.ts')).toBe(false)
    expect(covers(manager, 'packages/projen-project/src/index.test.ts')).toBe(
      false,
    )

    expect(
      new RegExp(matchString).exec("    engineVersion: 'v0.20.8',")?.groups
        ?.currentValue,
    ).toBe('0.20.8')
  })

  test('read the Python version out of a projenrc and nowhere else', () => {
    const manager = customManagers().find(
      ({ depNameTemplate }) => depNameTemplate === 'python',
    )!
    const [matchString] = manager.matchStrings

    expect(covers(manager, '.projenrc.ts')).toBe(true)
    expect(covers(manager, 'packages/some/.projenrc.mjs')).toBe(true)
    // Both restate a Python version in a `.ts` file under a path containing
    // `projen`.
    expect(covers(manager, 'packages/projen-uv/src/index.test.ts')).toBe(false)
    expect(covers(manager, 'packages/projen-project/src/index.test.ts')).toBe(
      false,
    )

    expect(
      new RegExp(matchString).exec("    pythonVersion: '3.14',")?.groups
        ?.currentValue,
    ).toBe('3.14')
  })

  test('read skill commits out of a projenrc and nowhere else', () => {
    const manager = (
      synthSnapshot(
        new Project({
          name: 'test-project',
          package: {},
          renovate: {},
          skills: skillsOptions,
        }),
      )['renovate.json5'].customManagers as CustomManager[]
    ).find(({ datasourceTemplate }) => datasourceTemplate === 'git-refs')!
    const matchString = new RegExp(manager.matchStrings[0]!)
    const sha = '0b8fb22aaa7f82447d4befe1b6a95d30a5b279b8'

    expect(covers(manager, '.projenrc.ts')).toBe(true)
    expect(covers(manager, 'packages/some/.projenrc.mjs')).toBe(true)
    // Both declare skills in a `.ts` file under a path containing `projen`.
    expect(covers(manager, 'packages/projen-skills/src/index.test.ts')).toBe(
      false,
    )
    expect(covers(manager, 'packages/projen-project/src/index.test.ts')).toBe(
      false,
    )

    expect(
      matchString.exec(
        `{ source: 'vercel-labs/skills', ref: '${sha}', skills: ['find-skills'] }`,
      )?.groups,
    ).toEqual({ depName: 'vercel-labs/skills', currentDigest: sha })
    expect(
      matchString.exec(
        `{\n      source: "vercel-labs/skills",\n      ref: "${sha}",\n`,
      )?.groups,
    ).toEqual({ depName: 'vercel-labs/skills', currentDigest: sha })
    expect("source: 'vercel-labs/skills', ref: 'main'").not.toMatch(matchString)
    expect("source: 'npm:@acme/skills', skills: ['a']").not.toMatch(matchString)
    expect("source: 'vercel-labs/skills', ref: 'v1.0.0'").not.toMatch(
      matchString,
    )
  })

  test('read skill tags out of a projenrc and nowhere else', () => {
    const manager = (
      synthSnapshot(
        new Project({
          name: 'test-project',
          package: {},
          renovate: {},
          skills: skillsOptions,
        }),
      )['renovate.json5'].customManagers as CustomManager[]
    ).find(
      ({ datasourceTemplate, depTypeTemplate }) =>
        datasourceTemplate === 'github-tags' && depTypeTemplate === 'skills',
    )!
    const matchString = new RegExp(manager.matchStrings[0]!)

    expect(covers(manager, '.projenrc.ts')).toBe(true)
    expect(covers(manager, 'packages/some/.projenrc.mjs')).toBe(true)
    expect(covers(manager, 'packages/projen-skills/src/index.test.ts')).toBe(
      false,
    )

    expect(
      matchString.exec(
        `{ source: 'vercel-labs/skills', ref: 'v1.2.3', skills: ['find-skills'] }`,
      )?.groups,
    ).toEqual({ depName: 'vercel-labs/skills', currentValue: '1.2.3' })
    expect(
      matchString.exec(
        `{\n      source: "vercel-labs/skills",\n      ref: "v10.0.21",\n`,
      )?.groups,
    ).toEqual({ depName: 'vercel-labs/skills', currentValue: '10.0.21' })
    expect(
      "source: 'vercel-labs/skills', ref: '0b8fb22aaa7f82447d4befe1b6a95d30a5b279b8'",
    ).not.toMatch(matchString)
    expect("source: 'vercel-labs/skills', ref: 'main'").not.toMatch(matchString)
    expect("source: 'vercel-labs/skills', ref: 'v1.2.3-beta.1'").not.toMatch(
      matchString,
    )
    expect("source: 'npm:@acme/skills', skills: ['a']").not.toMatch(matchString)
  })

  test('read the Dagger version out of a workflow input, and nowhere else', () => {
    const manager = customManagers().find(({ matchStrings }) =>
      matchStrings.some((matchString) =>
        matchString.includes('dagger-version'),
      ),
    )!
    const matchString = new RegExp(manager.matchStrings[0]!, 'g')
    const versions = (content: string) =>
      [...content.matchAll(matchString)].map(
        (match) => match.groups?.currentValue,
      )

    expect(manager.depNameTemplate).toBe('dagger/dagger')
    expect(covers(manager, '.github/workflows/workspace.yml')).toBe(true)
    expect(covers(manager, '.github/workflows/check.yaml')).toBe(true)
    expect(covers(manager, '.projenrc.ts')).toBe(false)
    expect(covers(manager, 'packages/projen-project/src/index.test.ts')).toBe(
      false,
    )
    expect(covers(manager, 'packages/app/.github/workflows/check.yml')).toBe(
      false,
    )

    expect(versions('      dagger-version: v1.0.0-beta.15\n')).toEqual([
      '1.0.0-beta.15',
    ])
    expect(versions('      dagger-version: "v1.0.0"\n')).toEqual(['1.0.0'])
    expect(versions("      dagger-version: 'v1.0.0'\n")).toEqual(['1.0.0'])
    expect(versions('      dagger-version: v1.0.0 # pinned\n')).toEqual([
      '1.0.0',
    ])
    expect(versions('      dagger-version:   v1.0.0\n')).toEqual(['1.0.0'])
    expect(versions('dagger-version: v1.0.0\n')).toEqual(['1.0.0'])
    expect(
      versions('with:\r\n  dagger-version: v1.0.0\r\n  other: v2.0.0\r\n'),
    ).toEqual(['1.0.0'])
    expect(
      versions('a:\n  dagger-version: v1.0.0\nb:\n  dagger-version: v2.0.0\n'),
    ).toEqual(['1.0.0', '2.0.0'])

    const checkWorkflow = [
      'on:',
      '  workflow_call:',
      '    inputs:',
      '      dagger-version:',
      '        description: >-',
      '          Dagger engine version to run, e.g. `v1.0.0-beta.15`, in place of',
      '          the one resolved from the module manifests.',
      '        type: string',
      '        default: ""',
      'jobs:',
      '  check:',
      '    steps:',
      '      - name: Resolve Dagger version',
      '        id: dagger-version',
      '        uses: langri-sha/github/actions/dagger-version@v0.24.0',
      '      - with:',
      '          version: ${{ inputs.dagger-version || steps.dagger-version.outputs.version }}',
      '',
    ].join('\n')

    expect(versions(checkWorkflow)).toEqual([])
    expect(versions('dagger-version:\nv1.0.0\n')).toEqual([])
    expect(versions('      dagger-version: ${{ vars.DAGGER }}\n')).toEqual([])
    expect(versions('      dagger-version: latest\n')).toEqual([])
    expect(versions('      # dagger-version: v1.0.0\n')).toEqual([])
    expect(versions('      old-dagger-version: v1.0.0\n')).toEqual([])
  })

  test('read Dagger module refs pinned to a tag, and nothing else', () => {
    const manager = customManagers().find(({ depNameTemplate }) =>
      depNameTemplate?.startsWith('github.com/'),
    )!
    const matchString = new RegExp(manager.matchStrings[0]!)

    expect(covers(manager, '.projenrc.ts')).toBe(true)
    expect(covers(manager, 'dagger.toml')).toBe(true)
    expect(covers(manager, '.dagger/modules/ci/dagger-module.toml')).toBe(true)
    expect(covers(manager, 'packages/projen-dagger/src/index.test.ts')).toBe(
      false,
    )
    expect(covers(manager, 'packages/projen-project/src/index.test.ts')).toBe(
      false,
    )

    expect(
      matchString.exec(
        "          'github.com/shykes/daggerverse/hello@v0.3.0',",
      )?.groups,
    ).toEqual({
      repo: 'shykes/daggerverse',
      subdir: 'hello',
      tagDir: undefined,
      currentValue: '0.3.0',
    })
    expect(
      matchString.exec(
        "          'github.com/langri-sha/dagger/terraform@terraform/v0.1.0',",
      )?.groups,
    ).toEqual({
      repo: 'langri-sha/dagger',
      subdir: 'terraform',
      tagDir: 'terraform/',
      currentValue: '0.1.0',
    })
    expect(
      matchString.exec('source = "github.com/dagger/eslint@v0.2.0"')?.groups,
    ).toEqual({
      repo: 'dagger/eslint',
      subdir: undefined,
      tagDir: undefined,
      currentValue: '0.2.0',
    })

    for (const line of [
      "'../terraform',",
      "'github.com/dagger/eslint',",
      "'github.com/dagger/eslint@main',",
      "'dagger.io/js/eslint@v0.2.0',",
      "exec: 'go install github.com/vito/dang/cmd/dang@v2.1.4',",
    ]) {
      expect(line).not.toMatch(matchString)
    }
  })

  test('read the pinned modules of a workspace, and no vanity ref', () => {
    const manager = customManagers().find(({ depNameTemplate }) =>
      depNameTemplate?.startsWith('github.com/'),
    )!
    const matchString = new RegExp(manager.matchStrings[0]!, 'g')
    const refs = (content: string) =>
      [...content.matchAll(matchString)].map((match) => ({
        ...match.groups,
      }))

    const workspace = [
      'ignore = [',
      '  "**/node_modules",',
      '  "**/dist",',
      ']',
      '',
      '[modules.ci]',
      'source = "github.com/langri-sha/dagger/ci@ci/v0.1.0"',
      '',
      '[modules.eslint]',
      'source = "github.com/dagger/eslint@v0.2.0"',
      '',
      '[modules.eslint.settings]',
      'packageManager = "pnpm"',
      'baseImageAddress = "node:24-slim"',
      '',
      '[modules.prettier]',
      'source = "github.com/dagger/prettier@v0.1.0"',
      '',
      '[modules.vitest]',
      'source = "github.com/dagger/vitest@v0.1.0"',
      '',
    ].join('\n')

    expect(refs(workspace)).toEqual([
      {
        repo: 'langri-sha/dagger',
        subdir: 'ci',
        tagDir: 'ci/',
        currentValue: '0.1.0',
      },
      {
        repo: 'dagger/eslint',
        subdir: undefined,
        tagDir: undefined,
        currentValue: '0.2.0',
      },
      {
        repo: 'dagger/prettier',
        subdir: undefined,
        tagDir: undefined,
        currentValue: '0.1.0',
      },
      {
        repo: 'dagger/vitest',
        subdir: undefined,
        tagDir: undefined,
        currentValue: '0.1.0',
      },
    ])

    const vanityWorkspace = [
      '[modules.ci]',
      'source = "github.com/langri-sha/dagger/ci@ci/v0.1.0"',
      '',
      '[modules.prettier]',
      'source = "dagger.io/js/prettier"',
      '',
      '[modules.eslint]',
      'source = "dagger.io/js/eslint@v0.1.0"',
      '',
      '[modules.biome]',
      'source = "dagger.io/js/biome"',
      '',
    ].join('\n')

    expect(refs(vanityWorkspace).map(({ repo }) => repo)).toEqual([
      'langri-sha/dagger',
    ])
  })

  test('name the package an execution runs, not the one they were copied from', () => {
    const manager = customManagers().find(({ matchStrings }) =>
      matchStrings.some((matchString) => matchString.includes('bun')),
    )!
    const [matchString] = manager.matchStrings

    expect(manager.depNameTemplate).toBeUndefined()

    expect(covers(manager, '.projenrc.ts')).toBe(true)
    expect(covers(manager, 'packages/some/.projenrc.mjs')).toBe(true)
    expect(covers(manager, '.github/workflows/check.yml')).toBe(true)
    // The fixtures below are themselves a pinned execution, so a pattern
    // reaching this file walks them forward and leaves the assertions behind.
    expect(covers(manager, 'packages/projen-project/src/index.test.ts')).toBe(
      false,
    )

    expect(
      new RegExp(matchString).exec("exec: 'pnpx sort-package-json@3.4.0',")
        ?.groups,
    ).toMatchObject({
      depName: 'sort-package-json',
      currentValue: '3.4.0',
    })
    expect(
      new RegExp(matchString).exec('bunx @langri-sha/tsconfig@1.2.3 --check')
        ?.groups,
    ).toMatchObject({
      depName: '@langri-sha/tsconfig',
      currentValue: '1.2.3',
    })
  })

  test('leave every GitHub Action reference alone', () => {
    const source = [
      "   * @default 'langri-sha/github/actions/pnpm@v0.14.1'",
      "    const checkoutAction = options.checkoutAction ?? 'actions/checkout@v7'",
      "      options.pnpmSetupAction ?? 'langri-sha/github/actions/pnpm@v0.14.1'",
      '        uses: pnpm/action-setup@v4',
      '    uses: langri-sha/github/.github/workflows/check.yml@v0.14.1',
    ].join('\n')

    const matches = (text: string, matchString: string) =>
      [...text.matchAll(new RegExp(matchString, 'gm'))].map(([match]) => match)

    // `recursive` narrows the previous match rather than searching the file
    // again, so a pattern that would match on its own is only reachable
    // through the context the pattern before it established.
    const extract = ({ matchStrings, matchStringsStrategy }: CustomManager) =>
      matchStringsStrategy === 'recursive'
        ? matchStrings.reduce(
            (texts, matchString) =>
              texts.flatMap((text) => matches(text, matchString)),
            [source],
          )
        : matchStrings.flatMap((matchString) => matches(source, matchString))

    for (const manager of customManagers()) {
      expect(extract(manager)).toEqual([])
    }
  })
})

describe('with Ruff options', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      ruff: {
        'line-length': 120,
        lint: {
          select: ['E', 'F', 'W', 'ANN'],
          ignore: ['E501'],
        },
      },
    })

    expect(synthSnapshot(project)['ruff.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      line-length = 120

      [lint]
      select = [ "E", "F", "W", "ANN" ]
      ignore = [ "E501" ]
      "
    `)
    expect(project.ruff).toBeInstanceOf(Ruff)
  })

  test('is a root project property', () => {
    const project = new Project({
      name: 'test-project',
    })

    const subproject = project.addSubproject({
      name: 'subproject',
      outdir: 'packages/subproject',
      ruff: {},
    })

    expect(subproject.ruff).toBeUndefined()
  })
})

describe('with SWC options', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      swcrc: {},
    })

    expect(synthSnapshot(project)['.swcrc']).toMatchSnapshot()
    expect(project.swcrc).toBeInstanceOf(SWCConfig)
  })

  test('with TypeScript', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      swcrc: {},
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)['.swcrc']).toMatchSnapshot()
  })
})

describe('peers the preset requires', () => {
  const load = createRequire(import.meta.url)
  const preset = load('../package.json')

  const required = [
    preset,
    ...Object.keys(preset.dependencies)
      .filter((name) => name.startsWith('@langri-sha/'))
      .map((name) => load(`${name}/package.json`)),
  ].flatMap(({ peerDependencies = {}, peerDependenciesMeta = {} }) =>
    Object.keys(peerDependencies).filter(
      (peer) => !peerDependenciesMeta[peer]?.optional,
    ),
  )

  test('include Projen', () => {
    expect(required).toContain('projen')
  })

  test.each([
    '@babel/core',
    '@changesets/cli',
    '@langri-sha/babel-preset',
    '@langri-sha/eslint-config',
    '@langri-sha/lint-staged',
    '@langri-sha/prettier',
    '@langri-sha/vitest',
    '@swc/core',
    'beachball',
    'eslint',
    'husky',
    'jest',
    'lint-staged',
    'prettier',
    'skills',
    'typescript',
    'vitest',
  ])('leave out %s', (tool) => {
    expect(required).not.toContain(tool)
  })
})

/**
 * Every feature that needs a tool supplies a version for it. The project may
 * name its own instead, and when it does that version has to survive
 * synthesis — otherwise a bot upgrading the dependency has its bump undone,
 * merges a pull request that changed nothing, and opens the same one again.
 *
 * The two halves of that contract, one case per tool:
 *
 *   - with no declaration, the project gets the version this preset supplies,
 *     and Renovate is told not to upgrade it (this preset upgrades it instead);
 *   - with a declaration, the declared version is what synthesis writes, and
 *     Renovate is left free to upgrade it.
 */
describe('supplied development dependency versions', () => {
  const synthesize = ({ deps, devDeps, ...options }: Record<string, unknown>) =>
    synthSnapshot(
      new Project({
        name: 'test-project',
        renovate: {},
        ...options,
        package: {
          deps: deps as string[] | undefined,
          devDeps: devDeps as string[] | undefined,
        },
      }),
    )

  type SynthOutput = ReturnType<typeof synthSnapshot>

  const withheldRule = (files: SynthOutput) =>
    files['renovate.json5'].packageRules.find(
      (rule: { enabled?: boolean }) => rule.enabled === false,
    )

  const suppressedPackages = (files: SynthOutput): string[] =>
    withheldRule(files)?.matchPackageNames ?? []

  const TOOLS = [
    { tool: '@babel/core', enabledBy: { babel: {} } },
    { tool: '@changesets/cli', enabledBy: { changesets: {} } },
    { tool: '@langri-sha/babel-preset', enabledBy: { babel: {} } },
    { tool: '@langri-sha/eslint-config', enabledBy: { eslint: {} } },
    { tool: '@langri-sha/lint-staged', enabledBy: { lintStaged: {} } },
    { tool: '@langri-sha/prettier', enabledBy: { prettier: {} } },
    { tool: '@langri-sha/vitest', enabledBy: { vitest: true } },
    { tool: 'beachball', enabledBy: { beachball: {} } },
    { tool: 'eslint', enabledBy: { eslint: {} } },
    { tool: 'husky', enabledBy: { husky: {} } },
    { tool: 'jest', enabledBy: { jestConfig: {} } },
    { tool: 'lint-staged', enabledBy: { lintStaged: {} } },
    { tool: 'prettier', enabledBy: { prettier: {} } },
    { tool: 'skills', enabledBy: { skills: skillsOptions } },
    { tool: 'typescript', enabledBy: { typeScriptConfig: {} } },
    { tool: 'vitest', enabledBy: { vitest: true } },
    { tool: '@swc/core', enabledBy: { swcrc: {} } },
    { tool: '@swc-node/register', enabledBy: { swcrc: {} } },
    // Not features — every root project is given Projen itself, and `tsx` to
    // run the projenrc.
    { tool: 'projen', enabledBy: {} },
    { tool: 'tsx', enabledBy: {} },
    { tool: 'tsx', enabledBy: { swcrc: {} } },
  ]

  describe.each(TOOLS)('$tool', ({ tool, enabledBy }) => {
    const supplied = synthesize(enabledBy)
    const declared = synthesize({
      ...enabledBy,
      devDeps: [`${tool}@*`],
    })
    const runtime = synthesize({ ...enabledBy, deps: [`${tool}@*`] })

    test('supplies a concrete version by default', () => {
      const version = supplied['package.json'].devDependencies[tool] as string

      expect(valid(version)).toBe(version)
    })

    test('withholds its default from Renovate', () => {
      expect(suppressedPackages(supplied)).toContain(tool)
    })

    test('preserves a project declaration', () => {
      expect(declared['package.json'].devDependencies[tool]).toBe('*')
    })

    test('leaves a project declaration to Renovate', () => {
      expect(suppressedPackages(declared)).not.toContain(tool)
    })

    test('gives way to a runtime declaration', () => {
      expect(runtime['package.json'].dependencies[tool]).toBe('*')
      expect(runtime['package.json'].devDependencies).not.toHaveProperty([tool])
      expect(suppressedPackages(runtime)).not.toContain(tool)
    })

    test('withholds it from subprojects', () => {
      const project = new Project({ name: 'test-project', package: {} })

      project.addSubproject({
        name: '@someproject/test',
        outdir: path.join('packages', 'test'),
        package: {},
        ...enabledBy,
      })

      expect(
        synthSnapshot(project)['packages/test/package.json'].devDependencies?.[
          tool
        ],
      ).toBeUndefined()
    })
  })

  test('a version that resolves rather than dictates stays upgradable', () => {
    // `@langri-sha/tsconfig` is supplied as `*`, which takes whatever is
    // installed and so already follows upgrades. Suppressing it would freeze
    // a dependency that was never stuck.
    const files = synthesize({ renovate: {}, typeScriptConfig: {} })

    expect(suppressedPackages(files)).not.toContain('@langri-sha/tsconfig')
  })

  test.each([
    { name: '@langri-sha/babel-preset', enabledBy: { babel: {} } },
    { name: '@langri-sha/eslint-config', enabledBy: { eslint: {} } },
    { name: '@langri-sha/lint-staged', enabledBy: { lintStaged: {} } },
    { name: '@langri-sha/prettier', enabledBy: { prettier: {} } },
    { name: '@langri-sha/vitest', enabledBy: { vitest: true } },
  ])('does not declare $name in its own project', ({ name, enabledBy }) => {
    const files = synthesize({ name, ...enabledBy })

    expect(files['package.json'].devDependencies).not.toHaveProperty([name])
  })

  test('withholds them from the manifest, not from this preset', () => {
    // The custom managers read `.projenrc` files, and this preset's own
    // sources are among them — that is where these pins are declared and
    // upgraded. Disabling a package outright would reach those too and freeze
    // the version everywhere, forever.
    const files = synthesize({ beachball: {} })

    expect(withheldRule(files).matchManagers).toEqual(['npm'])
  })

  test('names only the packages it actually supplied', () => {
    // A project with no features enabled is still given Projen, `tsx` and
    // `@langri-sha/projen-project`. Only the first two are literal versions,
    // so only those are withheld.
    const files = synthesize({})

    expect(suppressedPackages(files)).toEqual(['projen', 'tsx'])
  })
})

describe('a subproject that peers projen', () => {
  const subproject = ({
    peerDeps = ['projen@>=0.86.0 <1.0.0'],
    devDeps,
    pinnedDevDependency = false,
  }: {
    peerDeps?: string[]
    devDeps?: string[]
    pinnedDevDependency?: boolean
  } = {}) => {
    const project = new Project({ name: 'test-project', package: {} })

    project.addSubproject({
      name: '@someproject/test',
      outdir: path.join('packages', 'test'),
      package: {
        devDeps,
        peerDeps,
        peerDependencyOptions: { pinnedDevDependency },
      },
    })

    return synthSnapshot(project)
  }

  test('is given the version the root develops against', () => {
    const files = subproject()

    expect(files['packages/test/package.json'].devDependencies.projen).toBe(
      files['package.json'].devDependencies.projen,
    )
    expect(valid(files['package.json'].devDependencies.projen)).not.toBeNull()
  })

  test('keeps the peer range it declared', () => {
    expect(
      subproject({ peerDeps: ['projen@^0.104.0'] })[
        'packages/test/package.json'
      ].peerDependencies.projen,
    ).toBe('^0.104.0')
  })

  test('keeps a version it declared itself', () => {
    expect(
      subproject({ devDeps: ['projen@*'] })['packages/test/package.json']
        .devDependencies.projen,
    ).toBe('*')
  })

  test('leaves the dependency to Projen when it pins from the range', () => {
    expect(
      subproject({ pinnedDevDependency: true })['packages/test/package.json']
        .devDependencies.projen,
    ).toBe('0.86.0')
  })

  test('is not given one without the peer', () => {
    expect(
      subproject({ peerDeps: [] })['packages/test/package.json'].devDependencies
        ?.projen,
    ).toBeUndefined()
  })

  test('fails when the range excludes the supplied version', () => {
    expect(() => subproject({ peerDeps: ['projen@^0.90.0'] })).toThrowError(
      /@someproject\/test peers projen@\^0\.90\.0.*outside that range.*package\.devDeps/s,
    )
  })

  test('accepts a range that spans several releases', () => {
    expect(() =>
      subproject({ peerDeps: ['projen@>=0.86.0 <1.0.0'] }),
    ).not.toThrow()
  })
})

describe('pnpm workspace ignore patterns', () => {
  const synthesize = (
    packageOptions: NodePackageOptions = {},
    workspaceOptions?: PnpmWorkspaceOptions,
  ) => {
    const project = new Project({
      name: 'test-project',
      package: {},
      pnpmWorkspace: {},
    })

    project.addSubproject({
      name: '@someproject/test',
      outdir: path.join('packages', 'test'),
      package: packageOptions,
      pnpmWorkspace: workspaceOptions,
    })

    return synthSnapshot(project)
  }

  test('leaves the implicit workspace out of subproject unignore patterns', () => {
    const files = synthesize()

    expect(files['packages/test/.gitignore'].split('\n')).not.toContain(
      '!/pnpm-workspace.yaml',
    )
    expect(files).not.toHaveProperty('packages/test/pnpm-workspace.yaml')
  })

  test('keeps the root workspace trackable', () => {
    const files = synthesize()

    expect(files['.gitignore'].split('\n')).toContain('!/pnpm-workspace.yaml')
    expect(files).toHaveProperty('pnpm-workspace.yaml')
  })

  test('keeps an explicitly configured subproject workspace trackable', () => {
    const files = synthesize({}, { packages: ['nested/*'] })

    expect(files['packages/test/.gitignore'].split('\n')).toContain(
      '!/pnpm-workspace.yaml',
    )
    expect(files['packages/test/pnpm-workspace.yaml']).toContain('nested/*')
  })

  test('keeps native subproject workspace settings trackable', () => {
    const files = synthesize({
      pnpmOptions: { workspaceYamlOptions: { packages: ['nested/*'] } },
    })

    expect(files['packages/test/.gitignore'].split('\n')).toContain(
      '!/pnpm-workspace.yaml',
    )
    expect(files['packages/test/pnpm-workspace.yaml']).toContain('nested/*')
  })

  test('keeps a subproject build-script allowlist trackable', () => {
    const files = synthesize({ allowScripts: ['esbuild'] })

    expect(files['packages/test/.gitignore'].split('\n')).toContain(
      '!/pnpm-workspace.yaml',
    )
    expect(files['packages/test/pnpm-workspace.yaml']).toContain('esbuild')
  })
})

describe('the package manager in manifests', () => {
  const synthesize = (packageOptions: Record<string, unknown> = {}) => {
    const project = new Project({
      name: 'test-project',
      package: packageOptions,
    })

    project.addSubproject({
      name: '@someproject/test',
      outdir: path.join('packages', 'test'),
      package: packageOptions,
    })

    return { project, files: synthSnapshot(project) }
  }

  const projenWritesPnpm = (() => {
    const project = new BaseProject({ name: 'probe' })

    new javascript.NodePackage(project, {
      packageManager: javascript.NodePackageManager.PNPM,
    })

    return 'packageManager' in synthSnapshot(project)['package.json']
  })()

  test('leaves packageManager out of a subproject', () => {
    expect(synthesize().files['packages/test/package.json']).not.toHaveProperty(
      'packageManager',
    )
  })

  test('leaves packageManager out of the root', () => {
    expect(synthesize().files['package.json']).not.toHaveProperty(
      'packageManager',
    )
  })

  test('leaves devEngines out of the manifests', () => {
    const { files } = synthesize()

    expect(files['package.json']).not.toHaveProperty('devEngines')
    expect(files['packages/test/package.json']).not.toHaveProperty('devEngines')
  })

  test('keeps a packageManager the project adds itself', () => {
    const project = new Project({ name: 'test-project', package: {} })

    project.package?.addField('packageManager', 'pnpm@12.10.1')

    expect(synthSnapshot(project)['package.json'].packageManager).toBe(
      'pnpm@12.10.1',
    )
  })

  test.skipIf(!projenWritesPnpm)('keeps a pnpm version it names', () => {
    expect(
      synthesize({ pnpmVersion: '12.10.1' }).files['packages/test/package.json']
        .packageManager,
    ).toBe('pnpm@12.10.1')
  })
})

describe('declarations this preset cannot support', () => {
  const declaring =
    (devDeps: string[], options = {}) =>
    () =>
      new Project({ name: 'test-project', package: { devDeps }, ...options })

  test('are rejected, naming the version and the supported range', () => {
    expect(declaring(['projen@0.84.8'])).toThrowError(
      /declares projen@0\.84\.8.*does not support.*>=0\.86\.0 <1\.0\.0/s,
    )
  })

  test('are rejected from projen 1.0.0', () => {
    expect(declaring(['projen@1.0.0'])).toThrowError(
      /declares projen@1\.0\.0.*does not support/s,
    )
  })

  test('are accepted through the 0.x line', () => {
    expect(declaring(['projen@0.104.3'])).not.toThrow()
  })

  test('are rejected among runtime dependencies too', () => {
    const deps = ['projen@0.84.8']

    expect(
      () => new Project({ name: 'test-project', package: { deps } }),
    ).toThrowError(/declares projen@0\.84\.8.*remove it from `package\.deps`/s)
  })

  test('say how to resolve it', () => {
    expect(declaring(['projen@0.84.8'])).toThrowError(
      /Raise the declaration.*or remove it from `package\.devDeps`/s,
    )
  })

  test.each([
    { spec: '@babel/core@7.29.7', enabledBy: { babel: {} } },
    { spec: '@changesets/cli@2.29.0', enabledBy: { changesets: {} } },
    { spec: '@langri-sha/babel-preset@0.5.7', enabledBy: { babel: {} } },
    { spec: '@langri-sha/eslint-config@0.9.19', enabledBy: { eslint: {} } },
    { spec: '@langri-sha/lint-staged@0.8.0', enabledBy: { lintStaged: {} } },
    { spec: '@langri-sha/prettier@0.3.1', enabledBy: { prettier: {} } },
    { spec: '@langri-sha/vitest@0.1.0', enabledBy: { vitest: true } },
    { spec: '@swc/core@1.5.29', enabledBy: { swcrc: {} } },
    { spec: 'beachball@1.53.2', enabledBy: { beachball: {} } },
    { spec: 'eslint@9.39.5', enabledBy: { eslint: {} } },
    { spec: 'husky@8.0.3', enabledBy: { husky: {} } },
    { spec: 'jest@29.7.0', enabledBy: { jestConfig: {} } },
    { spec: 'lint-staged@16.4.0', enabledBy: { lintStaged: {} } },
    { spec: 'prettier@2.8.8', enabledBy: { prettier: {} } },
    { spec: 'skills@1.7.1', enabledBy: { skills: skillsOptions } },
    { spec: 'typescript@5.4.5', enabledBy: { typeScriptConfig: {} } },
    { spec: 'vitest@4.1.0', enabledBy: { vitest: true } },
  ])(
    'validate $spec when its configuration is enabled',
    ({ spec, enabledBy }) => {
      expect(declaring([spec], enabledBy)).toThrowError(`declares ${spec},`)
    },
  )

  test('do not reject a version that is behind but still supported', () => {
    const project = declaring(['typescript@5.6.0'], { typeScriptConfig: {} })()

    expect(
      synthSnapshot(project)['package.json'].devDependencies.typescript,
    ).toBe('5.6.0')
  })

  test('do not reject a version that runs ahead', () => {
    const project = declaring(['@swc/core@1.15.46'], { swcrc: {} })()

    expect(
      synthSnapshot(project)['package.json'].devDependencies['@swc/core'],
    ).toBe('1.15.46')
  })

  test.each(['typescript@*', 'typescript@^5.5.0'])(
    'skip %s, which names a resolution rather than a version',
    (spec) => {
      expect(declaring([spec], { typeScriptConfig: {} })).not.toThrow()
    },
  )
})

describe('synthesizing again once installing dependencies moves projen', () => {
  const installProjen = (outdir: string, version: string) => {
    const directory = path.join(outdir, 'node_modules', 'projen')

    mkdirSync(directory, { recursive: true })
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({ version }),
    )
  }

  class ProjenInstall extends Component {
    readonly #version: string

    constructor(project: BaseProject, version: string) {
      super(project)

      this.#version = version
    }

    override postSynthesize() {
      installProjen(this.project.outdir, this.#version)
    }
  }

  const synthesizeMovingProjen = (from: string, to: string) => {
    const project = new Project({ name: 'test-project' })

    installProjen(project.outdir, from)
    new ProjenInstall(project, to)
    project.synth()

    return project
  }

  beforeEach(() => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
    } as ReturnType<typeof spawnSync>)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('runs projen again, marked with the version it moved to', () => {
    const project = synthesizeMovingProjen('0.86.5', '0.104.1')

    expect(spawnSync).toHaveBeenCalledExactlyOnceWith('pnpm exec projen', {
      cwd: project.outdir,
      env: expect.objectContaining({
        PROJEN_PROJECT_RESYNTHESIZED: '0.104.1',
      }),
      shell: true,
      stdio: 'inherit',
    })
  })

  test('does not run projen again when it stays put', () => {
    synthesizeMovingProjen('0.104.1', '0.104.1')

    expect(spawnSync).not.toHaveBeenCalled()
  })

  test('does not run projen again when it was not installed beforehand', () => {
    const project = new Project({ name: 'test-project' })

    new ProjenInstall(project, '0.104.1')
    project.synth()

    expect(spawnSync).not.toHaveBeenCalled()
  })

  test('leaves running projen again to the root project', () => {
    const project = new Project({ name: 'test-project' })
    const subproject = project.addSubproject({
      name: 'test-subproject',
      outdir: 'packages/test',
    })

    installProjen(project.outdir, '0.104.1')
    installProjen(subproject.outdir, '0.86.5')
    new ProjenInstall(subproject, '0.104.1')
    project.synth()

    expect(spawnSync).not.toHaveBeenCalled()
  })

  test('fails when running projen again fails', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 1,
    } as ReturnType<typeof spawnSync>)

    expect(() => synthesizeMovingProjen('0.86.5', '0.104.1')).toThrowError(
      'Synthesizing again with projen 0.104.1 failed.',
    )
  })

  test('fails instead of running projen a third time', () => {
    vi.stubEnv('PROJEN_PROJECT_RESYNTHESIZED', '0.104.1')

    expect(() => synthesizeMovingProjen('0.104.1', '0.105.0')).toThrowError(
      /moved projen from 0\.104\.1 to 0\.105\.0 again/,
    )
    expect(spawnSync).not.toHaveBeenCalled()
  })
})

test('with Terraform enabled', () => {
  const project = new Project({
    name: 'test-project',
    withTerraform: true,
  })

  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('with Terraform enabled, a consumer can opt back into terraform.tfvars', () => {
  const project = new Project({
    name: 'test-project',
    withTerraform: true,
    gitIgnoreOptions: {
      ignorePatterns: ['!terraform.tfvars'],
    },
  })

  const patterns = synthSnapshot(project)
    ['.gitignore'].split('\n')
    .map((pattern: string) => pattern.trim())

  // The consumer pattern is appended after the generated defaults, and later
  // `.gitignore` rules win, so `!terraform.tfvars` un-ignores it from `*.tfvars`.
  expect(patterns.indexOf('!terraform.tfvars')).toBeGreaterThan(
    patterns.indexOf('*.tfvars'),
  )
})

describe('with ty options', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      ty: {
        src: {
          include: ['packages'],
        },
        terminal: {
          'error-on-warning': true,
        },
      },
    })

    expect(synthSnapshot(project)['ty.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [src]
      include = [ "packages" ]

      [terminal]
      error-on-warning = true
      "
    `)
    expect(project.ty).toBeInstanceOf(Ty)
  })

  test('is a root project property', () => {
    const project = new Project({
      name: 'test-project',
    })

    const subproject = project.addSubproject({
      name: 'subproject',
      outdir: 'packages/subproject',
      ty: {},
    })

    expect(subproject.ty).toBeUndefined()
  })

  test('with uv, defaulting to the Python version uv pins', () => {
    const project = new Project({
      name: 'test-project',
      ty: {},
      uv: {
        pythonVersion: '3.14',
      },
    })

    expect(synthSnapshot(project)['ty.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [environment]
      python-version = "3.14"
      "
    `)
  })

  test('with uv pinning a patch release, taking its minor version', () => {
    const project = new Project({
      name: 'test-project',
      ty: {},
      uv: {
        pythonVersion: '3.14.3',
      },
    })

    expect(synthSnapshot(project)['ty.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [environment]
      python-version = "3.14"
      "
    `)
  })

  test('with uv naming an implementation, leaving the version to ty', () => {
    const project = new Project({
      name: 'test-project',
      ty: {},
      uv: {
        pythonVersion: 'pypy@3.11',
      },
    })

    expect(synthSnapshot(project)['ty.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      "
    `)
  })

  test('with uv, taking the Python version the project declares', () => {
    const project = new Project({
      name: 'test-project',
      ty: {
        environment: {
          'python-version': '3.13',
        },
      },
      uv: {
        pythonVersion: '3.14',
      },
    })

    expect(synthSnapshot(project)['ty.toml']).toMatchInlineSnapshot(`
      "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [environment]
      python-version = "3.13"
      "
    `)
  })
})

describe('with TypeScript options', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      typeScriptConfig: {},
    })

    project.typeScriptConfig?.addFile('foo.js', 'bar.js')

    expect(synthSnapshot(project)).toMatchSnapshot()
    expect(project.typeScriptConfig).toBeInstanceOf(TypeScriptConfig)
  })

  test('overrides `extends` with a single string', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      typeScriptConfig: {
        config: {
          extends: '@langri-sha/tsconfig/react',
        },
      },
    })

    expect(synthSnapshot(project)['tsconfig.json'].extends).toBe(
      '@langri-sha/tsconfig/react',
    )
  })

  test('overrides `extends` with an array of configurations', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      typeScriptConfig: {
        config: {
          extends: ['@langri-sha/tsconfig/project', './custom.json'],
        },
      },
    })

    expect(synthSnapshot(project)['tsconfig.json'].extends).toStrictEqual([
      '@langri-sha/tsconfig/project',
      './custom.json',
    ])
  })

  test('overrides `extends` with an array for subprojects', () => {
    const root = new Project({
      name: 'test-project',
      package: {},
      typeScriptConfig: {},
    })

    new Project({
      name: 'child',
      parent: root,
      outdir: 'child',
      package: {},
      typeScriptConfig: {
        config: {
          extends: ['@langri-sha/tsconfig/project', '../shared.json'],
        },
      },
    })

    expect(synthSnapshot(root)['child/tsconfig.json'].extends).toStrictEqual([
      '@langri-sha/tsconfig/project',
      '../shared.json',
    ])
  })

  test('with SWC', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      typeScriptConfig: {},
      swcrc: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
  })

  test('configures project references between subprojects', () => {
    const project = new Project({
      name: 'test-project',
      package: {},
      typeScriptConfig: {},
    })

    new Project({
      name: 'sub-project-a',
      parent: project,
      outdir: 'sub-project-a',
      package: {
        deps: ['sub-project-b@workspace:*'],
      },
      typeScriptConfig: {},
    })

    new Project({
      name: 'sub-project-b',
      outdir: 'sub-project-b',
      parent: project,
      package: {
        deps: ['sub-project-a@workspace:*'],
      },
      typeScriptConfig: {},
    })

    expect(synthSnapshot(project)).toMatchSnapshot()
  })
})

describe('with uv configuration', () => {
  test('defaults', () => {
    const project = new Project({
      name: 'test-project',
      uv: {},
    })

    const files = synthSnapshot(project)

    expect(uvFiles(files)).toMatchInlineSnapshot(`
      {
        "pyproject.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [tool.uv.workspace]
      members = []
      ",
      }
    `)
    expect(files['.gitignore']).toContain('.venv')
    expect(project.uv).toBeInstanceOf(UvWorkspace)
  })

  test('with packages in a virtual workspace', () => {
    const project = new Project({
      name: 'test-project',
      uv: {
        pythonVersion: '3.14',
        'dependency-groups': {
          dev: ['ty>=0.0.52'],
        },
        tool: {
          ty: {
            environment: {
              'python-version': '3.14',
            },
          },
        },
      },
    })

    const setuptools = {
      requires: ['setuptools>=61.0'],
      'build-backend': 'setuptools.build_meta',
    }

    project.addSubproject({
      name: 'lib',
      outdir: path.join('packages', 'lib'),
      uv: {
        project: {
          'requires-python': '>=3.14',
        },
        'build-system': setuptools,
      },
    })

    const subproject = project.addSubproject({
      name: 'app',
      outdir: path.join('apps', 'app'),
      uv: {
        project: {
          'requires-python': '>=3.14',
          dependencies: ['lib'],
        },
        tool: {
          uv: {
            sources: {
              lib: { workspace: true },
            },
          },
        },
        'build-system': setuptools,
      },
    })

    expect(uvFiles(synthSnapshot(project))).toMatchInlineSnapshot(`
      {
        ".python-version": "3.14
      ",
        "apps/app/pyproject.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [project]
      name = "app"
      version = "0.1.0"
      requires-python = ">=3.14"
      dependencies = [ "lib" ]

      [build-system]
      requires = [ "setuptools>=61.0" ]
      build-backend = "setuptools.build_meta"

      [tool.uv.sources.lib]
      workspace = true
      ",
        "apps/app/src/app/__init__.py": """"The app package."""
      ",
        "packages/lib/pyproject.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [project]
      name = "lib"
      version = "0.1.0"
      requires-python = ">=3.14"

      [build-system]
      requires = [ "setuptools>=61.0" ]
      build-backend = "setuptools.build_meta"
      ",
        "packages/lib/src/lib/__init__.py": """"The lib package."""
      ",
        "pyproject.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [dependency-groups]
      dev = [ "ty>=0.0.52" ]

      [tool.uv.workspace]
      members = [ "packages/lib", "apps/app" ]

      [tool.ty.environment]
      python-version = "3.14"
      ",
      }
    `)
    expect(subproject.uv).toBeInstanceOf(UvPackage)
  })

  test('with a package in a project named for npm', () => {
    const project = new Project({
      name: 'test-project',
      uv: {},
    })

    project.addSubproject({
      name: '@langri-sha/api',
      outdir: path.join('apps', 'api'),
      uv: {},
    })

    expect(uvFiles(synthSnapshot(project))).toMatchInlineSnapshot(`
      {
        "apps/api/pyproject.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [project]
      name = "api"
      version = "0.1.0"
      ",
        "apps/api/src/api/__init__.py": """"The api package."""
      ",
        "pyproject.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [tool.uv.workspace]
      members = [ "apps/api" ]
      ",
      }
    `)
  })

  test('with a package outside of a workspace', () => {
    const project = new Project({
      name: 'test-project',
    })

    const subproject = project.addSubproject({
      name: 'api',
      outdir: path.join('apps', 'api'),
      uv: {
        sampleCode: false,
      },
    })

    expect(uvFiles(synthSnapshot(project))).toMatchInlineSnapshot(`
      {
        "apps/api/pyproject.toml": "# ~~ Generated by projen. To modify, edit .projenrc.mts and run "pnpm exec projen".

      [project]
      name = "api"
      version = "0.1.0"
      ",
      }
    `)
    expect(subproject.uv).toBeInstanceOf(UvPackage)
  })
})

test('removes .gitattributes for subprojects', () => {
  const project = new Project({
    name: 'test-project',
    package: {},
    typeScriptConfig: {},
  })

  new Project({
    name: 'sub-project-a',
    parent: project,
    outdir: 'sub-project-a',
    typeScriptConfig: {},
  })

  expect(synthSnapshot(project)['sub-project-a/.gitattributes']).toBeUndefined()
})

/**
 * The files a Cargo component writes, out of everything a synthesis produces.
 *
 * A whole-project snapshot buries the five that matter under a hundred lines of
 * task, ignore and attribute boilerplate, which leaves a reader unable to see
 * what the test is about and re-writes every Cargo snapshot whenever Projen
 * changes a default task.
 */
const cargoFiles = (files: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.keys(files)
      .filter((file) =>
        /(^|\/)(Cargo\.toml|deny\.toml|rust-toolchain\.toml|rustfmt\.toml|main\.rs)$/.test(
          file,
        ),
      )
      .sort()
      .map((file) => [file, files[file]]),
  )

/**
 * The module manifests a Dagger component writes, out of everything a synthesis
 * produces, for the same reason `cargoFiles` exists.
 */
const daggerFiles = (files: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.keys(files)
      .filter((file) => /(^|\/)dagger(-module)?\.toml$/.test(file))
      .sort()
      .map((file) => [file, files[file]]),
  )

const uvFiles = (files: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.keys(files)
      .filter((file) =>
        /(^|\/)(pyproject\.toml|\.python-version|__init__\.py)$/.test(file),
      )
      .sort()
      .map((file) => [file, files[file]]),
  )
