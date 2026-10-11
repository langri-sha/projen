import { expect, test } from '@langri-sha/vitest'
import { Project, YamlFile } from 'projen'
import { NodePackage, NodePackageManager } from 'projen/lib/javascript'
import * as javascript from 'projen/lib/javascript'
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

test('takes over a file registered earlier', () => {
  const project = new Project({
    name: 'test-project',
  })

  new YamlFile(project, 'pnpm-workspace.yaml', {
    obj: { packages: ['registered'] },
  })

  new PnpmWorkspace(project, { packages: ['packages/*'] })

  expect(synthSnapshot(project)['pnpm-workspace.yaml']).toMatchSnapshot()
})

test('leaves a file registered earlier when renamed', () => {
  const project = new Project({
    name: 'test-project',
  })

  new YamlFile(project, 'pnpm-workspace.yaml', {
    obj: { packages: ['registered'] },
  })

  new PnpmWorkspace(project, {
    filename: 'pnpm-workspace.yml',
    packages: ['packages/*'],
  })

  const files = synthSnapshot(project)

  expect(files['pnpm-workspace.yaml']).toContain('registered')
  expect(files['pnpm-workspace.yml']).toContain('packages/*')
})

test.skipIf(!('PnpmWorkspaceYaml' in javascript))(
  'takes over the file a pnpm package registers',
  () => {
    const project = new Project({
      name: 'test-project',
    })

    new NodePackage(project, { packageManager: NodePackageManager.PNPM })
    new PnpmWorkspace(project, { packages: ['packages/*'] })

    expect(synthSnapshot(project)['pnpm-workspace.yaml']).toMatchSnapshot()
  },
)
