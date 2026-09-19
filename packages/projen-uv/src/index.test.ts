import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, temporaryDirectory, test } from '@langri-sha/vitest'
import { ObjectFile, Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import { parse } from 'smol-toml'

import {
  type PEP735DependencyGroups,
  type Source,
  type Uv,
  UvPackage,
  UvWorkspace,
} from './index'

test('defaults', () => {
  const project = new Project({
    name: 'test-project',
  })

  new UvWorkspace(project)

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('workspace', () => {
  const project = new Project({
    name: 'test-project',
  })

  new UvWorkspace(project, {
    pythonVersion: '3.14',
    'dependency-groups': {
      lint: ['ruff>=0.15.10'],
      dev: ['ty>=0.0.52', { 'include-group': 'lint' }],
    },
    tool: {
      uv: {
        'required-version': '>=0.12',
        workspace: {
          members: ['packages/*'],
          exclude: ['packages/legacy'],
        },
      },
      ty: {
        environment: {
          'python-version': '3.14',
        },
      },
    },
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('names the types its own options are written in', () => {
  const groups: PEP735DependencyGroups = { dev: ['ty>=0.0.52'] }
  const source: Source = { workspace: true }
  const uv: Uv = { sources: { lib: source } }

  const project = new Project({
    name: 'test-project',
  })

  const workspace = new UvWorkspace(project, {
    'dependency-groups': groups,
    tool: { uv },
  })

  expect(workspace.manifest).toBeInstanceOf(ObjectFile)
})

test('mixes requirements and included groups in one dependency group', () => {
  const project = new Project({
    name: 'test-project',
  })

  new UvWorkspace(project, {
    'dependency-groups': {
      lint: ['ruff>=0.15.10'],
      dev: ['ty>=0.0.52', { 'include-group': 'lint' }],
    },
  })

  expect(
    parse(synthSnapshot(project)['pyproject.toml'])['dependency-groups'],
  ).toEqual({
    lint: ['ruff>=0.15.10'],
    dev: ['ty>=0.0.52', { 'include-group': 'lint' }],
  })
})

test('workspace root that is also a package', () => {
  const project = new Project({
    name: 'test-project',
  })

  new UvWorkspace(project, {
    project: {
      'requires-python': '>=3.14',
    },
    tool: {
      uv: {
        workspace: {
          members: ['packages/lib'],
        },
      },
    },
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('adds members without repeating one already listed', () => {
  const project = new Project({
    name: 'test-project',
  })

  const workspace = new UvWorkspace(project, {
    tool: {
      uv: {
        workspace: {
          members: ['packages/lib'],
        },
      },
    },
  })

  workspace.addMember('packages/lib', 'apps/app')

  expect(parse(synthSnapshot(project)['pyproject.toml'])).toEqual({
    tool: {
      uv: {
        workspace: {
          members: ['packages/lib', 'apps/app'],
        },
      },
    },
  })
})

test('package', () => {
  const project = new Project({
    name: 'test-project',
  })

  const project2 = new Project({
    name: 'app',
    parent: project,
    outdir: 'apps/app',
  })

  new UvWorkspace(project, {
    tool: {
      uv: {
        workspace: {
          members: ['apps/app'],
        },
      },
    },
  })

  new UvPackage(project2, {
    project: {
      'requires-python': '>=3.14',
      dependencies: ['lib'],
    },
    'build-system': {
      requires: ['uv_build>=0.12,<0.13'],
      'build-backend': 'uv_build',
    },
    tool: {
      uv: {
        sources: {
          lib: { workspace: true },
        },
      },
    },
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('package named for npm', () => {
  const project = new Project({ name: '@scope/hello.World' })

  new UvPackage(project)

  const files = synthSnapshot(project)

  expect(parse(files['pyproject.toml']).project).toEqual({
    name: 'hello.World',
    version: '0.1.0',
  })
  expect(files['src/hello_world/__init__.py']).toBe(
    '"""The hello.World package."""\n',
  )
})

test('package whose version is dynamic', () => {
  const project = new Project({
    name: 'test-project',
  })

  new UvPackage(project, {
    project: {
      dynamic: ['version'],
    },
  })

  expect(parse(synthSnapshot(project)['pyproject.toml']).project).toEqual({
    name: 'test-project',
    dynamic: ['version'],
  })
})

test('package without sample code', () => {
  const project = new Project({
    name: 'test-project',
  })

  new UvPackage(project, {
    project: {
      name: 'test-package',
      version: '1.2.3',
    },
    sampleCode: false,
  })

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('leaves a package that already has a manifest unscaffolded', () => {
  const outdir = temporaryDirectory()

  mkdirSync(join(outdir, 'app'))
  writeFileSync(join(outdir, 'app', '__init__.py'), 'VALUE = 42\n')
  writeFileSync(join(outdir, 'pyproject.toml'), '[project]\nname = "app"\n')

  const project = new Project({ name: 'app', outdir })

  new UvPackage(project)

  const files = synthSnapshot(project)

  expect(files['src/app/__init__.py']).toBeUndefined()
  expect(files['app/__init__.py']).toBe('VALUE = 42\n')
})

test('writes a virtual workspace the way one is written by hand', () => {
  const project = new Project({
    name: 'monorepo',
  })

  const lib = new Project({
    name: 'lib',
    parent: project,
    outdir: 'packages/lib',
  })

  const app = new Project({
    name: 'app',
    parent: project,
    outdir: 'apps/app',
  })

  const workspace = new UvWorkspace(project, {
    'dependency-groups': {
      dev: ['ty>=0.0.52'],
    },
    tool: {
      ty: {
        environment: {
          'python-version': '3.14',
        },
        terminal: {
          'error-on-warning': true,
        },
      },
    },
  })

  const setuptools = {
    requires: ['setuptools>=61.0'],
    'build-backend': 'setuptools.build_meta',
  }

  new UvPackage(lib, {
    project: {
      description: 'Shared text utilities',
      'requires-python': '>=3.14',
      dependencies: ['httpx'],
    },
    'build-system': setuptools,
  })

  new UvPackage(app, {
    project: {
      description: 'A command-line application',
      'requires-python': '>=3.14',
      dependencies: ['lib', 'httpx'],
    },
    tool: {
      uv: {
        sources: {
          lib: { workspace: true },
        },
      },
    },
    'build-system': setuptools,
  })

  workspace.addMember('packages/lib', 'apps/app')

  const files = synthSnapshot(project)

  expect(parse(files['pyproject.toml'])).toEqual(
    parse(`
[tool.uv.workspace]
members = [
    "packages/lib",
    "apps/app",
]

[tool.ty.environment]
python-version = "3.14"

[tool.ty.terminal]
error-on-warning = true

[dependency-groups]
dev = [
    "ty>=0.0.52",
]
`),
  )

  expect(parse(files['packages/lib/pyproject.toml'])).toEqual(
    parse(`
[project]
name = "lib"
version = "0.1.0"
description = "Shared text utilities"
requires-python = ">=3.14"
dependencies = [
    "httpx",
]

[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"
`),
  )

  expect(parse(files['apps/app/pyproject.toml'])).toEqual(
    parse(`
[project]
name = "app"
version = "0.1.0"
description = "A command-line application"
requires-python = ">=3.14"
dependencies = [
    "lib",
    "httpx",
]

[tool.uv.sources]
lib = { workspace = true }

[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"
`),
  )
})
