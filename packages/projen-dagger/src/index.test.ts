import { expect, test } from '@langri-sha/vitest'
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
