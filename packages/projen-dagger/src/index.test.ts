import { expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import { Dagger } from './index'

test('defaults', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project)

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('with workflow disabled', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project, {
    workflow: false,
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('with custom workflow actions', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project, {
    workflow: {
      checkoutAction: 'actions/checkout@v4',
      pnpmSetupAction: 'pnpm/action-setup@v4',
    },
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('with custom gitignore patterns', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project, {
    gitignorePatterns: ['**/sdk/', '*.tsbuildinfo', 'custom/'],
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

/**
 * `owner/repo@ref`, optionally with a path to an action inside the repository.
 */
const ACTION_REFERENCE = /^[\w.-]+\/[\w.-]+(?:\/[\w.-]+)*@[\w][\w.-]*$/

const workflowActions = (project: Project) =>
  [
    ...(
      synthSnapshot(project)['.github/workflows/modules.yml'] as string
    ).matchAll(/^\s*uses: (?<reference>\S+)$/gm),
  ].map(({ groups }) => groups!.reference)

/**
 * Renovate read `langri-sha/github/actions/pnpm@v0.14.1` as a pnpm version and
 * walked it to `12.3.4`, which is not a tag of that repository. The snapshots
 * moved with it, so assert the references themselves.
 */
test('defaults to the action references it was released with', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project)

  expect(workflowActions(project)).toEqual([
    'actions/checkout@v7',
    'langri-sha/github/actions/pnpm@v0.14.1',
  ])
})

test('names every action by owner, repository and ref', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project, {
    workflow: {
      checkoutAction: 'actions/checkout@v4',
      pnpmSetupAction: 'pnpm/action-setup@v4',
    },
  })

  for (const reference of workflowActions(project)) {
    expect(reference).toMatch(ACTION_REFERENCE)
  }
})

test('with modules', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project, {
    engineVersion: 'v0.21.7',
    modules: {
      tailscale: {},
      paperclip: {
        dependencies: ['../tailscale'],
      },
      workspace: {
        name: 'hermes-workspace',
        dependencies: [
          '../tailscale',
          { name: 'store', source: '../tigerfs' },
          { source: 'github.com/langri-sha/dagger/hermes@v1.2.3', pin: 'abc' },
        ],
        include: ['!node_modules'],
        source: '.',
      },
    },
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('with a module that opts out of the SDK', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project, {
    engineVersion: 'v0.21.7',
    modules: {
      blueprinted: {
        sdk: false,
        blueprint: '../base',
        toolchains: [{ source: '../lint', ignoreChecks: ['fmt'] }],
        clients: [{ generator: 'typescript', directory: 'client' }],
        codegen: { automaticGitignore: false },
        disableDefaultFunctionCaching: true,
        schema: 'https://docs.dagger.io/reference/dagger.schema.json',
      },
    },
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('with a module added after construction', () => {
  const project = new Project({
    name: 'test-project',
  })

  const dagger = new Dagger(project, { engineVersion: 'v0.21.7' })
  dagger.addModule('tailscale')

  project.synth()
  expect(synthSnapshot(project)['tailscale/dagger.json']).toEqual({
    name: 'tailscale',
    engineVersion: 'v0.21.7',
    sdk: { source: 'typescript' },
  })
})

test('without an engine version', () => {
  const project = new Project({
    name: 'test-project',
  })

  const dagger = new Dagger(project)

  expect(() => dagger.addModule('tailscale')).toThrow(/engineVersion/)
})

test('writes fields in the order the Dagger CLI marshals them', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project, {
    engineVersion: 'v0.21.7',
    modules: {
      module: {
        schema: 'https://docs.dagger.io/reference/dagger.schema.json',
        blueprint: '../base',
        toolchains: ['../lint'],
        include: ['!node_modules'],
        dependencies: ['../tailscale'],
        source: 'sub',
        codegen: { automaticGitignore: true },
        clients: [{ generator: 'typescript', directory: 'client' }],
        disableDefaultFunctionCaching: true,
      },
    },
  })

  project.synth()
  expect(Object.keys(synthSnapshot(project)['module/dagger.json'])).toEqual([
    '$schema',
    'name',
    'engineVersion',
    'sdk',
    'blueprint',
    'toolchains',
    'include',
    'dependencies',
    'source',
    'codegen',
    'clients',
    'disableDefaultFunctionCaching',
  ])
})
