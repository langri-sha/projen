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

    new ProjenrcFile(project, { filename: '.projenrc.ts', nodePackage: true })

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
})
