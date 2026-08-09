import * as path from 'node:path'

import { Babel } from '@langri-sha/projen-babel'
import { Beachball } from '@langri-sha/projen-beachball'
import { CargoPackage, CargoWorkspace } from '@langri-sha/projen-cargo'
import { Codeowners } from '@langri-sha/projen-codeowners'
import { EditorConfig } from '@langri-sha/projen-editorconfig'
import { ESLint } from '@langri-sha/projen-eslint'
import { Husky } from '@langri-sha/projen-husky'
import { JestConfig } from '@langri-sha/projen-jest-config'
import { License } from '@langri-sha/projen-license'
import { LintStaged } from '@langri-sha/projen-lint-staged'
import { LintSynthesized } from '@langri-sha/projen-lint-synthesized'
import { PnpmWorkspace } from '@langri-sha/projen-pnpm-workspace'
import { Prettier } from '@langri-sha/projen-prettier'
import { ReadmeFile } from '@langri-sha/projen-readme'
import { Renovate } from '@langri-sha/projen-renovate'
import { SWCConfig } from '@langri-sha/projen-swcrc'
import { TypeScriptConfig } from '@langri-sha/projen-typescript-config'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from '@langri-sha/vitest'
import { Project as BaseProject, IgnoreFile, javascript } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import { valid } from 'semver'
import { vi } from 'vitest'

import { NodePackage, ProjenrcFile } from './lib'
import { GitAttributesFile } from './lib/gitattributes'

import { Project } from './index'

vi.mock('@langri-sha/projen-lint-synthesized', () => ({
  LintSynthesized: vi.fn(),
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

test('with EditorConfig options', () => {
  const project = new Project({
    name: 'test-project',
    editorConfig: {},
    prettier: {},
  })

  expect(synthSnapshot(project)).toMatchSnapshot()
  expect(project.editorConfig).toBeInstanceOf(EditorConfig)
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
      '@swc/core': false,
      esbuild: true,
      'unrs-resolver': false,
    })
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

test('with Renovate options, reading the crates a workspace declares', () => {
  const project = new Project({
    name: 'test-project',
    renovate: {},
  })

  expect(
    synthSnapshot(project)['renovate.json5'].customManagers.find(
      ({ datasourceTemplate }: { datasourceTemplate: string }) =>
        datasourceTemplate === 'crate',
    ),
  ).toMatchInlineSnapshot(`
    {
      "customType": "regex",
      "datasourceTemplate": "crate",
      "managerFilePatterns": [
        "/\\.?projen.*.(js|cjs|mjs|ts|mts|cts)$/",
      ],
      "matchStrings": [
        "(?<depType>dependencies|dev-dependencies|build-dependencies)'?:\\s*\\{(?:[^{}]|\\{[^{}]*\\})*\\}",
        "\\{(?:[^{}]|\\{[^{}]*\\})*\\}",
        "'?(?<depName>[\\w-]+)'?:\\s*(?:'[^']*'|\\{[^{}]*\\})",
        "^[^{]*(?:\\{[^{}]*?package:\\s*'(?<packageName>[^']+)')?[\\s\\S]*",
        "(?:^[^{]*|version:\\s*)'(?<currentValue>[^']+)'",
      ],
      "matchStringsStrategy": "recursive",
    }
  `)
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
  const synthesize = ({ devDeps, ...options }: Record<string, unknown>) =>
    synthSnapshot(
      new Project({
        name: 'test-project',
        renovate: {},
        ...options,
        package: { devDeps: devDeps as string[] | undefined },
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
    { tool: 'beachball', enabledBy: { beachball: {} } },
    { tool: 'husky', enabledBy: { husky: {} } },
    { tool: 'typescript', enabledBy: { typeScriptConfig: {} } },
    { tool: 'tsx', enabledBy: { typeScriptConfig: {} } },
    { tool: '@swc/core', enabledBy: { swcrc: {} } },
    { tool: '@swc-node/register', enabledBy: { swcrc: {} } },
    // Not a feature — every root project is given Projen itself.
    { tool: 'projen', enabledBy: {} },
  ]

  describe.each(TOOLS)('$tool', ({ tool, enabledBy }) => {
    const supplied = synthesize(enabledBy)
    const declared = synthesize({
      ...enabledBy,
      devDeps: [`${tool}@*`],
    })

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
  })

  test('a version that resolves rather than dictates stays upgradable', () => {
    // `@langri-sha/tsconfig` is supplied as `*`, which takes whatever is
    // installed and so already follows upgrades. Suppressing it would freeze
    // a dependency that was never stuck.
    const files = synthesize({ renovate: {}, typeScriptConfig: {} })

    expect(suppressedPackages(files)).not.toContain('@langri-sha/tsconfig')
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
    // A project with no features enabled is still given Projen and
    // `@langri-sha/projen-project`. Only the first is a literal version, so
    // only the first is withheld.
    const files = synthesize({})

    expect(suppressedPackages(files)).toEqual(['projen'])
  })
})

describe('declarations this preset cannot support', () => {
  const declaring =
    (devDeps: string[], options = {}) =>
    () =>
      new Project({ name: 'test-project', package: { devDeps }, ...options })

  test('are rejected, naming the version and the supported range', () => {
    expect(declaring(['projen@0.84.8'])).toThrowError(
      /declares projen@0\.84\.8.*does not support.*\^0\.86\.0/s,
    )
  })

  test('say how to resolve it', () => {
    expect(declaring(['projen@0.84.8'])).toThrowError(
      /Raise the declaration.*or remove it from `package\.devDeps`/s,
    )
  })

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
