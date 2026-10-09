import { describe, expect, test } from '@langri-sha/vitest'
import { Project, javascript } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import { Skills, type SkillsOptions } from './index'

const SHA = '0b8fb22aaa7f82447d4befe1b6a95d30a5b279b8'

const synth = (options: SkillsOptions) => {
  const project = new Project({ name: 'test-project' })

  new javascript.NodePackage(project, { packageName: 'test-project' })
  new Skills(project, options)

  return synthSnapshot(project)
}

describe('package.json', () => {
  test('declares the skills field', () => {
    const snapshot = synth({
      skills: [
        { source: 'vercel-labs/skills', ref: SHA, skills: ['find-skills'] },
        { source: 'npm:@scope/pkg', skills: ['one'] },
      ],
    })

    expect(snapshot['package.json'].skills).toEqual([
      { source: 'vercel-labs/skills', ref: SHA, skills: ['find-skills'] },
      { source: 'npm:@scope/pkg', skills: ['one'] },
    ])
  })

  test('is the only file the component adds', () => {
    const base = synthSnapshot(
      (() => {
        const project = new Project({ name: 'test-project' })

        new javascript.NodePackage(project, { packageName: 'test-project' })

        return project
      })(),
    )
    const snapshot = synth({
      skills: [{ source: 'owner/repo', ref: SHA, skills: ['a'] }],
    })

    expect(Object.keys(snapshot).sort()).toEqual(Object.keys(base).sort())
  })
})

test('needs a package.json', () => {
  const project = new Project({ name: 'test-project' })

  expect(
    () =>
      new Skills(project, {
        skills: [{ source: 'owner/repo', ref: SHA, skills: ['a'] }],
      }),
  ).toThrow(/package.json/)
})

test('rejects a skill without a pinned ref', () => {
  expect(() =>
    synth({ skills: [{ source: 'owner/repo', skills: ['a'] }] }),
  ).toThrow(/40-character commit SHA/)
})

describe('.gitignore', () => {
  const skills = [
    { source: 'owner/repo', ref: SHA, skills: ['a', 'b'] },
    { source: 'npm:pkg', skills: ['c'] },
  ]

  test('ignores the declared skills for Claude Code by default', () => {
    expect(synth({ skills })['.gitignore']).toMatch(
      [
        '/.agents/skills/a/',
        '/.agents/skills/b/',
        '/.agents/skills/c/',
        '/.claude/skills/a',
        '/.claude/skills/b',
        '/.claude/skills/c',
      ].join('\n'),
    )
  })

  test('ignores nothing but the declared skills', () => {
    const lines = synth({ skills })['.gitignore'].split('\n')

    expect(lines).not.toContain('/.agents/skills/')
    expect(lines).not.toContain('/.claude/skills/')
    expect(lines).not.toContain('skills-lock.json')
  })

  test('leaves the shared folder alone for agents that read it', () => {
    const content = synth({ skills, agents: ['cursor', 'windsurf'] })[
      '.gitignore'
    ]

    expect(content).toContain('/.windsurf/skills/a\n')
    expect(content).not.toContain('/.claude/skills/')
    expect(content.match(/\/\.agents\/skills\/a\//g)).toHaveLength(1)
  })
})
