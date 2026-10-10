# projen-github-templates

A [projen] component for authoring GitHub [issue forms][issue forms], Markdown
issue templates, the [template chooser][chooser] and [pull request
templates][pull request templates].

## Usage

```sh
npm install -D projen projen-github-templates
```

Declare templates by the path GitHub reads them from:

```ts
import { Project } from 'projen'
import { GitHubTemplates } from 'projen-github-templates'

const project = new Project({
  name: 'acme',
})

new GitHubTemplates(project, {
  files: {
    '.github/ISSUE_TEMPLATE/01-bug-report.yml': {
      name: 'Bug report',
      description: 'Something is broken and you can reproduce it.',
      labels: ['bug'],
      body: [
        {
          type: 'input',
          id: 'version',
          attributes: { label: 'Version', placeholder: '1.4.2' },
          validations: { required: true },
        },
        {
          type: 'textarea',
          id: 'reproduction',
          attributes: { label: 'Reproduction steps', value: '1.\n2.\n3.\n' },
        },
      ],
    },

    '.github/ISSUE_TEMPLATE/02-proposal.md': {
      name: 'Proposal',
      about: 'Suggest a change that needs discussion first.',
      body: ['## Problem', '', '## Proposed change'],
    },

    '.github/ISSUE_TEMPLATE/config.yml': {
      blankIssuesEnabled: false,
      contactLinks: [
        {
          name: 'Questions',
          url: 'https://github.com/acme/acme/discussions',
          about: 'Ask here first.',
        },
      ],
    },

    '.github/pull_request_template.md': {
      body: ['## What changed', '', '## Checklist', '', '- [ ] Tests'],
    },
  },
})

project.synth()
```

The path selects what the value is, and the value is checked strictly against
it:

| Path                                               | Template                  |
| -------------------------------------------------- | ------------------------- |
| `.github/ISSUE_TEMPLATE/config.yml`                | The template chooser      |
| `.github/ISSUE_TEMPLATE/<name>.yml`                | An issue form             |
| `.github/ISSUE_TEMPLATE/<name>.md`                 | A Markdown issue template |
| `{.github/,docs/,}pull_request_template.md`        | The default PR template   |
| `{.github/,docs/,}PULL_REQUEST_TEMPLATE/<name>.md` | A named PR template       |

Form elements mirror GitHub's [form schema], so its examples paste in as they
are. The chooser alone takes camelCase options; it is written with GitHub's
`snake_case` keys. Each template is also available as a component of its own —
`IssueForm`, `IssueTemplate`, `IssueTemplateChooser` and `PullRequestTemplate` —
though only `GitHubTemplates` checks templates against each other.

`PullRequestTemplate` is not `projen.github.PullRequestTemplate`. projen's
`NodeProject` and the project types built on it write
`.github/pull_request_template.md` by default; pass `pullRequestTemplate: false`
to declare it here instead.

This package owns `ISSUE_TEMPLATE/`, `pull_request_template.md` and
`PULL_REQUEST_TEMPLATE/`, and nothing else in `.github/`.

## Serialization

GitHub reads YAML 1.1, where `Yes` is a Boolean, `1:20` is the integer 80 and
`2001-12-15` is a date. Forms, the chooser and Markdown front matter are written
as YAML 1.1, so every value comes back as the string you declared. Prettier
ignores `.github/` in projects using `@langri-sha/projen-project`, so this
output is what gets committed. If your Prettier does cover `.github/`, it may
rewrap Markdown templates.

Forms and the chooser are `ObjectFile`s, so `addOverride()` and `patch()` reach
keys the types lack. They are validated again after overrides apply.

## Validation

Synthesis fails on what GitHub documents as an [error][validation errors], since
nothing else checks a form before someone tries to open an issue with it:

- a path GitHub would not read, or that collides with another once case is
  ignored, and two default PR templates, or two named ones of the same name
- a `name` of 3 characters or fewer, which GitHub silently leaves out of the
  chooser, or one used by another issue template
- a missing or empty required key, an unknown key, or a blank string
- a form with no input fields, duplicate or malformed `id`s, a duplicate `label`
  that no `id` tells apart, or "password" in an input's label
- dropdown `options` that are empty, repeated, or include the reserved `None`,
  or `n/a` alongside a `default`, and a `default` out of range
- a contact link that is not `http://` or `https://`

A single `ISSUE_TEMPLATE.md`, which GitHub retired on 2025-03-30, draws a
warning.

## Ownership

Templates are generated read-only on every synth. To write one once and edit it
by hand from then on, pass `managed: false` to a Markdown template, and it is
seeded with `projen.SampleFile`. To keep projen away from a template altogether,
list its path in `unmanaged`:

```ts
new GitHubTemplates(project, {
  files: {
    'docs/PULL_REQUEST_TEMPLATE/release.md': {
      body: '## Release\n',
      managed: false,
    },
  },
  unmanaged: ['.github/ISSUE_TEMPLATE/00-security.md'],
})
```

Both are safe for a file projen has never generated. For one it has, projen's
cleanup deletes whatever the previous synth wrote and this one does not, before
anything else runs, edits included. So synthesis fails instead. To hand such a
file over, move it aside, run projen, and move it back. If it is already gone,
`git show HEAD:<path>` recovers it.

Markdown templates carry no marker by default, because GitHub copies them into
every issue or pull request. Pass `marker: true` for an HTML comment.

## Caveats

- Templates take effect only on the default branch.
- GitHub silently drops `labels` the repository lacks.
- Named PR templates are not applied by themselves; link to them with
  `?template=<name>.md`.
- Any file in a repository's `.github/ISSUE_TEMPLATE/` turns off every issue
  template from the organization's [`.github` repository][defaults].
- Templates in a root or `docs/` `ISSUE_TEMPLATE/` directory work through
  `?template=` but never appear in the chooser, and are not offered here, nor
  are `.txt` PR templates.
- `validations.required` works on private repositories, though the form schema
  reference still says otherwise.
- The issue form types are written by hand from GitHub's documentation, so
  GitHub's additions reach them only through a release. Use `addOverride()` in
  the meantime.

## See also

- [Syntax for issue forms][issue forms]
- [Syntax for GitHub's form schema][form schema]
- [Configuring issue templates][chooser]
- [Creating a pull request template][pull request templates]
- [Common validation errors when creating issue forms][validation errors]

[chooser]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository
[defaults]:
  https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file
[form schema]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema
[issue forms]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
[projen]: https://projen.io/
[pull request templates]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository
[validation errors]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/common-validation-errors-when-creating-issue-forms
