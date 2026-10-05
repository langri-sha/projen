import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, describe, expect, test, vi } from '@langri-sha/vitest'
import { Project, SampleFile, TextFile } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import {
  GitHubTemplates,
  type GitHubTemplatesOptions,
  IssueForm,
  IssueTemplate,
  IssueTemplateChooser,
  PullRequestTemplate,
} from './index'

const form = {
  name: 'Bug report',
  description: 'Something is broken.',
  body: [{ type: 'input' as const, attributes: { label: 'Version' } }],
}

const markdown = {
  name: 'Proposal',
  about: 'Suggest a change.',
  body: '## Problem\n',
}

const checklist = { body: '## Checklist\n' }

const create = (options?: GitHubTemplatesOptions) => {
  const project = new Project({ name: 'test-project' })

  return { project, templates: new GitHubTemplates(project, options) }
}

describe('files', () => {
  test('selects the component from the path', () => {
    const { templates } = create({
      files: {
        '.github/ISSUE_TEMPLATE/config.yml': { blankIssuesEnabled: false },
        '.github/ISSUE_TEMPLATE/bug.yml': form,
        '.github/ISSUE_TEMPLATE/proposal.md': markdown,
        '.github/pull_request_template.md': checklist,
        'docs/PULL_REQUEST_TEMPLATE/release.md': checklist,
      },
    })

    expect(
      Object.fromEntries(
        Object.entries(templates.files).map(([filePath, template]) => [
          filePath,
          template.constructor,
        ]),
      ),
    ).toEqual({
      '.github/ISSUE_TEMPLATE/config.yml': IssueTemplateChooser,
      '.github/ISSUE_TEMPLATE/bug.yml': IssueForm,
      '.github/ISSUE_TEMPLATE/proposal.md': IssueTemplate,
      '.github/pull_request_template.md': PullRequestTemplate,
      'docs/PULL_REQUEST_TEMPLATE/release.md': PullRequestTemplate,
    })
  })

  test('writes nothing by default', () => {
    const project = new Project({ name: 'test-project' })

    new GitHubTemplates(project)

    expect(
      Object.keys(synthSnapshot(project)).filter(
        (filePath) =>
          !filePath.startsWith('.projen/') && !filePath.startsWith('.git'),
      ),
    ).toEqual([])
  })

  test('checks the value against the kind its path selects', () => {
    expect(() =>
      create({ files: { '.github/ISSUE_TEMPLATE/bug.yml': checklist } }),
    ).toThrow('.github/ISSUE_TEMPLATE/bug.yml: `name` is required.')
  })

  test('rejects an unknown option', () => {
    expect(() => create({ templates: {} } as GitHubTemplatesOptions)).toThrow(
      '`templates` is not an option. Use `files`, `unmanaged`.',
    )
  })

  test('reports every bad path at once', () => {
    expect(() =>
      create({
        files: {
          '.github/ISSUE_TEMPLATE/bug.yaml': form,
          '.github/workflows/ci.yml': form,
        },
        unmanaged: ['../SECURITY.md'],
      }),
    ).toThrow(
      /bug\.yaml: issue forms.*\n.*ci\.yml: not a template location.*\n.*SECURITY\.md: empty/,
    )
  })

  test('rejects paths that collide', () => {
    expect(() =>
      create({
        files: {
          '.github/ISSUE_TEMPLATE/Bug.yml': form,
          '.github/ISSUE_TEMPLATE/bug.yml': { ...form, name: 'Another bug' },
        },
      }),
    ).toThrow('are the same file to GitHub')
  })

  test('rejects a second default pull request template, even unmanaged', () => {
    expect(() =>
      create({
        files: { '.github/pull_request_template.md': checklist },
        unmanaged: ['docs/pull_request_template.md'],
      }),
    ).toThrow('are both default pull request templates')
  })

  test.each([
    '.github/ISSUE_TEMPLATE/security.md',
    '.github/ISSUE_TEMPLATE/Security.md',
  ])('rejects a template declared at the unmanaged %s', (unmanaged) => {
    expect(() =>
      create({
        files: { '.github/ISSUE_TEMPLATE/security.md': markdown },
        unmanaged: [unmanaged],
      }),
    ).toThrow(
      `.github/ISSUE_TEMPLATE/security.md: declared in \`files\` while \`unmanaged\` lists \`${unmanaged}\`. Remove it from one.`,
    )
  })
})

describe('names', () => {
  test('must be unique across forms and Markdown templates', () => {
    const { project } = create({
      files: {
        '.github/ISSUE_TEMPLATE/bug.yml': form,
        '.github/ISSUE_TEMPLATE/bug.md': { ...markdown, name: 'Bug report' },
      },
    })

    expect(() => synthSnapshot(project)).toThrow(
      '.github/ISSUE_TEMPLATE/bug.md: `name` Bug report is already used by `.github/ISSUE_TEMPLATE/bug.yml`.',
    )
  })

  test('are read after overrides', () => {
    const { project, templates } = create({
      files: {
        '.github/ISSUE_TEMPLATE/bug.yml': form,
        '.github/ISSUE_TEMPLATE/crash.yml': { ...form, name: 'Crash report' },
      },
    })

    ;(
      templates.files['.github/ISSUE_TEMPLATE/crash.yml'] as IssueForm
    ).addOverride('name', 'Bug report')

    expect(() => synthSnapshot(project)).toThrow(
      '.github/ISSUE_TEMPLATE/crash.yml: `name` Bug report is already used by `.github/ISSUE_TEMPLATE/bug.yml`.',
    )
  })
})

describe('foreign files', () => {
  test('rejects a seed another component generates', () => {
    const { project } = create({
      files: {
        '.github/pull_request_template.md': { ...checklist, managed: false },
      },
    })

    new TextFile(project, '.github/pull_request_template.md', { lines: ['x'] })

    expect(() => synthSnapshot(project)).toThrow(
      '.github/pull_request_template.md: seeded with `managed: false`, but TextFile also generates it. Keep one.',
    )
  })

  test('rejects an unmanaged path another component generates', () => {
    const { project } = create({
      unmanaged: ['.github/ISSUE_TEMPLATE/security.md'],
    })

    new TextFile(project, '.github/ISSUE_TEMPLATE/security.md', {
      lines: ['x'],
    })

    expect(() => synthSnapshot(project)).toThrow(
      '.github/ISSUE_TEMPLATE/security.md: listed in `unmanaged`, but TextFile generates it.',
    )
  })

  test('ignores another seed', () => {
    const { project } = create({
      unmanaged: ['.github/ISSUE_TEMPLATE/security.md'],
    })

    new SampleFile(project, 'docs/notes.md', { contents: 'x' })

    expect(() => synthSnapshot(project)).not.toThrow()
  })
})

describe('ownership', () => {
  const directories: string[] = []

  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { force: true, recursive: true })
    }
  })

  const workspace = () => {
    const outdir = mkdtempSync(
      path.join(os.tmpdir(), 'projen-github-templates-'),
    )

    directories.push(outdir)

    const file = (filePath: string) => path.join(outdir, filePath)

    return {
      synth: (options: GitHubTemplatesOptions) => {
        const project = new Project({ name: 'test-project', outdir })

        new GitHubTemplates(project, options)
        project.synth()
      },
      read: (filePath: string) => readFileSync(file(filePath), 'utf8'),
      edit: (filePath: string, content: string) => {
        chmodSync(file(filePath), 0o644)
        writeFileSync(file(filePath), content)
      },
      move: (from: string, to: string) => renameSync(file(from), file(to)),
      exists: (filePath: string) => existsSync(file(filePath)),
      write: (filePath: string, content: string) => {
        mkdirSync(path.dirname(file(filePath)), { recursive: true })
        writeFileSync(file(filePath), content)
      },
    }
  }

  const issue = '.github/ISSUE_TEMPLATE/proposal.md'
  const pull = '.github/pull_request_template.md'

  test('restores an edited managed file', () => {
    const { synth, read, edit } = workspace()

    synth({ files: { [issue]: markdown } })
    edit(issue, 'edited\n')
    synth({ files: { [issue]: markdown } })

    expect(read(issue)).toContain('## Problem')
  })

  test.each([
    ['an issue template', issue, markdown],
    ['a pull request template', pull, checklist],
  ])('refuses to seed %s projen generated', (_, filePath, value) => {
    const { synth, read, edit } = workspace()

    synth({ files: { [filePath]: value } })
    edit(filePath, 'edited\n')

    expect(() =>
      synth({ files: { [filePath]: { ...value, managed: false } } }),
    ).toThrow(
      `${filePath}: projen generated this file, and it is now seeded with \`managed: false\`. projen's cleanup would delete it, edits and all. Move it aside, run projen, then move it back.`,
    )
    expect(read(filePath)).toBe('edited\n')
  })

  test('refuses to leave a generated file unmanaged', () => {
    const { synth, read, edit } = workspace()

    synth({ files: { [pull]: checklist } })
    edit(pull, 'edited\n')

    expect(() => synth({ unmanaged: [pull] })).toThrow(
      `${pull}: projen generated this file, and it is now listed in \`unmanaged\`.`,
    )
    expect(read(pull)).toBe('edited\n')
  })

  test('hands a file over once it is moved aside', () => {
    const { synth, read, edit, move } = workspace()

    synth({ files: { [issue]: markdown } })
    edit(issue, 'edited\n')
    move(issue, `${issue}.bak`)
    synth({ files: { [issue]: { ...markdown, managed: false } } })
    move(`${issue}.bak`, issue)
    synth({ files: { [issue]: { ...markdown, managed: false } } })

    expect(read(issue)).toBe('edited\n')
  })

  test('seeds a file projen never generated', () => {
    const { synth, read, write } = workspace()

    write(pull, 'hand-written\n')
    synth({ files: { [pull]: { ...checklist, managed: false } } })

    expect(read(pull)).toBe('hand-written\n')
  })

  test('deletes a template dropped from files', () => {
    const { synth, exists } = workspace()

    synth({ files: { [issue]: markdown } })
    synth({})

    expect(exists(issue)).toBe(false)
  })

  test('warns about a retired ISSUE_TEMPLATE.md', () => {
    const { write } = workspace()
    const outdir = directories.at(-1)!

    write('.github/ISSUE_TEMPLATE.md', 'legacy\n')

    const project = new Project({ name: 'test-project', outdir })
    const warn = vi.spyOn(project.logger, 'warn')

    new GitHubTemplates(project)
    project.synth()

    expect(warn).toHaveBeenCalledWith(
      '.github/ISSUE_TEMPLATE.md: GitHub retired the single ISSUE_TEMPLATE.md on 2025-03-30 and ignores it. Move it to `.github/ISSUE_TEMPLATE/<name>.md`, or delete it.',
    )
  })
})
