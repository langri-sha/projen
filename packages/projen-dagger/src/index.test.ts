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
