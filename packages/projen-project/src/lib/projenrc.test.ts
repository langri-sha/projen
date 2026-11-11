import { describe, expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import { ProjenrcFile } from './projenrc'

test('defaults', () => {
  const project = new Project({
    name: 'test-project',
  })

  new ProjenrcFile(project, {})

  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('custom filename', () => {
  const project = new Project({
    name: 'test-project',
  })

  new ProjenrcFile(project, {
    filename: '.projerc.ts',
  })

  expect(synthSnapshot(project)).toMatchSnapshot()
})

test('commonjs package keeps its type in the sample', () => {
  const project = new Project({
    name: 'test-project',
  })

  new ProjenrcFile(project, {
    package: { type: 'commonjs' },
  })

  expect(synthSnapshot(project)['.projenrc.ts']).toContain(
    "package: { type: 'commonjs' }",
  )
})

describe('node package', () => {
  const synth = () => {
    const project = new Project({ name: 'test-project' })

    new ProjenrcFile(project, {
      filename: '.projenrc.ts',
      package: { type: 'module' },
      nodePackage: true,
    })

    return synthSnapshot(project)
  }

  test('runs the projenrc with node', () => {
    expect(synth()['.projen/tasks.json'].tasks.default.steps).toStrictEqual([
      { exec: 'node .projenrc.ts' },
    ])
  })

  test('keeps the flag in the sample instead of a package', () => {
    const sample = synth()['.projenrc.ts']

    expect(sample).toContain('nodePackage: true')
    expect(sample).not.toContain('package:')
  })

  test('runs tsx when asked to', () => {
    const project = new Project({ name: 'test-project' })
    const projenrc = new ProjenrcFile(project, {
      filename: '.projenrc.ts',
      package: { type: 'module' },
      nodePackage: true,
      tsx: true,
    })

    expect(projenrc.runner).toBe('tsx')
  })

  test('shares the runner of the parent with a subproject', () => {
    const root = new Project({ name: 'test-project' })
    const child = new Project({ name: 'child', parent: root, outdir: 'child' })

    new ProjenrcFile(root, {
      filename: '.projenrc.ts',
      package: { type: 'module' },
      nodePackage: true,
    })

    expect(new ProjenrcFile(child, { filename: '.projenrc.ts' }).runner).toBe(
      'node',
    )
  })

  test('runs a subproject with node when the parent has no projenrc', () => {
    const root = new Project({ name: 'test-project' })
    const child = new Project({ name: 'child', parent: root, outdir: 'child' })

    expect(new ProjenrcFile(child, { filename: '.projenrc.ts' }).runner).toBe(
      'node',
    )
  })
})
