# @langri-sha/projen-skills

A [projen] component for the agent skills a repository uses. It declares them in
the `skills` field of `package.json` and installs them with the [`skills`] CLI,
so a fresh clone, CI and a cloud session all get the same revision of every
skill.

Projen owns the intent, and the CLI owns the lock: the component never writes
`skills-lock.json`. Commit it.

Checked against `skills` `1.7.2`, which added the `skills` field and
`experimental_sync`. The field follows the grammar of [skills-npm's spec][spec].

## Usage

Install dependencies. `skills` is an optional peer, because components do not
install CLIs for you, and it needs Node 22.20 or later:

```sh
npm install -D projen @langri-sha/projen-skills skills
```

Then, create a `Skills` component for a Node project:

```ts
import { javascript } from 'projen'
import { Skills } from '@langri-sha/projen-skills'

const project = new javascript.NodeProject({
  name: 'my-project',
  defaultReleaseBranch: 'main',
})

new Skills(project, {
  skills: [
    {
      source: 'vercel-labs/skills',
      ref: '0b8fb22aaa7f82447d4befe1b6a95d30a5b279b8',
      skills: ['find-skills'],
    },
  ],
})

project.synth()
```

This writes the `skills` field of `package.json` and, after synthesis, runs
`skills experimental_sync -a claude-code -y`. That clones each entry at its
`ref` into `.agents/skills/<name>/`, links it into each agent's folder
(`.claude/skills/<name>`), and writes `skills-lock.json`.

### Sources

Each entry is `{ source, ref?, skills }`:

- `source` is `npm:<package>`, or a git repository as `owner/repo` or a URL.
  Local paths are rejected, as a fresh clone could not restore them.
- `ref` must be a full 40-character commit SHA for git sources. A branch or tag
  moves, and the lock would stop meaning anything.
- `skills` names the skills to install. The spec makes it optional, but the
  component ignores and checks skills by name, and a source does not reveal its
  skills before it is cloned. Declare the ones you use.

Synthesis fails with the entry and the reason when any of this does not hold.

### Agents

`agents` defaults to `['claude-code']`. Names are the ones the CLI takes for
`-a`; the component mirrors its registry in `AGENT_SKILLS_DIRS` to know where
each agent looks, and rejects a name it does not know. Agents that read
`.agents/skills` directly need no link.

### The lock and `.gitignore`

Only the declared skills are ignored: `/.agents/skills/<name>/` and, per agent,
`/<agent folder>/<name>`. The folders around them are not, so a repository can
still commit hand-written skills in `.claude/skills`. Sync rebuilds the ignored
ones from `skills-lock.json` on a fresh clone. Run `projen` after cloning.

A deny-by-default `.gitignore` (`.*`) excludes `.agents/` and `.claude/`
entirely, and git does not descend into an excluded directory. Re-include them
yourself, or the committed skills of your own never get tracked.

### Sync

After every synthesis the component syncs, then verifies the result itself: each
declared skill must be in `skills-lock.json` with `via: "."`, locked at the
declared `ref`, and present in `.agents/skills` and in each agent's folder.

It does not trust the CLI's exit code. A failed fetch prunes the skill from disk
and from the lock before exiting 1, and several failures exit 0. So the lock is
snapshotted before the run and restored when the CLI fails or the verification
does, and synthesis throws. Skills the failed run pruned from disk stay pruned:
fix the cause and run `projen` again.

Because the lock is rewritten by every sync, `projen` followed by a check for
uncommitted changes, as a CI step does, is the frozen-lock check: it fails when
the declaration and the committed lock disagree.

The CLI runs with `DISABLE_TELEMETRY=1` and `LC_ALL=C`. `computedHash` sorts
paths with `localeCompare`, so the lock would otherwise differ between machines.
It also depends on line endings: keep skill files out of any `text=auto`
conversion.

The component never runs `skills experimental_install`. It strips `via` from the
entries the field manages; sync then skips them as installed with `skills add`,
installs nothing on a fresh clone, and still exits 0.

Pass `sync: false` to leave installing to the `skills` task, which runs the same
command by hand (`pnpm exec projen skills`). It has neither the lock restore nor
the verification.

[projen]: https://projen.io/
[spec]: https://github.com/antfu/skills-npm/blob/main/SPEC.md
[`skills`]: https://github.com/vercel-labs/skills
