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
