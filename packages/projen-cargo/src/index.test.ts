import { expect, test } from '@langri-sha/vitest'
import { Project, TomlFile } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import {
  CargoPackage,
  CargoWorkspace,
  type Dependency,
  type Rustfmt,
} from './index'

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

test('names the types its own options are written in', () => {
  const rustfmt: Rustfmt = { group_imports: 'StdExternalCrate' }
  const dependency: Dependency = { version: '1.48.0', features: ['full'] }

  const project = new Project({
    name: 'test-project',
  })

  const workspace = new CargoWorkspace(project, {
    rustfmt,
    workspace: {
      dependencies: { tokio: dependency },
    },
  })

  expect(workspace.rustfmt).toBeInstanceOf(TomlFile)
})

test('crate named for npm', () => {
  const workspace = new Project({ name: '@scope/rust-thing' })
  const crate = new Project({ name: '@scope/api' })

  new CargoWorkspace(workspace, { package: { version: '0.1.0' } })
  new CargoPackage(crate, {})

  // Cargo rejects both the `@` and the slash, so neither component may pass a
  // scope through to the manifest.
  expect(synthSnapshot(workspace)['Cargo.toml']).toContain(
    'name = "rust-thing"',
  )
  expect(synthSnapshot(crate)['Cargo.toml']).toContain('name = "api"')
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

test('offers nothing inheritable for a key held at undefined', () => {
  const project = new Project({
    name: 'test-project',
  })

  const publish = false

  const workspace = new CargoWorkspace(project, {
    workspace: {
      package: {
        edition: '2024',
        license: publish ? 'MIT' : undefined,
      },
    },
  })

  expect(workspace.inheritable).toEqual(['edition'])
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
