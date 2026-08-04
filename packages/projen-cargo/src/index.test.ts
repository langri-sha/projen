import { expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import { CargoPackage, CargoWorkspace } from './index'

test('defaults', () => {
  const project = new Project({
    name: 'test-project',
  })

  new CargoWorkspace(project)

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('workspace', () => {
  const project = new Project({
    name: 'test-project',
  })

  new CargoWorkspace(project, {
    workspace: {
      resolver: '3',
      members: ['apps/api'],
      package: {
        edition: '2024',
        license: 'MIT',
        authors: ['Filip Dupanović <filip.dupanovic@gmail.com>'],
      },
      dependencies: {
        anyhow: '1.0.100',
        tokio: {
          version: '1.48.0',
          features: ['full'],
        },
      },
    },
    toolchain: {
      channel: '1.93.0',
      components: ['clippy', 'rustfmt'],
    },
    rustfmt: {
      group_imports: 'StdExternalCrate',
    },
    deny: {
      licenses: {
        allow: ['Apache-2.0', 'MIT'],
      },
    },
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('workspace root that is also a crate', () => {
  const project = new Project({
    name: 'test-project',
  })

  new CargoWorkspace(project, {
    workspace: {
      members: ['apps/api'],
    },
    package: {
      version: '0.1.0',
    },
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('adds members without repeating one already listed', () => {
  const project = new Project({
    name: 'test-project',
  })

  const workspace = new CargoWorkspace(project, {
    workspace: {
      members: ['apps/api'],
    },
  })

  workspace.addMember('apps/api', 'apps/worker')

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('package', () => {
  const project = new Project({
    name: 'test-project',
  })

  const project2 = new Project({
    name: 'api',
    parent: project,
    outdir: 'apps/api',
  })

  new CargoWorkspace(project, {
    workspace: {
      members: ['apps/api'],
      package: {
        edition: '2024',
      },
      dependencies: {
        tokio: {
          version: '1.48.0',
        },
      },
    },
  })

  new CargoPackage(project2, {
    package: {
      edition: {
        workspace: true,
      },
    },
    dependencies: {
      tokio: {
        workspace: true,
      },
    },
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('package without sample code', () => {
  const project = new Project({
    name: 'test-project',
  })

  new CargoPackage(project, {
    package: {
      name: 'test-crate',
      version: '0.1.0',
    },
    sampleCode: false,
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})
