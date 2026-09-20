# @langri-sha/projen-worktrunk

A [projen] component for authoring [Worktrunk] project configuration, so the
hooks that run across a worktree's lifecycle are declared in your projenrc along
with everything else.

Worktrunk ships as a binary and is not on npm: [install it][install] separately.
Checked against Worktrunk `0.72.0`, and its documentation and source at
`0.78.0`.

## Usage

Install dependencies:

```sh
npm install -D @langri-sha/projen-worktrunk
```

Then, create a `Worktrunk` component for your root project:

```ts
import { Project } from 'projen'
import { Worktrunk, pipeline } from '@langri-sha/projen-worktrunk'

const project = new Project({
  name: 'my-project',
})

new Worktrunk(project, {
  config: {
    // A single command.
    'pre-start': 'pnpm install --frozen-lockfile',

    // Named commands, run concurrently.
    'post-start': {
      copy: 'wt step copy-ignored',
      server: 'wt step tether -- pnpm dev --port {{ branch | hash_port }}',
    },

    // Steps run in turn; the commands within a step run concurrently.
    'pre-merge': pipeline({ lint: 'pnpm lint' }, { test: 'pnpm test' }),

    list: {
      url: 'http://localhost:{{ branch | hash_port }}',
    },
  },
})
```

This synthesizes `.config/wt.toml`. Worktrunk reads it from the root of a
worktree, so the component refuses a subproject unless you name a `filename`.

### Hooks

`config` takes the ten [hook events][hooks] — `pre-` and `post-` × `switch`,
`start`, `commit`, `merge` and `remove` — each in one of the three forms
Worktrunk tells apart by shape. The component never turns one form into another:
the form decides the text a teammate is asked to approve, and the name a command
is addressed by (`wt hook pre-merge project:test`). Prefer named commands; a
single command has no name to address.

Hooks are written in lifecycle order, though TOML requires single commands to
come ahead of every table. Named commands keep the order you declare them in.

Worktrunk shell-escapes template variables itself, so don't quote
`{{ branch }}`.

Alongside the hooks, `config` takes `aliases` (in the same three forms),
`commit.generation.template-append`, `forge`, `list.url` and
`step.copy-ignored.exclude`. Worktrunk publishes no schema, so these are
mirrored by hand. For a key that is missing, reach for the file:

```ts
worktrunk.file.addOverride('list.url', 'http://localhost:3000')
```

### Contributing hooks

Other components can add to the hooks a project declares:

```ts
worktrunk.addHook('pre-start', 'pnpm install')
worktrunk.addCommand('pre-merge', 'test', 'pnpm test')
worktrunk.addStep('post-start', { build: 'pnpm build' })
```

Each throws rather than replace a command or change a hook's form.

### Approval

Worktrunk asks each teammate to approve a project's commands before it first
runs them. It remembers approvals per project by the **exact text of the
command**: renaming a command, or moving it to another event, asks nothing, and
editing it asks again for that command alone.

So keep the approved text stable, and let what it runs evolve under ordinary
review:

```ts
'pre-merge': { test: 'pnpm run wt:pre-merge' }
```

A hook that inlines its logic re-prompts the whole team on every tweak, which
trains everyone to approve without reading.

Declining approval skips every project command for that operation and carries
on, so a `pre-*` hook should not assume an earlier one ran.

The component rejects a command that gets past the prompt: `--yes` or `-y` on
any `wt` invocation, or a reach for `approvals.toml`. Such a command needs
approving once itself, and from then on runs every later command unreviewed on
each teammate's machine. It is a guard rail, not a sandbox — it cannot see into
a script a hook calls. Pass `allowApprovalBypass: true` to opt out.

For the same reason the config is kept out of `linguist-generated`, so its diffs
arrive expanded in review.

### Checking hooks

Two tasks, neither of which needs approval or joins another task:

- `worktrunk:show` prints the hooks as Worktrunk resolves them.
- `worktrunk:dry-run` expands every configured hook without running it, and
  fails on a template Worktrunk cannot expand — a syntax error or an undefined
  variable. `{{ branch }}` is undefined in a detached worktree; guard it with
  `{% if branch %}`.

Pass `tasks: false` to leave them out.

### Mistakes caught at synthesis

Worktrunk fails quietly on each of these, so the component throws instead:

- an unknown event, such as `pre-started`, which Worktrunk warns about and then
  ignores, so the hook never runs
- an empty table, pipeline or step, which it reads as no hook at all, and an
  empty command, which it asks approval to run
- a `:` in a command name, over which it refuses to load the whole file
- a template tag that is opened and never closed

### Adopting an existing config

Worktrunk has no way to include one config in another, so the component owns the
whole file. Where a `.config/wt.toml` exists that projen did not generate,
synthesis fails rather than replace it:

1. Move its contents into `config`.
2. `git rm .config/wt.toml`, then synthesize.
3. Compare the result, and run `worktrunk:dry-run`.

Pass `overwriteExisting: true` to replace the file instead. Unchanged commands
keep their approvals either way.

### Ignore files

A deny-by-default `.gitignore` (`.*`) excludes `.config/`, and git does not
descend into an excluded directory, so the config would be generated and never
committed. The component re-includes each dot-directory leading to the file
(`!/.config`), leaving dotfiles inside it ignored. Other files in `.config/`
become visible to git. Pass `gitignore: false` if you manage this yourself.

[hooks]: https://worktrunk.dev/hook/
[install]: https://worktrunk.dev/#install
[projen]: https://projen.io/
[worktrunk]: https://worktrunk.dev
