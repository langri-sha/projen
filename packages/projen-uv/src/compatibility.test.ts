import { expect, expectTypeOf, test } from '@langri-sha/vitest'

import type {
  ProjectCoreMetadata,
  PyProject,
  PyProjectOptions,
  PyProjectTool,
  Uv,
} from './index.js'

interface OriginalPyProjectOptions extends Omit<PyProject, 'project' | 'tool'> {
  readonly project?: Partial<NonNullable<PyProject['project']>>
  readonly tool?: PyProjectTool
}

test('named pyproject fields retain their original shape and mutability', () => {
  expectTypeOf<PyProjectOptions>().toEqualTypeOf<OriginalPyProjectOptions>()
  const options: PyProjectOptions = {
    project: { dynamic: ['version'] },
    tool: { uv: { workspace: { members: null } } },
    'dependency-groups': { lint: ['ruff'], dev: [{ 'include-group': 'lint' }] },
  }

  options['dependency-groups'] = { dev: ['ruff'] }
  options['build-system'] = { requires: ['setuptools'] }
  options['build-system'].requires.push('wheel')
  options.project!.name = 'renamed'

  expect(options['build-system'].requires).toEqual(['setuptools', 'wheel'])
  expect(options.tool!.uv!.workspace!.members).toBeNull()
})

test('raw schemas retain metadata, tuple and nullable value constraints', () => {
  expectTypeOf<{ name: string }>().not.toExtend<ProjectCoreMetadata>()
  expectTypeOf<{
    project: { 'import-namespaces': [] }
  }>().not.toExtend<PyProjectOptions>()
  expectTypeOf<{ workspace: { members: null } }>().toExtend<Uv>()
  expectTypeOf<{ workspace: { members: number[] } }>().not.toExtend<Uv>()
  expectTypeOf<{
    project: { dynamic: ['unknown'] }
  }>().not.toExtend<PyProjectOptions>()
})
