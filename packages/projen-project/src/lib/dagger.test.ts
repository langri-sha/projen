import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, describe, expect, test } from '@langri-sha/vitest'

import {
  DAGGER_MODULES,
  assertDaggerWorkspaceIsGenerated,
  deriveDaggerWorkspace,
  hasGitHubWorkflows,
  mergeDaggerWorkspace,
} from './dagger'

test('derives the modules every project gets', () => {
  expect(deriveDaggerWorkspace({})).toEqual({
    ignore: ['**/node_modules', '**/dist', '**/*.tsbuildinfo'],
    modules: {
      ci: { source: DAGGER_MODULES.ci, generate: { skip: ['projen'] } },
      projen: { source: DAGGER_MODULES.projen },
    },
  })
})

test('derives a module for each enabled feature, in a fixed order', () => {
  const workspace = deriveDaggerWorkspace({
    beachball: true,
    eslint: true,
    prettier: true,
    typescript: true,
    vitest: true,
    actionlint: true,
  })

  expect(Object.keys(workspace.modules ?? {})).toEqual([
    'eslint',
    'prettier',
    'ci',
    'projen',
    'typescript',
    'vitest',
    'beachball',
    'actionlint',
  ])
})

test('derives changesets instead of beachball', () => {
  const workspace = deriveDaggerWorkspace({ changesets: true })

  expect(Object.keys(workspace.modules ?? {})).toEqual([
    'ci',
    'projen',
    'changesets',
  ])
})

test('runs eslint and prettier with pnpm on a slim Node.js image', () => {
  const { modules } = deriveDaggerWorkspace({ eslint: true, prettier: true })

  expect(modules?.eslint).toEqual({
    source: 'dagger.io/js/eslint',
    settings: { packageManager: 'pnpm', baseImageAddress: 'node:24-slim' },
  })
  expect(modules?.prettier?.settings).toEqual(modules?.eslint?.settings)
})

test('pins every langri-sha module to a release tag', () => {
  for (const ref of Object.values(DAGGER_MODULES)) {
    expect(ref).toMatch(/^github\.com\/langri-sha\/dagger\/\w+@v\d+\.\d+\.\d+$/)
  }
})

describe('merging overrides', () => {
  const derived = deriveDaggerWorkspace({ eslint: true, typescript: true })

  test('leaves the derived workspace as it is without overrides', () => {
    expect(mergeDaggerWorkspace(derived)).toEqual(derived)
  })

  test('merges settings into a derived module', () => {
    const { modules } = mergeDaggerWorkspace(derived, {
      modules: { eslint: { settings: { installFlags: ['--ignore-scripts'] } } },
    })

    expect(modules?.eslint).toEqual({
      source: 'dagger.io/js/eslint',
      settings: {
        packageManager: 'pnpm',
        baseImageAddress: 'node:24-slim',
        installFlags: ['--ignore-scripts'],
      },
    })
  })

  test('replaces an array in a derived module', () => {
    const { modules } = mergeDaggerWorkspace(derived, {
      modules: { ci: { generate: { skip: ['lock'] } } },
    })

    expect(modules?.ci?.generate).toEqual({ skip: ['lock'] })
  })

  test('replaces the source of a derived module and keeps its settings', () => {
    const { modules } = mergeDaggerWorkspace(derived, {
      modules: { eslint: { source: 'github.com/dagger/eslint@v0.3.0' } },
    })

    expect(modules?.eslint).toEqual({
      source: 'github.com/dagger/eslint@v0.3.0',
      settings: { packageManager: 'pnpm', baseImageAddress: 'node:24-slim' },
    })
  })

  test('drops a module set to null', () => {
    const { modules } = mergeDaggerWorkspace(derived, {
      modules: { eslint: null, projen: null },
    })

    expect(Object.keys(modules ?? {})).toEqual(['ci', 'typescript'])
  })

  test('appends modules the derived set lacks, in the order given', () => {
    const { modules } = mergeDaggerWorkspace(derived, {
      modules: {
        zig: { source: 'zig' },
        ci: { source: 'ci' },
        next: { source: 'next' },
      },
    })

    expect(Object.keys(modules ?? {})).toEqual([
      'eslint',
      'ci',
      'projen',
      'typescript',
      'zig',
      'next',
    ])
  })

  test('adds ignore patterns after the derived ones without repeating them', () => {
    const { ignore } = mergeDaggerWorkspace(derived, {
      ignore: ['**/target', '**/dist'],
    })

    expect(ignore).toEqual([
      '**/node_modules',
      '**/dist',
      '**/*.tsbuildinfo',
      '**/target',
    ])
  })

  test('adds settings the derived workspace has none of', () => {
    const sdks = { typescript: { module: 'dagger-typescript-sdk' } }

    expect(mergeDaggerWorkspace(derived, { sdks }).sdks).toEqual(sdks)
  })

  test('throws for a module added without a source', () => {
    expect(() =>
      mergeDaggerWorkspace(derived, {
        modules: { terraform: { settings: { rootModule: 'terraform' } } },
      }),
    ).toThrow('The Dagger module "terraform" has no source')
  })

  test('keeps the source of a derived module that the override leaves out', () => {
    const { modules } = mergeDaggerWorkspace(derived, {
      modules: { ci: { settings: {} } },
    })

    expect(modules?.ci?.source).toBe(DAGGER_MODULES.ci)
  })

  test('does not change the derived workspace', () => {
    const before = structuredClone(derived)

    mergeDaggerWorkspace(derived, {
      ignore: ['**/target'],
      modules: { eslint: { settings: { installFlags: [] } }, ci: null },
    })

    expect(derived).toEqual(before)
  })
})

describe('GitHub workflows', () => {
  const directories: string[] = []

  afterEach(() => {
    for (const directory of directories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  const projectWith = (...files: string[]) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dagger-'))

    directories.push(directory)

    for (const file of files) {
      fs.mkdirSync(path.join(directory, path.dirname(file)), {
        recursive: true,
      })
      fs.writeFileSync(path.join(directory, file), '')
    }

    return directory
  }

  test.each(['check.yml', 'check.yaml'])('are found in %s', (workflow) => {
    expect(
      hasGitHubWorkflows(projectWith(`.github/workflows/${workflow}`)),
    ).toBe(true)
  })

  test('are not found in a project without a workflows directory', () => {
    expect(hasGitHubWorkflows(projectWith('readme.md'))).toBe(false)
  })

  test('are not found among files that are not workflows', () => {
    expect(hasGitHubWorkflows(projectWith('.github/workflows/readme.md'))).toBe(
      false,
    )
  })
})

describe('a dagger.toml on disk', () => {
  const directories: string[] = []

  afterEach(() => {
    for (const directory of directories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })

  const projectWith = (files: Record<string, string>) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dagger-'))

    directories.push(directory)

    for (const [file, contents] of Object.entries(files)) {
      fs.mkdirSync(path.join(directory, path.dirname(file)), {
        recursive: true,
      })
      fs.writeFileSync(path.join(directory, file), contents)
    }

    return directory
  }

  const generated = (...files: string[]) =>
    JSON.stringify({ files, '//': 'Written by projen' })

  test('is refused when projen does not list it', () => {
    const directory = projectWith({
      'dagger.toml': '[modules.ci]\nsource = "ci"\n',
      '.projen/files.json': generated('.gitignore'),
    })

    expect(() => assertDaggerWorkspaceIsGenerated(directory)).toThrow(
      'dagger.workspace',
    )
  })

  test('is refused in a project projen has not synthesized', () => {
    const directory = projectWith({ 'dagger.toml': '' })

    expect(() => assertDaggerWorkspaceIsGenerated(directory)).toThrow(
      'Refusing to overwrite dagger.toml',
    )
  })

  test('is refused when the record of generated files is not readable', () => {
    const directory = projectWith({
      'dagger.toml': '',
      '.projen/files.json': '{',
    })

    expect(() => assertDaggerWorkspaceIsGenerated(directory)).toThrow(
      'Refusing to overwrite dagger.toml',
    )
  })

  test('is kept when projen lists it', () => {
    const directory = projectWith({
      'dagger.toml': '',
      '.projen/files.json': generated('dagger.toml'),
    })

    expect(() => assertDaggerWorkspaceIsGenerated(directory)).not.toThrow()
  })

  test('is not needed for a project that has none', () => {
    expect(() =>
      assertDaggerWorkspaceIsGenerated(projectWith({ 'readme.md': '' })),
    ).not.toThrow()
  })
})
