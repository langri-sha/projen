import { describe, expect, test } from '@langri-sha/vitest'

import { findCollisions, templateKind } from './paths'

describe('templateKind', () => {
  test.each([
    ['.github/ISSUE_TEMPLATE/config.yml', 'chooser'],
    ['.github/ISSUE_TEMPLATE/01-bug.yml', 'issue-form'],
    ['.github/ISSUE_TEMPLATE/Bug Report.yml', 'issue-form'],
    ['.github/ISSUE_TEMPLATE/02-proposal.md', 'issue-template'],
    ['.github/ISSUE_TEMPLATE/config.md', 'issue-template'],
    ['pull_request_template.md', 'pull-request-template'],
    ['.github/pull_request_template.md', 'pull-request-template'],
    ['docs/pull_request_template.md', 'pull-request-template'],
    ['PULL_REQUEST_TEMPLATE/release.md', 'pull-request-template'],
    ['.github/PULL_REQUEST_TEMPLATE/release.md', 'pull-request-template'],
    ['docs/PULL_REQUEST_TEMPLATE/release.md', 'pull-request-template'],
  ])('%s is a %s', (path, kind) => {
    expect(templateKind(path)).toBe(kind)
  })

  test.each([
    ['.github\\ISSUE_TEMPLATE\\bug.yml', 'use forward slashes.'],
    ['/.github/ISSUE_TEMPLATE/bug.yml', 'not absolute.'],
    ['C:/repo/.github/ISSUE_TEMPLATE/bug.yml', 'not absolute.'],
    ['./.github/ISSUE_TEMPLATE/bug.yml', 'drop the leading `./`.'],
    ['.github/ISSUE_TEMPLATE/../bug.yml', '`..` segments are not allowed'],
    ['.github/ISSUE_TEMPLATE/./bug.yml', '`.` and `..` segments'],
    ['.github//ISSUE_TEMPLATE/bug.yml', 'empty, `.` and `..` segments'],
    ['.github/ISSUE_TEMPLATE/', 'empty, `.` and `..` segments'],
    ['.github/ISSUE_TEMPLATE/bug.yaml', 'must use the `.yml` extension'],
    ['.github/ISSUE_TEMPLATE/config.yaml', 'must use the `.yml` extension'],
    ['.github/ISSUE_TEMPLATE/bug.json', '`.yml` forms or `.md` templates'],
    ['.github/ISSUE_TEMPLATE/forms/bug.yml', 'only the top level'],
    ['.github/ISSUE_TEMPLATE/.bug.yml', 'must not start with a dot'],
    [
      '.github/ISSUE_TEMPLATE/Config.yml',
      '`.github/ISSUE_TEMPLATE/config.yml`',
    ],
    ['.github/issue_template/bug.yml', '`.github/ISSUE_TEMPLATE/<name>.yml`'],
    ['.github/ISSUE_TEMPLATE/bug.YML', '`.github/ISSUE_TEMPLATE/<name>.yml`'],
    ['.github/ISSUE_TEMPLATE.md', 'retired the single ISSUE_TEMPLATE.md'],
    ['ISSUE_TEMPLATE.md', 'retired the single ISSUE_TEMPLATE.md'],
    ['docs/issue_template.md', 'retired the single ISSUE_TEMPLATE.md'],
    ['ISSUE_TEMPLATE/bug.yml', 'never offered in the template chooser'],
    ['docs/ISSUE_TEMPLATE/bug.md', 'never offered in the template chooser'],
    ['.github/pull_request_template.txt', 'writes Markdown only'],
    ['docs/PULL_REQUEST_TEMPLATE/release.txt', 'writes Markdown only'],
    ['.github/PULL_REQUEST_TEMPLATE/a/release.md', 'only the top level'],
    ['.github/PULL_REQUEST_TEMPLATE/release.yml', 'must use the `.md`'],
    [
      '.github/PULL_REQUEST_TEMPLATE.md',
      '`{.github/,docs/,}pull_request_template.md`',
    ],
    [
      '.github/pull_request_templates/release.md',
      'not a template location. Use one of:',
    ],
    ['.github/ISSUE_TEMPLATES/bug.yml', 'not a template location'],
    ['.github/workflows/ci.yml', 'not a template location'],
    ['SECURITY.md', 'not a template location'],
  ])('rejects %s', (path, message) => {
    expect(() => templateKind(path)).toThrow(`${path}: `)
    expect(() => templateKind(path)).toThrow(message)
  })
})

describe('findCollisions', () => {
  test('passes distinct paths', () => {
    expect(
      findCollisions([
        '.github/ISSUE_TEMPLATE/bug.yml',
        '.github/ISSUE_TEMPLATE/bug.md',
        '.github/pull_request_template.md',
        '.github/PULL_REQUEST_TEMPLATE/release.md',
        'docs/PULL_REQUEST_TEMPLATE/hotfix.md',
      ]),
    ).toEqual([])
  })

  test('folds case', () => {
    expect(
      findCollisions([
        '.github/ISSUE_TEMPLATE/Bug.yml',
        '.github/ISSUE_TEMPLATE/bug.yml',
      ]),
    ).toEqual([
      '`.github/ISSUE_TEMPLATE/Bug.yml` and `.github/ISSUE_TEMPLATE/bug.yml` are the same file to GitHub, which ignores case in template filenames. Keep one.',
    ])
  })

  test('allows one default pull request template', () => {
    expect(
      findCollisions([
        '.github/pull_request_template.md',
        'docs/pull_request_template.md',
      ]),
    ).toEqual([
      '`.github/pull_request_template.md` and `docs/pull_request_template.md` are both default pull request templates, and GitHub applies only one. Keep one.',
    ])
  })

  test('allows one named pull request template per name', () => {
    expect(
      findCollisions([
        '.github/PULL_REQUEST_TEMPLATE/release.md',
        'docs/PULL_REQUEST_TEMPLATE/Release.md',
        'PULL_REQUEST_TEMPLATE/hotfix.md',
      ]),
    ).toEqual([
      '`.github/PULL_REQUEST_TEMPLATE/release.md` and `docs/PULL_REQUEST_TEMPLATE/Release.md` are both selected by `?template=release.md`. Rename one.',
    ])
  })

  test('reports a pair once', () => {
    expect(
      findCollisions([
        'docs/PULL_REQUEST_TEMPLATE/release.md',
        'docs/PULL_REQUEST_TEMPLATE/Release.md',
      ]),
    ).toHaveLength(1)
  })
})
