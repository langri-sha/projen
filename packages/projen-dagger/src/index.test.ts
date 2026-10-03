import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import * as path from 'node:path'

import { describe, expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import { parse } from 'smol-toml'

import { Dagger, type DaggerOptions } from './index'

const synth = (options?: DaggerOptions) => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project, options)

  return synthSnapshot(project)
}

test('defaults', () => {
  expect(synth()).toMatchSnapshot()
})

test('with modules', () => {
  expect(
    synth({
      engineVersion: 'v1.0.0-beta.15',
      modules: {
        terraform: {},
        'terraform/e2e': {
          dependencies: ['..'],
        },
        projen: {
          name: 'ci',
          include: ['!node_modules'],
          dependencies: [
            '../terraform',
            {
              name: 'lint',
              source: 'github.com/langri-sha/dagger/eslint@eslint/v0.1.0',
              pin: 'abc',
            },
          ],
        },
      },
    }),
  ).toMatchSnapshot()
})

test('with a runtime other than Dang', () => {
  const files = synth({
    engineVersion: 'v1.0.0-beta.15',
    modules: {
      go: {
        runtime: 'go',
        source: 'src',
        codegen: { automaticGitignore: false },
        clients: [{ generator: 'go', directory: 'client' }],
        disableDefaultFunctionCaching: true,
      },
      typescript: {
        runtime: { source: 'github.com/dagger/typescript-sdk', pin: 'abc' },
      },
    },
  })

  expect(parse(files['go/dagger-module.toml'])).toEqual({
    name: 'go',
    engineVersion: 'v1.0.0-beta.15',
    source: 'src',
    disableDefaultFunctionCaching: true,
    runtime: { source: 'go' },
    codegen: { automaticGitignore: false },
    clients: [{ generator: 'go', directory: 'client' }],
  })
  expect(parse(files['typescript/dagger-module.toml']).runtime).toEqual({
    source: 'github.com/dagger/typescript-sdk',
    pin: 'abc',
  })
})

test('with a module added after construction', () => {
  const project = new Project({
    name: 'test-project',
  })

  const dagger = new Dagger(project, { engineVersion: 'v1.0.0-beta.15' })
  dagger.addModule('.dagger/modules/ci')

  expect(
    parse(synthSnapshot(project)['.dagger/modules/ci/dagger-module.toml']),
  ).toEqual({
    name: 'ci',
    engineVersion: 'v1.0.0-beta.15',
    runtime: { source: 'dang' },
  })
})

test('without an engine version', () => {
  const project = new Project({
    name: 'test-project',
  })

  const dagger = new Dagger(project)

  expect(() => dagger.addModule('terraform')).toThrow(/engineVersion/)
})

describe('workspace', () => {
  const workspace = {
    ignore: ['**/node_modules'],
    'check-generated': false,
    modules: {
      ci: {
        source: '.dagger/modules/ci',
        entrypoint: true,
      },
      terraform: {
        source: 'github.com/langri-sha/dagger/terraform@terraform/v0.1.0',
        settings: {
          rootModule: 'terraform/web',
          sources: ['terraform/**'],
        },
        check: { skip: ['fmt'] },
      },
      eslint: {
        source: 'dagger.io/js/eslint',
        settings: {
          packageManager: 'pnpm',
          service: 'dag://ci/serve',
        },
      },
    },
  } satisfies DaggerOptions['workspace']

  test('with a workspace', () => {
    expect(synth({ workspace })['dagger.toml']).toMatchSnapshot()
  })

  test('writes the workspace as given', () => {
    expect(parse(synth({ workspace })['dagger.toml'])).toEqual(workspace)
  })

  test('with an empty workspace', () => {
    expect(synth({ workspace: {} })['dagger.toml']).toBeDefined()
  })

  test('without a workspace', () => {
    expect(synth()['dagger.toml']).toBeUndefined()
  })
})

describe('ignore file', () => {
  const denyByDefault = (modules: DaggerOptions['modules']) => {
    const project = new Project({
      name: 'test-project',
      gitIgnoreOptions: {
        ignorePatterns: ['.*', '.dagger/secret.toml'],
      },
    })

    new Dagger(project, { engineVersion: 'v1.0.0-beta.15', modules })

    return project
  }

  const patterns = (project: Project): string[] =>
    synthSnapshot(project)['.gitignore'].split('\n')

  test('re-includes the dot-directory modules live in, once', () => {
    expect(
      patterns(
        denyByDefault({
          '.dagger/modules/ci': {},
          '.dagger/modules/terraform': {},
        }),
      ).filter((pattern) => pattern === '!/.dagger'),
    ).toHaveLength(1)
  })

  test('re-includes every dot-directory leading to a module', () => {
    expect(patterns(denyByDefault({ '.ci/nested/.dagger/ci': {} }))).toEqual(
      expect.arrayContaining(['!/.ci', '!/.ci/nested/.dagger']),
    )
  })

  test('keeps the patterns a project already has under the directory', () => {
    expect(patterns(denyByDefault({ '.dagger/modules/ci': {} }))).toContain(
      '.dagger/secret.toml',
    )
  })

  test('leaves the ignore file alone without dot-directories', () => {
    const topLevel = (project: Project) =>
      patterns(project).filter((pattern) => /^!\/\.[^/]+$/.test(pattern))

    expect(
      topLevel(denyByDefault({ terraform: {}, './terraform/e2e': {} })),
    ).toEqual(topLevel(denyByDefault({})))
  })

  describe('as git reads it', () => {
    const ignored = (project: Project, file: string) => {
      project.synth()

      mkdirSync(path.dirname(path.join(project.outdir, file)), {
        recursive: true,
      })

      if (!existsSync(path.join(project.outdir, file))) {
        writeFileSync(path.join(project.outdir, file), '')
      }

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

    test.each([
      '.dagger/modules/ci/dagger-module.toml',
      '.dagger/modules/ci/main.dang',
    ])('%s is tracked', (file) => {
      expect(ignored(denyByDefault({ '.dagger/modules/ci': {} }), file)).toBe(
        false,
      )
    })

    test.each(['.dagger/secret.toml', '.dagger/modules/ci/.env'])(
      '%s stays ignored',
      (file) => {
        expect(ignored(denyByDefault({ '.dagger/modules/ci': {} }), file)).toBe(
          true,
        )
      },
    )
  })
})
