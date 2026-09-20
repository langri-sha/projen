import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import * as path from 'node:path'

import { afterEach, describe, expect, test, vi } from '@langri-sha/vitest'
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

describe('approval', () => {
  const bypasses = [
    ['a trailing flag', 'wt merge --yes', '--yes'],
    ['a leading flag', 'wt --yes merge', '--yes'],
    ['a short flag', 'wt -y merge', '-y'],
    ['a short flag cluster', 'wt -vy merge', '-vy'],
    ['a later command', 'pnpm build && wt merge --yes', '--yes'],
    ['a piped command', 'echo y | wt merge -y', '-y'],
    ['a second line', 'pnpm build\nwt merge --yes', '--yes'],
    ['a continued line', 'wt merge \\\n  --yes', '--yes'],
    ['a substitution', 'echo $(wt -y list)', '-y'],
    ['an environment prefix', 'CI=1 wt merge --yes', '--yes'],
    ['a wrapper', 'exec wt merge --yes', '--yes'],
    ['a qualified binary', '~/.cargo/bin/wt merge --yes', '--yes'],
    ['a quoted binary', '"wt" merge --yes', '--yes'],
    ['a shell string', 'sh -c "wt merge --yes"', '--yes'],
    ['a nested invocation', 'wt step for-each -- wt merge --yes', '--yes'],
    ['pre-approval', 'wt config approvals add --yes', '--yes'],
    [
      'a relocated approvals file',
      'WORKTRUNK_APPROVALS_PATH=.config/approvals.toml wt merge',
      'WORKTRUNK_APPROVALS_PATH',
    ],
    [
      'a written approvals file',
      'cp approved ~/.config/worktrunk/approvals.toml',
      'approvals.toml',
    ],
  ] as const

  test.each(bypasses)('rejects %s', (_, command, found) => {
    expect(() => synth({ config: { 'post-start': command } })).toThrow(
      `post-start uses \`${found}\`, which gets commands past Worktrunk's approval prompt`,
    )
  })

  test.each([
    ['named commands', { 'post-merge': { land: 'wt merge --yes' } }],
    ['pipelines', { 'post-merge': pipeline({ land: 'wt merge --yes' }) }],
    ['aliases', { aliases: { land: 'wt merge --yes' } }],
  ])('rejects a bypass in %s', (_, config) => {
    expect(() => synth({ config })).toThrow(/approval prompt/)
  })

  test.each([
    ['another program', 'gh pr merge --yes'],
    ['a program Worktrunk runs', 'wt step tether -- npx -y serve'],
    ['a flag of another command', 'wt list && apt-get install -y jq'],
    ['Worktrunk without the flag', 'wt step copy-ignored'],
    ['a word ending in wt', 'newt --yes'],
  ])('accepts %s', (_, command) => {
    expect(() => synth({ config: { 'post-start': command } })).not.toThrow()
  })

  test('can be allowed', () => {
    expect(
      synth({
        allowApprovalBypass: true,
        config: { 'post-merge': 'wt remove --yes' },
      })['.config/wt.toml'],
    ).toContain('post-merge = "wt remove --yes"')
  })
})

describe('attributes', () => {
  class AnnotatingProject extends Project {
    override annotateGenerated(glob: string) {
      this.gitattributes.addAttributes(glob, 'linguist-generated')
    }
  }

  test('keeps the config expanded in review', () => {
    expect(synth()['.gitattributes']).toContain(
      '/.config/wt.toml -linguist-generated',
    )
  })

  test('follows a custom filename', () => {
    expect(synth({ filename: 'wt.toml' })['.gitattributes']).toContain(
      '/wt.toml -linguist-generated',
    )
  })

  test('overrules a project that annotates generated files', () => {
    const project = new AnnotatingProject({ name: 'test-project' })

    new Worktrunk(project)
    project.synth()

    execFileSync('git', ['init', '--quiet'], { cwd: project.outdir })

    expect(
      execFileSync(
        'git',
        ['check-attr', 'linguist-generated', '.config/wt.toml', '.gitignore'],
        { cwd: project.outdir, encoding: 'utf8' },
      ),
    ).toBe(
      [
        '.config/wt.toml: linguist-generated: unset',
        '.gitignore: linguist-generated: set',
        '',
      ].join('\n'),
    )
  })
})

describe('ownership', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const handWritten = 'pre-start = "npm ci"\n'
  const starter = [
    '# # Project Configuration',
    '#',
    '# To create a starter file with commented-out examples, run `wt config create --project`.',
    '#',
    '# pre-start = "npm ci"',
    '',
  ].join('\n')

  const existing = (content: string, options?: WorktrunkOptions) => {
    const project = new Project({
      name: 'test-project',
    })
    const file = path.join(project.outdir, '.config/wt.toml')

    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, content)

    new Worktrunk(project, {
      config: { 'pre-start': 'pnpm install' },
      ...options,
    })

    return { project, read: () => readFileSync(file, 'utf8') }
  }

  test.each([
    ['a hand-written config', handWritten],
    ['the starter Worktrunk creates', starter],
    ['an empty config', ''],
  ])('refuses to replace %s', (_, content) => {
    const { project, read } = existing(content)

    expect(() => project.synth()).toThrow(
      '.config/wt.toml exists and was not generated by projen',
    )
    expect(read()).toBe(content)
  })

  test('replaces a hand-written config when told to', () => {
    const { project, read } = existing(handWritten, { overwriteExisting: true })

    project.synth()

    expect(read()).toContain('pre-start = "pnpm install"')
  })

  test('regenerates its own config', () => {
    const { project, read } = existing(handWritten, { overwriteExisting: true })

    project.synth()

    const again = existing(read())

    expect(() => again.project.synth()).not.toThrow()
    expect(again.read()).toBe(read())
  })

  test('recognizes a config generated under another command', () => {
    const { project } = existing(
      '# ~~ Generated by projen. To modify, edit .projenrc.ts and run "pnpm exec projen".\n',
    )

    expect(() => project.synth()).not.toThrow()
  })

  test('steps aside when ejecting', () => {
    vi.stubEnv('PROJEN_EJECTING', 'true')

    const { project, read } = existing(handWritten)

    expect(() => project.synth()).not.toThrow()
    expect(read()).toBe('\npre-start = "pnpm install"\n')
  })
})

describe('contributing hooks', () => {
  const component = (options?: WorktrunkOptions) =>
    new Worktrunk(new Project({ name: 'test-project' }), options)

  test('adds a hook in any form', () => {
    const worktrunk = component()

    worktrunk.addHook('pre-start', 'pnpm install')
    worktrunk.addHook('post-start', { server: 'pnpm dev' })
    worktrunk.addHook('pre-merge', pipeline({ lint: 'pnpm lint' }))

    expect(worktrunk.config).toEqual({
      'pre-start': 'pnpm install',
      'post-start': { server: 'pnpm dev' },
      'pre-merge': [{ lint: 'pnpm lint' }],
    })
  })

  test('writes contributed hooks in lifecycle order', () => {
    const worktrunk = component({ config: { 'post-remove': { a: 'echo a' } } })

    worktrunk.addCommand('pre-merge', 'test', 'pnpm test')
    worktrunk.addStep('pre-switch', { fetch: 'git fetch' })

    expect(
      Object.keys(parse(synthSnapshot(worktrunk.project)['.config/wt.toml'])),
    ).toEqual(['pre-switch', 'pre-merge', 'post-remove'])
  })

  test('refuses a second hook for an event', () => {
    const worktrunk = component({ config: { 'pre-start': 'pnpm install' } })

    expect(() => worktrunk.addHook('pre-start', 'pnpm build')).toThrow(
      /pre-start already has a hook\. Add to it with `addCommand\(\)`/,
    )
  })

  test('adds commands alongside one another', () => {
    const worktrunk = component({
      config: { 'pre-merge': { lint: 'pnpm lint' } },
    })

    worktrunk.addCommand('pre-merge', 'test', 'pnpm test')
    worktrunk.addCommand('post-start', 'server', 'pnpm dev')

    expect(worktrunk.config).toEqual({
      'post-start': { server: 'pnpm dev' },
      'pre-merge': { lint: 'pnpm lint', test: 'pnpm test' },
    })
  })

  test('accepts the same command twice', () => {
    const worktrunk = component()

    worktrunk.addCommand('pre-merge', 'test', 'pnpm test')
    worktrunk.addCommand('pre-merge', 'test', 'pnpm test')

    expect(worktrunk.config).toEqual({ 'pre-merge': { test: 'pnpm test' } })
  })

  test('refuses to replace a command', () => {
    const worktrunk = component({
      config: { 'pre-merge': { test: 'pnpm test' } },
    })

    expect(() =>
      worktrunk.addCommand('pre-merge', 'test', 'cargo test'),
    ).toThrow(
      "pre-merge already has a command named 'test' that runs something else: pnpm test",
    )
  })

  test.each([
    [
      'a single command',
      'pnpm install',
      /is a single command, so 'more' cannot/,
    ],
    [
      'a pipeline',
      pipeline({ a: 'echo a' }),
      /is a pipeline, so 'more' cannot/,
    ],
  ])('refuses to add a command to %s', (_, hook, message) => {
    const worktrunk = component({ config: { 'pre-start': hook } })

    expect(() =>
      worktrunk.addCommand('pre-start', 'more', 'echo more'),
    ).toThrow(message)
    expect(worktrunk.config).toEqual({ 'pre-start': hook })
  })

  test('appends steps in turn', () => {
    const worktrunk = component({
      config: { 'post-start': pipeline({ install: 'pnpm install' }) },
    })

    worktrunk.addStep('post-start', { build: 'pnpm build', server: 'pnpm dev' })
    worktrunk.addStep('pre-merge', { test: 'pnpm test' })

    expect(worktrunk.config).toEqual({
      'post-start': [
        { install: 'pnpm install' },
        { build: 'pnpm build', server: 'pnpm dev' },
      ],
      'pre-merge': [{ test: 'pnpm test' }],
    })
  })

  test.each([
    ['a single command', 'pnpm install', /is a single command, not a pipeline/],
    ['named commands', { a: 'echo a' }, /is named commands, not a pipeline/],
  ])('refuses to add a step to %s', (_, hook, message) => {
    const worktrunk = component({ config: { 'pre-start': hook } })

    expect(() => worktrunk.addStep('pre-start', { b: 'echo b' })).toThrow(
      message,
    )
  })

  test('holds contributions to the same rules', () => {
    const worktrunk = component()

    expect(() => worktrunk.addHook('pre-start', '')).toThrow(/empty command/)
    expect(() => worktrunk.addCommand('pre-start', 'a:b', 'echo')).toThrow(
      /names a command 'a:b'/,
    )
    expect(() => worktrunk.addStep('pre-start', {})).toThrow(/has no commands/)
    expect(() =>
      worktrunk.addStep('post-merge', { land: 'wt merge -y' }),
    ).toThrow(/approval prompt/)
    expect(() =>
      worktrunk.addHook('pre-started' as 'pre-start', 'echo a'),
    ).toThrow(/not a Worktrunk hook event/)
    expect(worktrunk.config).toEqual({})
  })

  test('leaves the options it was given alone', () => {
    const config = { 'pre-merge': { lint: 'pnpm lint' } }
    const worktrunk = component({ config })

    worktrunk.addCommand('pre-merge', 'test', 'pnpm test')

    expect(config).toEqual({ 'pre-merge': { lint: 'pnpm lint' } })
  })
})

describe('tasks', () => {
  const tasks = (options?: WorktrunkOptions) =>
    synth(options)['.projen/tasks.json'].tasks

  test('shows the configured hooks', () => {
    expect(tasks()['worktrunk:show'].steps).toEqual([
      { exec: 'wt hook show --expanded' },
    ])
  })

  test('dry-runs each configured event', () => {
    const project = new Project({ name: 'test-project' })

    new Worktrunk(project, {
      config: {
        'pre-merge': { test: 'pnpm test' },
        'pre-start': 'pnpm install',
        aliases: { open: 'open .' },
      },
    }).addCommand('post-start', 'server', 'pnpm dev')

    expect(
      synthSnapshot(project)['.projen/tasks.json'].tasks['worktrunk:dry-run']
        .steps,
    ).toEqual([
      { exec: 'wt hook pre-start --dry-run' },
      { exec: 'wt hook post-start --dry-run' },
      { exec: 'wt hook pre-merge --dry-run' },
    ])
  })

  test('never skips approval', () => {
    expect(
      JSON.stringify(tasks({ config: { 'pre-start': 'pnpm install' } })),
    ).not.toMatch(/--yes|-y\b/)
  })

  test('joins no other task', () => {
    const others = Object.entries(
      tasks({ config: { 'pre-start': 'pnpm install' } }),
    ).filter(([name]) => !name.startsWith('worktrunk:'))

    expect(JSON.stringify(others)).not.toContain('worktrunk')
  })

  test('can be disabled', () => {
    const disabled = tasks({ tasks: false })

    expect(disabled).not.toHaveProperty(['worktrunk:show'])
    expect(disabled).not.toHaveProperty(['worktrunk:dry-run'])
  })
})
