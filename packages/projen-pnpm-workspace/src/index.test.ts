import { expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { NodePackage } from 'projen/lib/javascript'
import { synthSnapshot } from 'projen/lib/util/synth'

import { PnpmWorkspace } from './index'

test('defaults', () => {
  const project = new Project({
    name: 'test-project',
  })

  new PnpmWorkspace(project)

  expect(synthSnapshot(project)['pnpm-workspace.yaml']).toMatchSnapshot()
})

test('with filename', () => {
  const project = new Project({
    name: 'test-project',
  })

  new PnpmWorkspace(project, { filename: 'pnpm-workspace.yml' })

  expect(synthSnapshot(project)['pnpm-workspace.yml']).toMatchSnapshot()
})

test('with packages', () => {
  const project = new Project({
    name: 'test-project',
  })

  new PnpmWorkspace(project, {
    packages: ['apple', 'banana'],
  })

  expect(synthSnapshot(project)['pnpm-workspace.yaml']).toMatchSnapshot()
})

test('sorts packages', () => {
  const project = new Project({
    name: 'test-project',
  })

  new PnpmWorkspace(project, {
    packages: ['b', 'a'],
  })

  expect(synthSnapshot(project)['pnpm-workspace.yaml']).toMatchSnapshot()
})

test('dedupes packages', () => {
  const project = new Project({
    name: 'test-project',
  })

  new PnpmWorkspace(project, {
    packages: ['a', 'a'],
  })

  expect(synthSnapshot(project)['pnpm-workspace.yaml']).toMatchSnapshot()
})

test('with settings besides packages', () => {
  const project = new Project({
    name: 'test-project',
  })

  new PnpmWorkspace(project, {
    packages: ['packages/*'],
    minimumReleaseAge: 4320,
    minimumReleaseAgeExclude: ['@langri-sha/*'],
    onlyBuiltDependencies: ['esbuild'],
  })

  expect(synthSnapshot(project)['pnpm-workspace.yaml']).toMatchSnapshot()
})

test('with settings and no packages', () => {
  const project = new Project({
    name: 'test-project',
  })

  new PnpmWorkspace(project, {
    minimumReleaseAgeExclude: ['@langri-sha/*'],
  })

  expect(synthSnapshot(project)['pnpm-workspace.yaml']).toMatchSnapshot()
})

test('keeps settings when packages come from subprojects', () => {
  const project = new Project({
    name: 'test-project',
  })

  new PnpmWorkspace(project, {
    minimumReleaseAgeExclude: ['@langri-sha/*'],
  })

  const subproject = new Project({
    name: 'subproject',
    outdir: 'packages/subproject',
    parent: project,
  })

  new NodePackage(subproject)

  expect(synthSnapshot(project)['pnpm-workspace.yaml']).toMatchSnapshot()
})

test('does not emit filename as a setting', () => {
  const project = new Project({
    name: 'test-project',
  })

  new PnpmWorkspace(project, {
    filename: 'pnpm-workspace.yml',
    minimumReleaseAgeExclude: ['@langri-sha/*'],
  })

  expect(synthSnapshot(project)['pnpm-workspace.yml']).not.toContain('filename')
})

test('adds packages from subproject NodePackages', () => {
  const project = new Project({
    name: 'test-project',
  })

  new PnpmWorkspace(project)

  const subprojectA = new Project({
    name: 'subproject-a',
    outdir: 'subprojects/subproject-a',
    parent: project,
  })

  const subprojectB = new Project({
    name: 'subproject-b',
    outdir: 'subprojects/subproject-b',
    parent: project,
  })

  const subsubproject = new Project({
    name: 'subproject-b-subproject',
    outdir: 'subprojects/subproject-b/subproject',
    parent: project,
  })

  const standalone = new Project({
    name: 'standalone',
    outdir: 'some/where/standalone',
    parent: project,
  })

  new NodePackage(project)
  new NodePackage(subprojectA)
  new NodePackage(subprojectB)
  new NodePackage(subsubproject)
  new NodePackage(standalone)

  expect(synthSnapshot(project)['pnpm-workspace.yaml']).toMatchSnapshot()
})
