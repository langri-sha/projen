import { expect, test } from '@langri-sha/vitest'
import { IgnoreFile, Project } from 'projen'
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

test('with a prettierignore file on the project', () => {
  const project = new Project({
    name: 'test-project',
  })

  new IgnoreFile(project, '.prettierignore')

  new Dagger(project)

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('with custom prettierignore patterns', () => {
  const project = new Project({
    name: 'test-project',
  })

  new IgnoreFile(project, '.prettierignore')

  new Dagger(project, {
    prettierIgnorePatterns: ['*/sdk/'],
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
