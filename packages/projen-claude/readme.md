# projen-claude

A [projen] component for authoring [Claude Code] settings, so the permissions,
hooks and environment a repository shares are declared in your projenrc along
with everything else.

Checked against Claude Code `2.1.303`.

## Usage

```sh
npm install -D projen projen-claude
```

Then, create a `Claude` component for your root project:

```ts
import { Project } from 'projen'
import { Claude } from 'projen-claude'

const project = new Project({
  name: 'my-project',
})

const claude = new Claude(project, {
  settings: {
    permissions: {
      deny: ['Read(./.env)'],
    },
  },
})

claude.addAllow('Bash(pnpm test:*)')
claude.addHook(
  'PostToolUse',
  { type: 'command', command: 'pnpm exec prettier --write .' },
  { matcher: 'Edit|Write' },
)
```

This synthesizes `.claude/settings.json`. The component declares nothing of its
own beyond `$schema`: permissions, model and attribution are your choices, so
there are no defaults to inherit.

Claude Code reads the file from the directory it is started in. A session
started in a subdirectory did not pick up the root's settings, so a package that
people work in on its own wants a component of its own.

### Adding to the settings

`settings` takes what Claude Code reads from the file. To add to it without
restating it, such as from another component, use the methods:

- `addAllow()`, `addAsk()` and `addDeny()` add [permission rules][permissions].
  A rule that is already there is not repeated.
- `addHook()` adds a [hook][hooks] to an event. Hooks with the same matcher
  share a group, and a hook that is already there is not repeated.
- `addEnv()` sets an environment variable. It throws on a name that is already
  set to something else, as which one wins is your call.
- `addEnabledPlugin()` and `addMarketplace()` do the same for plugins and the
  marketplaces they come from.

`claude.settings` is the result so far, and `claude.file.addOverride()` reaches
keys the typings lack.

### Personal settings

`.claude/settings.local.json` is the user's. Claude Code saves the rules someone
allows there, and only adds it to their global git excludes. The component never
writes it, and ignores it in the project's `.gitignore`.

Like the other dot-directories, `.claude` is re-included when the project's
ignore file excludes `.*`; otherwise git would never see the settings file. Pass
`gitignore: false` to leave the ignore file alone.

### Edits made in Claude Code

projen makes the file read-only, which does not stop Claude Code: a rule added
with `/permissions` to the project settings rewrites it in place. The next
synthesis puts the file back, so make changes in your projenrc.

If a `.claude/settings.json` that projen did not generate already exists,
synthesis fails rather than overwrite rules its author allowed. Move them into
`settings` and delete the file, or pass `overwriteExisting: true`.

The file stays expanded in review: hooks and allowed commands run on your
teammates' machines, so a change to them should not arrive collapsed as
generated.

## Configuration typings

Options come from [SchemaStore's Claude Code settings schema][schema], compiled
on install. It follows the settings Claude Code publishes rather than the
version a teammate has installed, and it can lag a release. Claude Code loads
unknown keys, so reach past the schema through the file:

```ts
claude.file.addOverride('someNewSetting', true)
```

A value of the wrong type is another matter: Claude Code refuses to load the
whole file, rules and hooks included, so the typings are worth keeping close.

[claude code]: https://code.claude.com/docs/en/settings
[hooks]: https://code.claude.com/docs/en/hooks
[permissions]: https://code.claude.com/docs/en/permissions
[projen]: https://projen.io/
[schema]: https://www.schemastore.org/claude-code-settings.json
