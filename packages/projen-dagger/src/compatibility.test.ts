import { expect, expectTypeOf, test } from '@langri-sha/vitest'

import type {
  ModuleCodegenConfig,
  ModuleConfigClient,
} from './dagger-module.js'
import type {
  DaggerWorkspaceDaggerToml,
  ModuleEntry,
  SDKScope,
} from './dagger-workspace.js'

import type {
  DaggerModuleClient,
  DaggerModuleCodegen,
  DaggerModuleConfig,
  DaggerModuleDependencyConfig,
  DaggerModuleOptions,
  DaggerModuleRuntime,
  DaggerOptions,
  DaggerWorkspaceConfig,
  SDK,
} from './index.js'

test('schema aliases and inherited module fields remain mutable', () => {
  const sdk: SDK = { source: 'dang' }
  sdk.source = 'typescript'
  const runtime: DaggerModuleRuntime = { source: 'dang' }
  const dependency: DaggerModuleDependencyConfig = { source: './one' }
  const codegen: DaggerModuleCodegen = { automaticGitignore: true }
  const client: DaggerModuleClient = {
    generator: 'typescript',
    directory: 'sdk',
  }
  const module: DaggerModuleConfig = {
    name: 'one',
    runtime,
    dependencies: [dependency],
    codegen,
    clients: [client],
  }
  const options: DaggerModuleOptions = {
    source: '.',
    include: [],
    codegen,
    clients: [client],
  }
  const workspace: DaggerWorkspaceConfig = {
    modules: { one: { source: './one', settings: { count: 1 } } },
    sdks: {
      typescript: { module: 'one', scopes: { '.': { clients: ['sdk'] } } },
    },
  }

  runtime.source = 'typescript'
  dependency.source = './two'
  codegen.automaticGitignore = false
  client.directory = 'generated'
  module.name = 'two'
  module.dependencies?.push({ source: './three' })
  options.source = 'src'
  options.include = ['**']
  options.codegen = { automaticGitignore: false }
  options.clients = []
  workspace.modules!.one!.source = './two'
  workspace.modules!.one!.settings!.count = 2
  workspace.sdks!.typescript!.scopes!['.']!.clients!.push('other')
  workspace.ignore = ['node_modules']

  expect(runtime.source).toBe('typescript')
  expect(module.dependencies).toHaveLength(2)
  expect(workspace.sdks!.typescript!.scopes!['.']!.clients).toEqual([
    'sdk',
    'other',
  ])
})

test('readonly dependency inputs remain accepted without widening options', () => {
  const dependencies = ['./one', { source: './two' }] as const
  const options: DaggerOptions = {
    engineVersion: 'v1.0.0',
    modules: { '.': { name: 'root', dependencies } },
  }

  expect(options.modules!['.']!.dependencies).toBe(dependencies)
  expectTypeOf<{
    modules: { '.': { dependencies: readonly number[] } }
  }>().not.toExtend<DaggerOptions>()
  expectTypeOf<{
    workspace: {
      ports: { http: { backendPort: string; backendService: string } }
    }
  }>().not.toExtend<DaggerOptions>()
})

test('raw generated schema types retain mutable properties', () => {
  const codegen: ModuleCodegenConfig = { automaticGitignore: true }
  const client: ModuleConfigClient = {
    generator: 'typescript',
    directory: 'sdk',
  }
  const entry: ModuleEntry = { source: './one' }
  const scope: SDKScope = { name: 'one' }
  const workspace: DaggerWorkspaceDaggerToml = {
    modules: { one: entry },
    sdks: { typescript: { module: 'one', scopes: { '.': scope } } },
  }

  codegen.automaticGitignore = false
  client.directory = 'generated'
  entry.source = './two'
  workspace.modules!.one!.source = './nested'
  workspace.sdks!.typescript!.scopes!['.']!.name = 'nested'
  scope.settings = { count: 1 }
  scope.settings.count = 2

  expect(codegen.automaticGitignore).toBe(false)
  expect(client.directory).toBe('generated')
  expect(entry.source).toBe('./nested')
  expect(scope.name).toBe('nested')
  expect(scope.settings.count).toBe(2)
})
