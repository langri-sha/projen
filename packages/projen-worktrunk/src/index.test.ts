import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import * as path from 'node:path'

import { describe, expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'
import { parse } from 'smol-toml'

import { Worktrunk, type WorktrunkOptions, pipeline } from './index'

const synth = (options?: WorktrunkOptions) => {
  const project = new Project({
    name: 'test-project',
  })

  new Worktrunk(project, options)

  return synthSnapshot(project)
}

test('defaults', () => {
  expect(synth()).toMatchSnapshot()
})

describe('hook forms', () => {
  test('a single command', () => {
    expect(
      synth({ config: { 'pre-start': 'npm install' } })['.config/wt.toml'],
    ).toMatchSnapshot()
  })

  test('named commands', () => {
    expect(
      synth({
        config: {
          'post-start': { server: 'npm run dev', watch: 'npm run watch' },
        },
      })['.config/wt.toml'],
    ).toMatchSnapshot()
  })

  test('an ordered pipeline', () => {
    expect(
      synth({
        config: {
          'post-start': pipeline(
            { install: 'npm ci' },
            { build: 'npm run build', server: 'npm run dev' },
          ),
        },
      })['.config/wt.toml'],
    ).toMatchSnapshot()
  })
})

test('orders hooks by lifecycle, ahead of sections', () => {
  const content: string = synth({
    config: {
      list: { url: 'http://localhost:{{ branch | hash_port }}' },
      'post-remove': { clean: 'echo post-remove' },
      'pre-remove': { clean: 'echo pre-remove' },
      'post-merge': { notify: 'echo post-merge' },
      'pre-merge': { test: 'echo pre-merge' },
      'post-commit': { notify: 'echo post-commit' },
      'pre-commit': { lint: 'echo pre-commit' },
      'post-start': { server: 'echo post-start' },
      'pre-start': { install: 'echo pre-start' },
      'post-switch': { title: 'echo post-switch' },
      'pre-switch': { fetch: 'echo pre-switch' },
    },
  })['.config/wt.toml']

  expect(content.match(/^\[.+\]$/gm)).toEqual([
    '[pre-switch]',
    '[post-switch]',
    '[pre-start]',
    '[post-start]',
    '[pre-commit]',
    '[post-commit]',
    '[pre-merge]',
    '[post-merge]',
    '[pre-remove]',
    '[post-remove]',
    '[list]',
  ])
})

test('preserves the declared order of named commands', () => {
  const content: string = synth({
    config: {
      'post-start': { install: 'a', build: 'b', server: 'c' },
    },
  })['.config/wt.toml']

  expect(content.match(/^\w+(?= =)/gm)).toEqual(['install', 'build', 'server'])
})

test('every section', () => {
  expect(
    synth({
      config: {
        'pre-start': 'pnpm install --frozen-lockfile',
        'post-start': {
          copy: 'wt step copy-ignored',
          server: 'wt step tether -- pnpm dev --port {{ branch | hash_port }}',
        },
        'pre-merge': { lint: 'pnpm lint', test: 'pnpm vitest run' },
        aliases: {
          open: 'open "http://localhost:{{ branch | hash_port }}"',
          check: pipeline({ lint: 'pnpm lint' }, { test: 'pnpm vitest run' }),
        },
        commit: {
          generation: { 'template-append': 'Write imperative subjects.' },
        },
        forge: { platform: 'github', hostname: 'github.example.com' },
        list: { url: 'http://localhost:{{ branch | hash_port }}' },
        step: {
          'copy-ignored': { exclude: ['.turbo/', 'node_modules/.cache/'] },
        },
      },
    })['.config/wt.toml'],
  ).toMatchSnapshot()
})

test('custom filename', () => {
  expect(
    synth({ filename: 'wt.toml', config: { 'pre-start': 'npm install' } })[
      'wt.toml'
    ],
  ).toMatchSnapshot()
})

test('reaches unmodelled keys without any config', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Worktrunk(project).file.addOverride('list.url', 'http://localhost:3000')

  expect(synthSnapshot(project)['.config/wt.toml']).toContain(
    'url = "http://localhost:3000"',
  )
})

test('reaches unmodelled keys through the file', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Worktrunk(project, {
    config: { 'pre-start': 'npm install' },
  }).file.addOverride('list.url', 'http://localhost:3000')

  expect(synthSnapshot(project)['.config/wt.toml']).toMatchSnapshot()
})

describe('ignore file', () => {
  const denyByDefault = (options?: WorktrunkOptions) => {
    const project = new Project({
      name: 'test-project',
      gitIgnoreOptions: {
        ignorePatterns: ['.*', '.config/secret.toml'],
      },
    })

    new Worktrunk(project, options)

    return project
  }

  const patterns = (project: Project): string[] =>
    synthSnapshot(project)['.gitignore'].split('\n')

  test('re-includes the directory a deny-by-default file excludes', () => {
    expect(patterns(denyByDefault())).toEqual(
      expect.arrayContaining(['!/.config', '!/.config/wt.toml']),
    )
  })

  test('keeps the patterns a project already has under the directory', () => {
    expect(patterns(denyByDefault())).toContain('.config/secret.toml')
  })

  test('re-includes every dot-directory leading to a custom filename', () => {
    expect(
      patterns(denyByDefault({ filename: '.tools/nested/.wt/wt.toml' })),
    ).toEqual(expect.arrayContaining(['!/.tools', '!/.tools/nested/.wt']))
  })

  test('leaves the ignore file alone without dot-directories', () => {
    expect(patterns(denyByDefault({ filename: 'config/wt.toml' }))).toEqual(
      patterns(denyByDefault({ filename: 'config/wt.toml', gitignore: false })),
    )
  })

  test('can be disabled', () => {
    expect(patterns(denyByDefault({ gitignore: false }))).not.toContain(
      '!/.config',
    )
  })

  describe('as git reads it', () => {
    const ignored = (project: Project, file: string) => {
      project.synth()

      mkdirSync(path.dirname(path.join(project.outdir, file)), {
        recursive: true,
      })

      if (!existsSync(path.join(project.outdir, file))) {
        writeFileSync(path.join(project.outdir, file), '')
      }

      execFileSync('git', ['init', '--quiet'], { cwd: project.outdir })

      try {
        execFileSync('git', ['check-ignore', '--quiet', file], {
          cwd: project.outdir,
        })

        return true
      } catch {
        return false
      }
    }

    test('the config is tracked', () => {
      expect(ignored(denyByDefault(), '.config/wt.toml')).toBe(false)
    })

    test('the config is ignored when disabled', () => {
      expect(
        ignored(denyByDefault({ gitignore: false }), '.config/wt.toml'),
      ).toBe(true)
    })

    test.each([
      '.config/secret.toml',
      '.config/.hidden',
      'packages/a/.config/wt.toml',
    ])('%s stays ignored', (file) => {
      expect(ignored(denyByDefault(), file)).toBe(true)
    })
  })
})

describe('serialization', () => {
  const commands = {
    filter: 'pnpm dev --port {{ branch | hash_port }}',
    default: "echo {{ vars.port | default('3000') }}",
    conditional: '{% if branch %}echo {{ branch }}{% endif %}',
    'single quotes': "echo 'a b'",
    'double quotes': 'echo "a b"',
    'both quotes': `echo 'a' "b"`,
    backslashes: String.raw`sed 's/\//-/g' C:\Users\wt`,
    'escaped newline': String.raw`printf 'a\nb'`,
    substitution: 'echo $(git rev-parse HEAD) `whoami` ${HOME}',
    operators: 'a && b || c | d > e 2>/dev/null; f &',
    continuation:
      'docker run \\\n  --name {{ branch | sanitize }} \\\n  postgres',
    heredoc: 'cat <<\'EOF\'\n[table]\nkey = "value"\nEOF',
    'leading newline': '\necho a',
    'trailing newline': 'echo a\n',
    'carriage return': 'echo a\r\necho b',
    comment: 'echo a # not a comment',
    unicode: 'echo "žluťoučký 🌳 ”quoted”"',
    tab: 'echo\ta',
    'triple quotes': 'echo """a"""',
  }

  test.each(Object.entries(commands))(
    'a single command survives: %s',
    (_, command) => {
      const config = { 'pre-start': command }

      expect(parse(synth({ config })['.config/wt.toml'])).toEqual(config)
    },
  )

  test('named commands survive', () => {
    const config = { 'post-start': commands }

    expect(parse(synth({ config })['.config/wt.toml'])).toEqual(config)
  })

  test('a pipeline survives', () => {
    const config = {
      'pre-merge': pipeline(commands, { last: 'echo done' }),
      aliases: { all: pipeline(commands), one: commands.filter },
    }

    expect(parse(synth({ config })['.config/wt.toml'])).toEqual(config)
  })

  test('sections survive', () => {
    const config = {
      commit: { generation: { 'template-append': 'Line one.\nLine "two".' } },
      forge: { platform: 'gitlab', hostname: 'gitlab.example.com' },
      list: { url: 'http://localhost:{{ branch | hash_port }}' },
      step: { 'copy-ignored': { exclude: ['.turbo/', "it's/"] } },
    } as const

    expect(parse(synth({ config })['.config/wt.toml'])).toEqual(config)
  })
})

describe('validation', () => {
  const invalid = (config: unknown) => () =>
    synth({ config: config as WorktrunkOptions['config'] })

  test.each([
    ['pre-started', /'pre-started' is not a Worktrunk hook event/],
    ['post-merged', /would never run. Use one of: pre-switch, post-switch/],
    ['pre-create', /alias Worktrunk keeps for 'pre-start'/],
    ['post-create', /alias Worktrunk keeps for 'post-start'/],
    ['hooks', /file\.addOverride\('hooks', …\)/],
  ])('rejects the unknown key %s', (key, message) => {
    expect(invalid({ [key]: 'echo a' })).toThrow(message)
  })

  test.each([
    ['an empty command', { 'pre-start': '' }, /pre-start is an empty command/],
    [
      'a blank command',
      { 'pre-start': ' \n' },
      /pre-start is an empty command/,
    ],
    [
      'a blank named command',
      { 'pre-start': { install: '' } },
      /pre-start\.install is an empty command/,
    ],
    ['no commands', { 'post-start': {} }, /post-start has no commands/],
    [
      'no steps',
      { 'post-start': [] },
      /post-start is a pipeline with no steps/,
    ],
    [
      'an empty step',
      { 'post-start': [{ a: 'echo a' }, {}] },
      /post-start\[1\] has no commands/,
    ],
    [
      'a list of bare strings',
      { 'post-start': ['echo a', 'echo b'] },
      /post-start\[0\] must map command names to commands, not "echo a"/,
    ],
    [
      'a command that is not a string',
      { 'pre-start': { install: ['pnpm', 'install'] } },
      /pre-start\.install must be a shell command string/,
    ],
    ['a hook that is not a form', { 'pre-start': 1 }, /pre-start must map/],
    [
      'a name with a colon',
      { 'pre-merge': { 'test:unit': 'pnpm test' } },
      /names a command 'test:unit'/,
    ],
    ['an empty name', { 'pre-merge': { ' ': 'pnpm test' } }, /an empty name/],
    [
      'an unclosed variable',
      { 'pre-start': 'echo {{ branch ' },
      /pre-start opens a template tag with `{{` and never closes it/,
    ],
    [
      'an unclosed block',
      { 'pre-start': '{% if branch echo {{ branch }}' },
      /opens a template tag with `{%`/,
    ],
    [
      'an unclosed comment',
      { 'pre-start': 'echo a {# note' },
      /opens a template tag with `{#`/,
    ],
    [
      'an invalid alias',
      { aliases: { deploy: { 'a:b': 'make deploy' } } },
      /aliases\.deploy names a command 'a:b'/,
    ],
    [
      'an empty alias',
      { aliases: { deploy: '' } },
      /aliases\.deploy is an empty/,
    ],
  ])('rejects %s', (_, config, message) => {
    expect(invalid(config)).toThrow(message)
  })

  test.each([
    ['nested parameter expansion', 'echo ${A:-${B}}'],
    ['a closer on its own', 'echo {{ branch }} }}'],
    ['several tags', '{% if branch %}echo {{ branch }}{% endif %} {# note #}'],
  ])('accepts %s', (_, command) => {
    expect(invalid({ 'pre-start': command })).not.toThrow()
  })

  test('rejects a subproject, which Worktrunk never reads', () => {
    const parent = new Project({ name: 'parent' })
    const project = new Project({ name: 'child', parent, outdir: 'child' })

    expect(() => new Worktrunk(project)).toThrow(
      /the subproject 'child' would never be read/,
    )
  })

  test('accepts a subproject that names its file', () => {
    const parent = new Project({ name: 'parent' })
    const project = new Project({ name: 'child', parent, outdir: 'child' })

    new Worktrunk(project, { filename: '.config/wt.toml' })

    expect(synthSnapshot(parent)).toHaveProperty(['child/.config/wt.toml'])
  })
})
