# `@langri-sha/projen-github-templates` — implementation proposal

Design lane for [langri-sha/projen#94]. No package code is written yet; this
document decides what gets built, what does not, and why.

**Revision 2.** The first draft was reviewed adversarially (`gpt-5.6-sol`, max
effort) and did not survive intact: the serializer fix was incomplete, the
ownership guarantees were overstated, and several GitHub platform facts were
stale or wrong. Every correction below was independently re-verified before
being folded in. §13 logs what changed and what the first draft got wrong.

Claims marked **[verified]** were reproduced locally; the command and date are
given.

---

## 1. Executive recommendation

Build `@langri-sha/projen-github-templates` as a small family of file components
plus one aggregate `Component`, following the shape of
`@langri-sha/projen-husky` (several files, one component) rather than
`@langri-sha/projen-renovate` (one file, schema-derived types).

The four decisions that matter:

1. **Serialize as YAML 1.1.** `projen.YamlFile` emits YAML 1.2. GitHub coerces
   scalars per YAML 1.1, where `Yes`, `1:20`, `12:34:56`, `2001-12-15` and
   `12_000` are a Boolean, two integers, a date and an integer respectively.
   `YAML.stringify(obj, { version: '1.1' })` quotes the entire ambiguity set;
   nothing narrower is safe (§2.7).

2. **Hand-write the Issue Forms types — but for authority, not necessity.**
   SchemaStore's schema _can_ be made to generate a proper discriminated union
   by rewriting its `if`/`then` branches to `oneOf`. It is still the wrong
   choice, for reasons that are about source authority and output quality rather
   than impossibility (§2.6, §11.1).

3. **One flat `files` map keyed by repository-relative path.** The path is the
   only reliable discriminator GitHub itself uses, and the package must validate
   paths regardless. This replaces the first draft's five kind-keyed options
   plus a directory enum (§3.3).

4. **Treat ownership as a transition problem, not a marker problem.** projen's
   cleanup deletes any file that was in the previous `.projen/files.json` and is
   not in the new one. Moving a template from managed to unmanaged, or from
   managed to `SampleFile`, **deletes the file and any hand edits with it**.
   That is the real risk, and it needs explicit detection — not a `marker`
   policy (§3.4).

And one non-decision: **ship zero content defaults.** No default bug-report
form, no default PR checklist, no default labels. The issue is explicit about
this, and it is the one place the package should diverge from
`#configureRenovate`, which is defaults-heavy.

### v1 scope

| Capability                                                                  | Path                                                  | Status                                  |
| --------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| Issue Forms (YAML)                                                          | `.github/ISSUE_TEMPLATE/<name>.yml`                   | **in**                                  |
| Form elements `markdown`, `input`, `textarea`, `dropdown`, `checkboxes`     | —                                                     | **in**                                  |
| Form element `upload`                                                       | —                                                     | **in**, JSDoc-flagged as public preview |
| Markdown issue templates                                                    | `.github/ISSUE_TEMPLATE/<name>.md`                    | **in**                                  |
| Template chooser                                                            | `.github/ISSUE_TEMPLATE/config.yml`                   | **in**                                  |
| Default PR template                                                         | `.github/`, root, or `docs/`                          | **in**                                  |
| Named PR templates                                                          | `PULL_REQUEST_TEMPLATE/<name>.md` in any of the three | **in**                                  |
| YAML 1.1 serialization                                                      | —                                                     | **in**                                  |
| Canonical path validation (traversal, separators, case-folding, collisions) | —                                                     | **in**                                  |
| Documented-fatal validation rules only (§5)                                 | —                                                     | **in**                                  |
| Ownership transition detection                                              | —                                                     | **in**                                  |
| `managed: false` write-once escape hatch                                    | Markdown templates only                               | **in**                                  |
| Opt-in wiring from `@langri-sha/projen-project`                             | —                                                     | **in**                                  |

### Non-goals

| Excluded                                                                                             | Reason                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL-only issue template locations (root and `docs/` `ISSUE_TEMPLATE/`)                               | These **do** work via `?template=` (§2.1) but never appear in the chooser, so they are a different feature with a different failure mode. Excluded deliberately, and the readme says so — the first draft wrongly claimed they do not work at all. |
| `.txt` PR templates                                                                                  | Documented as supported. Excluded because Markdown is the only sane authoring format and supporting both doubles the path-matching surface for no gain. Stated as a decision, not an oversight.                                                    |
| Discussion category forms (`.github/DISCUSSION_TEMPLATE/`)                                           | Same form schema, different product surface. The serializer and validators are reusable; add in v2.                                                                                                                                                |
| `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `FUNDING.yml`, `SUPPORT.md`, `GOVERNANCE.md` | Community health files, not templates. Naming the package `projen-github-templates` rather than `projen-github` is what keeps that boundary honest.                                                                                                |
| Workflows, Dependabot, repository settings                                                           | Permanently out of scope. Not "v2" — a different package.                                                                                                                                                                                          |
| Legacy `.github/ISSUE_TEMPLATE.md`                                                                   | **Retired by GitHub on 30 March 2025**; repositories still using it fall back to a blank issue form (§2.1).                                                                                                                                        |
| Rails `parameterize` "labels are too similar" heuristic                                              | Deferred (§5, §11.9). Exact duplicate labels are still checked; fuzzy similarity is not.                                                                                                                                                           |
| Automatic ordering / filename numbering                                                              | Filename-driven policy. Documented, not enforced.                                                                                                                                                                                                  |
| Schema drift "canary" test                                                                           | Cut. A fixture-based test detects fixture edits, not upstream drift (§11.10).                                                                                                                                                                      |
| Label / issue-type creation                                                                          | GitHub silently drops a `labels:` entry that does not exist. Repo-settings concern (Terraform, in this garden), and unknowable at synth time.                                                                                                      |

---

## 2. GitHub platform facts and caveats

### 2.1 Issue template locations

- The **template chooser** reads only `.github/ISSUE_TEMPLATE/`, on the
  **default branch**. "If you create a template in another branch, it will not
  be available for collaborators to use."
  ([about-issue-and-pull-request-templates])
- **Correction to the first draft.** Root and `docs/` are not dead. GitHub's
  docs state: _"The `template` query parameter works with templates stored in an
  `ISSUE_TEMPLATE` subdirectory within the root, `docs/` or `.github/` directory
  in a repository."_ ([creating-an-issue#url-query]) Those templates are
  reachable by URL but never listed in the chooser. v1 excludes them by choice,
  and the readme must say _"not offered"_, not _"not supported"_.
- "Issue template filenames are not case sensitive, and need a _.md_ extension.
  Issue templates created with issue forms need a _.yml_ extension."
  ([about-issue-and-pull-request-templates]) SchemaStore's `fileMatch` also
  lists `.yaml`, but it is undocumented. **v1 emits `.yml` only.**
- Case-insensitivity is a validation obligation for us: `Bug.yml` and `bug.yml`
  are the same template to GitHub and two distinct keys to a JS object. The
  package must reject case-folded collisions itself.
- Chooser config is exactly `.github/ISSUE_TEMPLATE/config.yml`.
  ([configuring-issue-templates])
- **`ISSUE_TEMPLATE.md` is retired.** GitHub's changelog: _"The legacy
  ISSUE_TEMPLATE.md feature will be retired on March 30, 2025… After March 30,
  2025, repositories still using ISSUE_TEMPLATE.md will default to a blank issue
  form."_ ([issues-changelog-2025-02-18]) The first draft called it
  "undocumented legacy" — it is removed, which is a stronger reason not to model
  it, and a reason to _warn_ if a consumer's repo still has one.

### 2.2 Ordering

Templates "are listed alphanumerically and grouped by filetype, with YAML files
appearing before Markdown files." With 10+ templates, `11-bug.yml` sorts between
`1-feature.yml` and `2-support.yml`; zero-pad to fix.
([configuring-issue-templates#changing-the-order-of-templates])

Two consequences: filenames are load-bearing, so the consumer must control them
literally; and a YAML form always sorts above a Markdown template regardless of
prefix. Documented, not validated.

### 2.3 The chooser (`config.yml`)

```yaml
blank_issues_enabled: false
contact_links:
  - name: GitHub Community Support
    url: https://github.com/orgs/community/discussions
    about: Please ask and answer questions here.
```

`blank_issues_enabled: false` does **not** remove the blank-issue option for
Write/Maintain/Admin — they still see it labelled "Maintainers only".
([configuring-issue-templates#configuring-the-template-chooser])

SchemaStore's `github-issue-config.json` constrains `contact_links[].url` to
`^https?://`, requires all three of `name`, `url`, `about`, and sets
`minItems: 1`.

### 2.4 Issue Forms top-level schema

Required: `name`, `description`, `body`. Optional: `title`, `labels`,
`assignees`, `type`, `projects`. `labels`/`assignees`/`projects` accept an array
**or** a comma-delimited string. `projects` is `PROJECT-OWNER/PROJECT-NUMBER`
and requires the _issue opener_ to hold write access.
([syntax-for-issue-forms#top-level-syntax])

Two silent-failure traps:

- **`name` must be more than 3 characters, or "the template won't be shown when
  creating an issue"** — no error surface anywhere.
  ([configuring-issue-templates#creating-issue-forms])
- **`name` must be unique across all templates, including Markdown ones.**
  ([syntax-for-issue-forms#top-level-syntax])

Caveat carried into the API design: the array form of `labels`/`assignees` is
documented for **issue forms**. For **Markdown template frontmatter** the docs
show comma-delimited strings and do not state that arrays are equivalent. v1
accepts arrays in both and serializes frontmatter arrays as YAML sequences,
which matches GitHub's own sample template — but this is the one API surface
worth re-verifying against a live repository before publishing.

### 2.5 Form element schema

Every element: `type` (required), `attributes` (required), `id` (optional,
forbidden on `markdown`), `validations` (optional).
([syntax-for-githubs-form-schema])

| `type`       | Required attributes                                 | Optional attributes                             | Validations          |
| ------------ | --------------------------------------------------- | ----------------------------------------------- | -------------------- |
| `markdown`   | `value`                                             | —                                               | —                    |
| `input`      | `label`                                             | `description`, `placeholder`, `value`           | `required`           |
| `textarea`   | `label`                                             | `description`, `placeholder`, `value`, `render` | `required`           |
| `dropdown`   | `label`, `options`                                  | `description`, `multiple`, `default`            | `required`           |
| `checkboxes` | `label`, `options[].label` (+ `options[].required`) | `description`                                   | `required`           |
| `upload`     | `label`                                             | `description`                                   | `required`, `accept` |

Constraints worth encoding:

- `id`: "Can only use alpha-numeric characters, `-`, and `_`. Must be unique in
  the form definition."
- `dropdown.options`: "Cannot be empty and all choices must be distinct."
  `default` is an _index_; "When a default option is specified, you cannot
  include 'None' or 'n/a' as options." `none` is reserved unconditionally.
- `textarea.render` must be a language known to Linguist.
- `upload` sits behind the `issue-form-upload` version flag with per-category
  size limits (images 10 MB; archives, documents, text 25 MB; videos 100 MB).
  The docs place `accept` under **`validations`**, not `attributes` — mirror the
  docs, odd as it reads.

**`validations.required` is no longer public-repository-only.** The docs
reusable still says "Only for public repositories", but GitHub shipped it for
private repositories on 18 February 2025: _"You can now specify required fields
on issue forms in private repositories."_ ([issues-changelog-2025-02-18]) The
first draft repeated the stale line. The JSDoc should describe the _behavior_,
note the docs conflict, and not tell people a working feature is unavailable.

### 2.6 The documented validation errors are the real spec

[common-validation-errors] is GitHub's server-side validator described in prose,
and it is the most useful page for this package. Rules worth enforcing locally:
required `name`; non-empty string values; unknown keys rejected; forbidden
Boolean-coercible keys; body must contain ≥1 non-`markdown` field; unique `id`s;
unique `label`s; unique checkbox option labels; `options` unique, non-empty, no
reserved `none`, no Booleans; `label` must not contain forbidden words.

Two places the first draft misread this page:

- **Duplicate labels are legal when disambiguated by `id`.** The page says
  outright: _"Input fields can also be differentiated by their `id` attribute.
  If duplicate `label` attributes are required, you can supply at least one `id`
  to differentiate two elements with identical labels."_ And for checkbox
  collisions: _"you can supply an `id` to any clashing top-level elements."_ The
  first draft's unconditional uniqueness errors would have rejected valid forms.
- **`password` is a documented fatal error**, not a heuristic. Erroring on the
  one documented term is consistent with the severity policy; guessing the rest
  of the (unpublished) blocklist is not. The first draft warned on it, which
  contradicted its own policy.

**[verified] SchemaStore's schema generates a useless type as published — but
that is fixable, and the first draft's conclusion was overstated.**

Compiling `github-issue-forms.json` unmodified through
`json-schema-to-typescript@15.0.4` yields:

```ts
export type FormItem = { [k: string]: unknown } & { [k: string]: unknown } & {
  [k: string]: unknown
} & { [k: string]: unknown } & { [k: string]: unknown } & {
  [k: string]: unknown
}
```

The mechanism is not "`allOf` is ignored" — `allOf` becomes that six-way
intersection. What is dropped is `if`/`then`, which the compiler does not
support, so each branch collapses to its empty base. Rewriting the six
`if`/`then` pairs into a `oneOf` with each `if.properties.type.const` copied
into its branch produces exactly what you would want:

```ts
export type FormItem =
  Markdown | Textarea | Input | Dropdown | Checkboxes | Upload
```

So the first draft's "hand-written union or no types at all" was wrong. The
transform is small, and `schemastore-to-typescript` already carries precedent
for exactly this kind of pre-compile fixup (`sanitizeSchema`, added for
Renovate's `$ref`-plus-`additionalProperties` node).

The recommendation does not change, but the reasons do — see §11.1.

> Reproduced with `json-schema-to-typescript@15.0.4` against
> `SchemaStore/schemastore@master:src/schemas/json/github-issue-forms.json`,
> 2026-07-28.

### 2.7 **[verified]** Serialize as YAML 1.1, and do not try to be clever

`projen.YamlFile` serialises with `yaml@2`, which emits **YAML 1.2**. GitHub
coerces scalars per **YAML 1.1**. The same document, parsed both ways:

| Emitted (YAML 1.2, unquoted)  | Read back under YAML 1.1                     |
| ----------------------------- | -------------------------------------------- |
| `Yes` `No` `y` `n` `on` `off` | `true` `false` `true` `false` `true` `false` |
| `1:20`                        | `80` (sexagesimal integer)                   |
| `12:34:56`                    | `45296`                                      |
| `2001-12-15`                  | a `Date`                                     |
| `2001-12-15T02:59:43.1Z`      | a timestamp                                  |
| `12_000`                      | `12000`                                      |
| `Maybe` `0x1A` `.inf`         | unchanged (already quoted or unambiguous)    |

The first draft proposed a `YAML.visit` pass forcing `QUOTE_DOUBLE` on scalars
matching GitHub's documented Boolean list. **That fix is incomplete and would
have shipped a false sense of safety**: it covers the first row and leaves every
other row silently mutating. A `1:20` in a placeholder, a `12:34:56` in a
description, an ISO date in a `value` — all corrupted, and the proposed test
(round-trip `['Yes','No','Maybe']`) would have passed.

The correct fix is one option, not a visitor:

```ts
YAML.stringify(JSON.parse(json), { indent: 2, lineWidth: 0, version: '1.1' })
```

`yaml` then applies YAML 1.1 resolution when deciding whether a plain scalar is
safe, and quotes the whole ambiguity set. Round-tripping the 1.1-emitted
document under `{ version: '1.1' }` returns every value as the string it was
declared as.

Two honesty notes on the framing:

- The first draft asserted "GitHub's validator is Ruby/Psych". That is an
  inference. What is _documented_ is the coercion behavior
  ([common-validation-errors]: "YAML parses certain strings as `Boolean`
  values", "`options` must not include booleans"). A local Ruby 3.4.8 / Psych
  run reproduces the same coercions, which is corroboration, not proof of
  GitHub's implementation. The design does not depend on which parser it is —
  only on the documented YAML 1.1 behavior.
- `YAML.visit` itself was not the problem: it does reach keys and nested
  scalars, block scalars stay strings, and anchors/multi-document are irrelevant
  because `ObjectFile`'s `JSON.stringify`/`JSON.parse` round trip yields one
  alias-free document. The visitor's _predicate_ was too narrow.
  `version: '1.1'` moves the predicate into the library, where it is maintained.

> Reproduced with `yaml@2.9.0` and `ruby 3.4.8` / `Psych`, 2026-07-28.

### 2.8 Pull request templates

- Locations: repository root, `docs/`, or `.github/`, named
  `pull_request_template.md`. "Pull request template filenames are not case
  sensitive, and can have an extension such as _.md_ or _.txt_."
  ([about-issue-and-pull-request-templates], [creating-a-pull-request-template])
- Multiple templates go in a `PULL_REQUEST_TEMPLATE/` subdirectory of any of
  those three locations, selected with the `template` query parameter
  ([using-query-parameters]). **They are not applied automatically** — only the
  singular file is.
- Default branch requirement applies.
- Issue Forms are **not** supported for pull requests
  ([syntax-for-issue-forms]). PR templates are plain Markdown, full stop.

### 2.9 Org-wide defaults, and the caveat that matters for this garden

A public `.github` repository supplies defaults for every repo in the account
that lacks its own file, resolved `.github/` → root → `docs/`.
([creating-a-default-community-health-file])

The caveat: **"if a repository has any files in its own `.github/ISSUE_TEMPLATE`
folder, such as issue templates or a `config.yml` file, none of the contents of
the default `.github/ISSUE_TEMPLATE` folder will be used."** All-or-nothing per
repository, not a per-file merge.

For `langri-sha/*`: adding _one_ repo-local contact link silently discards
_every_ org default. Unknowable to the component; readme caveat, and an argument
for the aggregate's docs to make "you now own the whole folder" loud.

Same page: a template's `labels` must exist in the `.github` repo _and_ every
repo the template is used from; and issue/PR template defaults require the
`.github` repo to be **public** (internal is not enough on GHEC/GHES).

---

## 3. Design decisions

### 3.1 Typed Issue Form API, or a generic file abstraction?

**Call: a hand-written discriminated union.**

The "it's just files, ship `GitHubFile(project, path, contents)`" answer fails
on the same ground it always does: **there is no local feedback loop.** Nothing
in `pnpm exec projen`, `eslint`, `prettier`, `tsc`, or CI parses an issue form.
The first signal of a malformed form is a contributor failing to open an issue —
or, per §2.4, a template silently _not shown_ because its `name` is three
characters.

The schema is also small and its churn additive: five element types (six with
`upload`), ≤4 attributes each, one validation key. ~90 lines of TypeScript.
GitHub's changes here have been additive (`type`, `projects`, `upload`), which
an optional-property union absorbs.

The repo already hand-writes wire-shaped option types with full JSDoc —
`EditorConfigOptions` mirrors `.editorconfig`'s snake_case keys by hand. Not a
new precedent.

Honest cost: GitHub's form schema is "in public preview and subject to change",
so the union will drift. Mitigations: the union is additive-tolerant, and
`ObjectFile.addOverride()` / `patch()` remain a per-file escape hatch needing no
package release. The first draft also proposed a schema "canary" test; that has
been cut, because it could not have worked (§11.10). Drift detection is a manual
review obligation, and the readme should say so rather than imply automation.

### 3.2 How should bodies be modelled — builders, raw, or objects?

**Call: plain object literals against the union. No builders. Raw only where the
content is genuinely free-form.**

Rejected: fluent builders and static factories. They restate the union in a
second place that must move in lockstep, and buy no safety the union does not
already give — `{ type: 'dropdown' }` already forces `options`. Every component
in this repo takes a plain options object.

Raw is correct for **Markdown issue template bodies**, **PR templates**, and
`markdown` elements' `attributes.value` — all free-form prose.

Raw is _not_ offered for issue forms: no `rawYaml: string`. Anyone who needs it
can construct a `projen.YamlFile` directly, but they should know they are opting
out of §2.7's serialization rather than be handed a footgun with this package's
name on it.

Markdown frontmatter is typed (`name`, `about`, `title`, `labels`, `assignees`,
`type`) and emitted through the same YAML 1.1 writer, so
`title: '[BUG] <title>'` cannot corrupt the document.

### 3.3 Discrimination: one flat path-keyed map

**Call: option B — a single `files` map keyed by canonical repository-relative
path, with the kind selected from the path and strictly validated.**

The first draft chose separate keys per kind (`issueForms`, `issueTemplates`,
`chooser`, `pullRequestTemplate`, `pullRequestTemplates`, plus
`pullRequestTemplateDirectory`). That is six options that all mean "a template",
a singular/plural pair distinguished by one letter, and a directory enum that
forces the default and named PR templates into the _same_ location — which
GitHub does not require.

Path-keyed fixes all of it:

```ts
files: {
  '.github/ISSUE_TEMPLATE/config.yml':      { /* chooser */ },
  '.github/ISSUE_TEMPLATE/01-bug.yml':      { /* issue form */ },
  '.github/ISSUE_TEMPLATE/02-proposal.md':  { /* markdown template */ },
  '.github/pull_request_template.md':       { /* PR template */ },
  'docs/PULL_REQUEST_TEMPLATE/release.md':  { /* named PR template */ },
}
```

Why this is the right model and not just fewer keys:

- **The path is the discriminator GitHub itself uses.** `.yml` vs `.md` vs
  `config.yml` vs which directory — every one of GitHub's behavioral
  distinctions is encoded in the path. Any other API paraphrases it.
- **Path validation is mandatory anyway.** Traversal, separators, case-folded
  collisions, reserved `config.yml`, the `.yml`-only rule — all needed
  regardless. Selecting the kind from the same parse is free.
- **Ownership becomes expressible.** `unmanaged` uses the same full paths and
  can cover PR templates, which the kind-keyed version could not.
- **Errors name the artifact.** "`.github/ISSUE_TEMPLATE/bug.yml`: …" beats
  "`issueForms['bug']`: …".
- **New supported paths do not need new options.** Adding root/`docs`
  `ISSUE_TEMPLATE/` later is a matcher entry, not an API change.

The cost, stated plainly:
`Record<string, IssueForm | IssueTemplate | Chooser | PullRequestTemplate>` will
not stop you putting a Markdown body under a `.yml` key. The union members
overlap structurally (`name`, `title`, `labels`, `assignees` are common), so
**the path decides and the shape is then checked strictly** — a stated rule, not
a type-system guarantee. That check is one runtime rule the package was going to
write anyway.

**[verified] The compile-time variant works, and works without generics.** A
mapped type over a closed template-literal union type-checks all three failure
modes under `tsc 5.9.3 --strict`, with `ProjectOptions` staying non-generic:

```ts
type TemplatePath =
  | '.github/ISSUE_TEMPLATE/config.yml'
  | `.github/ISSUE_TEMPLATE/${string}.yml`
  | `.github/ISSUE_TEMPLATE/${string}.md`
  | '.github/pull_request_template.md'
  | `.github/PULL_REQUEST_TEMPLATE/${string}.md`
// …root and docs/ variants

type Files = { readonly [P in TemplatePath]?: ForPath<P> }
```

Wrong value shape _and_ a typo'd path (`ISSUE_TEMPLATES/`) both error. This
invalidates the first draft's stated reason for rejecting it — the
self-referential generic was never necessary. It is still not the
recommendation, for different reasons; see §11.5.

### 3.4 Ownership — the transitions are the hazard

The first draft claimed CI's re-synth-and-check-dirty-tree was a sufficient
overwrite guard. **That claim was wrong**, and the failure modes are worse than
"a marker would have helped".

**[verified] against projen 0.86.5:**

1. **A local edit to a managed file is silently reverted.** Re-synthesis
   restores generated content. If the edit was uncommitted, the tree ends clean
   and CI has nothing to detect. CI is a _committed-drift detector after
   mutation_, not a guard.
2. **`managed: true → false` deletes the file, then re-seeds it.** projen's
   `cleanup()` computes `findOrphanedFiles(dir, oldManifest, newFiles)` from
   `.projen/files.json` and `rmSync`s the difference. `SampleFile` is a
   `Component`, not a `FileBase`, so it never appears in `project.files` and
   therefore never appears in `newFiles`. The old managed file is orphaned,
   deleted, and the seed is written over the hole. **Every hand edit is lost.**
3. **Removing a template and listing it in `unmanaged` deletes it** — same
   mechanism, and there is no replacement write at all.
4. **`SampleFile` + a `FileBase` at the same path does not trip projen's
   duplicate-path check.** `FileBase`'s constructor calls `root.tryFindFile()`,
   which only sees `FileBase` instances. Duplicate detection is _not_ free for
   write-once files, contrary to the first draft's §5.
5. **`0444` is not a durable guard.** Git does not track the read bit, so a
   fresh clone has writable templates regardless.

What the design must therefore do:

- **Detect ownership transitions in `preSynthesize()`, before cleanup runs.**
  Read the previous `.projen/files.json`; if a path it lists is about to become
  unmanaged or `SampleFile`-managed, **throw** with migration instructions
  ("`git mv` it out, or `git show HEAD:<path>` after synth to recover") rather
  than letting cleanup delete it.
- **Check `unmanaged` and `SampleFile` paths against `root.tryFindFile()`
  explicitly**, since projen will not.
- **Use full repository-relative paths in `unmanaged`**, covering PR templates
  too — which the flat map (§3.3) makes natural.
- **Validate the resolved object, not the constructor options.** `ObjectFile`
  applies `addOverride`/`patch` _after_ the resolver, in `synthesizeContent`.
  Constructor-time validation cannot see them, so an override could change a
  `name` or drop a `body` after every cross-file check has passed. Validation
  must run on the final object.

Markers, by file kind — unchanged from the first draft, and still right, but now
correctly framed as _provenance signalling_, not as protection:

| File                  | Marker                                   | Rationale                                                                                                  |
| --------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `*.yml` issue form    | `# ~~ Generated by projen…` (default on) | YAML comment; GitHub never renders it.                                                                     |
| `config.yml`          | same                                     | same                                                                                                       |
| `*.md` issue template | **off by default**, opt-in HTML comment  | The body is copied verbatim into every issue.                                                              |
| PR template           | **off by default**, opt-in HTML comment  | Same, for every PR body. `projen.github.PullRequestTemplate` sets `marker: false` for exactly this reason. |

`linguist-generated` still lands automatically via `annotateGenerated()` for
committed `FileBase` files (and _not_ for `SampleFile`, which is another
observable difference across the `managed` boundary worth documenting).

### 3.5 Where validation runs

- **Constructor** — intrinsic per-file rules, so the stack points at the
  offending entry in `.projenrc.ts`.
- **`preSynthesize()`** — cross-file: `name` uniqueness across forms and
  Markdown templates, case-folded path collisions, `unmanaged` collisions,
  ownership transitions (§3.4). Implemented on the aggregate; standalone file
  components skip these, which is documented rather than papered over with a
  hidden global registry.
- **`synthesizeContent()`** — re-run the intrinsic rules against the resolved
  object, after overrides and patches (§3.4).
- **Serializer** — YAML 1.1. A transformation, not a check.

**Severity policy: errors for documented-fatal rules; nothing else.** The first
draft carried five warnings; four are cut (§11.9) because a warning nobody acts
on is noise, and two of them (`password`, label uniqueness) were miscategorised
outright. What remains as a warning: a detected legacy `ISSUE_TEMPLATE.md` in
the repo, which is now dead weight (§2.1).

### 3.6 Composition with `@langri-sha/projen-project`

```ts
#configureGitHubTemplates({ githubTemplates }: ProjectOptions) {
  if (!githubTemplates || this.parent) {
    return
  }

  this.githubTemplates = new GitHubTemplates(this, githubTemplates)
}
```

- **Opt-in.** Absent key → no component, no files.
- **Root-only.** A monorepo has one `.github/`. Same guard as `beachball`,
  `husky`, `editorConfig`, `renovate`, `prettier`, `jestConfig`.
- **No `deepMerge(defaults, options)`.** Every other `#configure*` merges
  opinionated defaults; this one passes options through untouched.
  `#configureRenovate` ships ~80 lines of policy because Renovate config _is_
  policy. Issue templates are _content_, and the issue is explicit: "Do not
  force a particular issue taxonomy, labels, wording, or PR checklist."

`.gitignore` needs no change (`!.github/` already, plus `FileBase`'s per-file
negation). Prettier needs none either: the default `ignorePatterns` is
`['.*', 'dist/']` and `.*` matches `.github/`, so `LintSynthesized` skips these
files — **which means the serializer's output is the committed output** and must
be canonical on its own. A consumer whose Prettier config _does_ cover
`.github/` would get `proseWrap: 'always'` rewrapping their Markdown templates;
readme caveat.

### 3.7 Package name and boundary

Keep `@langri-sha/projen-github-templates`. `projen-github` invites workflows,
Dependabot, and repository settings to accrete into a package whose peer surface
is currently just `projen`. `projen-issue-templates` excludes PR templates,
which share the ownership machinery.

The readme states the boundary as **permanent**: this package owns
`ISSUE_TEMPLATE/**`, `pull_request_template.*`, and `PULL_REQUEST_TEMPLATE/**`.
Nothing else in `.github/`, ever.

**Naming collision, noted not avoided:** `projen` exports
`github.PullRequestTemplate`. This repo already ships a `License` colliding with
`projen.License`, so the precedent is to keep the natural name and document it.

---

## 4. Public API surface

### 4.1 Module layout

```
packages/projen-github-templates/src/
  index.ts                     # barrel
  github-templates.ts          # GitHubTemplates (aggregate Component)
  issue-form.ts                # IssueForm
  issue-template.ts            # IssueTemplate (Markdown)
  issue-template-chooser.ts    # IssueTemplateChooser (config.yml)
  pull-request-template.ts     # PullRequestTemplate
  lib/
    form-schema.ts             # hand-written element union
    yaml-file.ts               # GitHubYamlFile — ObjectFile + YAML 1.1
    paths.ts                   # canonicalization, kind selection, collisions
    validate.ts                # rule implementations
```

### 4.2 Form element union (`lib/form-schema.ts`)

```ts
/** A form element. Mirrors GitHub's form schema wire format. */
export type IssueFormElement =
  | MarkdownElement
  | InputElement
  | TextareaElement
  | DropdownElement
  | CheckboxesElement
  | UploadElement

export interface Validations {
  /**
   * Prevents form submission until the element is completed.
   *
   * @remarks GitHub's docs still say "only for public repositories"; required
   * fields shipped for private repositories on 2025-02-18.
   */
  readonly required?: boolean
}

/** Static Markdown shown in the form. Not submitted, and cannot carry an `id`. */
export interface MarkdownElement {
  readonly type: 'markdown'
  readonly attributes: { readonly value: string }
}

/** A single-line text field. */
export interface InputElement {
  readonly type: 'input'
  /** Alphanumeric, `-` and `_` only. Unique within the form. */
  readonly id?: string
  readonly attributes: {
    readonly label: string
    readonly description?: string
    readonly placeholder?: string
    readonly value?: string
  }
  readonly validations?: Validations
}

/** A multi-line text field. */
export interface TextareaElement {
  readonly type: 'textarea'
  readonly id?: string
  readonly attributes: {
    readonly label: string
    readonly description?: string
    readonly placeholder?: string
    readonly value?: string
    /** Formats submissions as a code block. Must be a Linguist language. */
    readonly render?: string
  }
  readonly validations?: Validations
}

/** A dropdown menu. */
export interface DropdownElement {
  readonly type: 'dropdown'
  readonly id?: string
  readonly attributes: {
    readonly label: string
    readonly description?: string
    readonly multiple?: boolean
    /** Non-empty and distinct. `none` is reserved. */
    readonly options: readonly string[]
    /** Index into `options`. Excludes `none` and `n/a` as options. */
    readonly default?: number
  }
  readonly validations?: Validations
}

/** A set of checkboxes. Nested options cannot carry an `id`. */
export interface CheckboxesElement {
  readonly type: 'checkboxes'
  readonly id?: string
  readonly attributes: {
    readonly label: string
    readonly description?: string
    readonly options: readonly {
      readonly label: string
      readonly required?: boolean
    }[]
  }
  readonly validations?: Validations
}

/**
 * A file upload field.
 *
 * @remarks GitHub public preview, gated per plan. `accept` is documented under
 * `validations`, not `attributes`.
 */
export interface UploadElement {
  readonly type: 'upload'
  readonly id?: string
  readonly attributes: {
    readonly label: string
    readonly description?: string
  }
  readonly validations?: Validations & {
    /** Comma-separated extension list, e.g. `".png,.log,.zip"`. */
    readonly accept?: string
  }
}
```

### 4.3 Per-artifact options

```ts
/** A GitHub Issue Form. Written to a `.github/ISSUE_TEMPLATE/*.yml` path. */
export interface IssueFormOptions {
  /** Shown in the chooser. Must exceed 3 characters and be unique. */
  readonly name: string
  readonly description: string
  readonly body: readonly IssueFormElement[]
  readonly title?: string
  readonly labels?: readonly string[] | string
  readonly assignees?: readonly string[] | string
  /** Organization-level issue type. */
  readonly type?: string
  /** `PROJECT-OWNER/PROJECT-NUMBER`. The issue opener needs write access. */
  readonly projects?: readonly string[] | string
}

/** A Markdown issue template. Written to a `.github/ISSUE_TEMPLATE/*.md` path. */
export interface IssueTemplateOptions {
  readonly name: string
  /** Required for the community profile checkmark. */
  readonly about: string
  readonly title?: string
  readonly labels?: readonly string[] | string
  readonly assignees?: readonly string[] | string
  readonly type?: string
  /** Template body. Markdown, verbatim. */
  readonly body: string | readonly string[]
  /**
   * Seed once and never overwrite (`projen.SampleFile`).
   *
   * @remarks Switching an existing managed file to `false` deletes it during
   * projen's cleanup before the seed is written. The component detects that
   * transition and throws; see the readme's migration note.
   * @default true
   */
  readonly managed?: boolean
  /**
   * Emit an HTML-comment provenance marker. Visible in issue bodies.
   * @default false
   */
  readonly marker?: boolean
}

/** The template chooser. Only valid at `.github/ISSUE_TEMPLATE/config.yml`. */
export interface IssueTemplateChooserOptions {
  readonly blankIssuesEnabled?: boolean
  readonly contactLinks?: readonly {
    readonly name: string
    /** Must be `http://` or `https://`. */
    readonly url: string
    readonly about: string
  }[]
}

export interface PullRequestTemplateOptions {
  readonly body: string | readonly string[]
  readonly managed?: boolean
  readonly marker?: boolean
}
```

`IssueTemplateChooserOptions` is the one place the API departs from GitHub's
wire names (`blankIssuesEnabled` / `contactLinks` rather than
`blank_issues_enabled` / `contact_links`): a two-key config with a hand-written
mapping, where camelCase reads correctly beside every other `*Options` here.
Issue-form keys are already camel-free, and element `attributes` stay verbatim
so they can be pasted from GitHub's docs.

### 4.4 The aggregate

```ts
export type GitHubTemplateOptions =
  | IssueFormOptions
  | IssueTemplateOptions
  | IssueTemplateChooserOptions
  | PullRequestTemplateOptions

export interface GitHubTemplatesOptions {
  /**
   * Templates keyed by repository-relative path. The path selects the kind:
   *
   * - `.github/ISSUE_TEMPLATE/config.yml` — the chooser
   * - `.github/ISSUE_TEMPLATE/*.yml`      — an Issue Form
   * - `.github/ISSUE_TEMPLATE/*.md`       — a Markdown issue template
   * - `{.github,docs,}/pull_request_template.md`        — the default PR template
   * - `{.github,docs,}/PULL_REQUEST_TEMPLATE/*.md`      — a named PR template
   *
   * Any other path is an error. The value is validated strictly against the
   * kind the path selects.
   */
  readonly files?: { readonly [path: string]: GitHubTemplateOptions }

  /**
   * Repository-relative paths that are hand-authored. Never written; declaring
   * a template at one of these paths is an error.
   */
  readonly unmanaged?: readonly string[]
}

export class GitHubTemplates extends Component {
  readonly files: Record<string, Component>

  constructor(project: Project, options?: GitHubTemplatesOptions)

  /** Cross-file validation and ownership-transition detection (§3.4, §5). */
  override preSynthesize(): void
}
```

The low-level components remain exported with kind-specific constructors, so a
consumer who wants compile-time exactness for one file can have it:

```ts
new IssueForm(project, '.github/ISSUE_TEMPLATE/01-bug.yml', {
  name,
  description,
  body,
})
```

### 4.5 `GitHubYamlFile` (`lib/yaml-file.ts`)

Extends `projen.ObjectFile` — keeping `addOverride`, `addToArray`, `patch`,
`addDeletionOverride`, token resolution, `omitEmpty` — and replaces only
serialization:

```ts
export abstract class GitHubYamlFile extends ObjectFile {
  protected override synthesizeContent(
    resolver: IResolver,
  ): string | undefined {
    const json = super.synthesizeContent(resolver)

    if (!json) {
      return undefined
    }

    const obj = JSON.parse(json)

    // Overrides and patches are applied after the resolver, so this is the
    // first point at which the final object is visible. Re-run the intrinsic
    // rules here, not just in the constructor.
    this.validate(obj)

    return [
      ...(this.marker ? [`# ${this.marker}`] : []),
      '',
      // GitHub coerces scalars per YAML 1.1: `Yes` is a Boolean, `1:20` is 80,
      // `2001-12-15` is a date. `yaml` defaults to 1.2 and would emit all three
      // unquoted. Serializing as 1.1 quotes the whole ambiguity set.
      YAML.stringify(obj, { indent: 2, lineWidth: 0, version: '1.1' }),
    ].join('\n')
  }

  protected abstract validate(obj: unknown): void
}
```

`lineWidth: 0` disables folding — a long `description` must not wrap into a
multi-line scalar. `ObjectFile`'s JSON round trip drops `undefined` for free, so
optional keys never surface as `key: null`.

---

## 5. Validation behavior

Message format: `<path>: <what is wrong>. <what to do>.` Every rule cites its
constraint.

### Path rules (constructor)

| Rule                                                                                                                                    | Severity |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Path canonicalizes to a POSIX repository-relative path; reject `..`, backslashes, absolute paths, and leading `./` before normalization | error    |
| Path matches exactly one supported pattern (§4.4); `config.yml` matched before generic `.yml`                                           | error    |
| Issue templates use `.yml` or `.md`, never `.yaml`                                                                                      | error    |
| No two keys collide after case-folding (`Bug.yml` vs `bug.yml`)                                                                         | error    |
| No two named PR templates share a basename across the three search directories                                                          | error    |
| Path is not listed in `unmanaged`                                                                                                       | error    |

### Issue Forms (constructor, re-run on the resolved object)

| Rule                                                                                                    | Severity  | Source                                                                                 |
| ------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------- |
| `name` is a non-empty string longer than 3 characters                                                   | error     | otherwise the template is silently not shown                                           |
| `description` is a non-empty string                                                                     | error     | required top-level key                                                                 |
| `body` is non-empty                                                                                     | error     | "Body cannot be empty"                                                                 |
| `body` contains ≥1 non-`markdown` element                                                               | error     | "at least one non-markdown field"                                                      |
| every `id` matches `/^[A-Za-z0-9_-]+$/`                                                                 | error     | "`id` can only contain numbers, letters, -, _"                                         |
| `id`s unique within the form                                                                            | error     | "Body must have unique ids"                                                            |
| `markdown` elements carry no `id`                                                                       | error     | `id` is "except when `type` is set to `markdown`"                                      |
| duplicate input `label`s **only when neither element carries an `id`**                                  | error     | "you can supply at least one `id` to differentiate two elements with identical labels" |
| checkbox option label colliding with an input label **only when the top-level element carries no `id`** | error     | "you can supply an `id` to any clashing top-level elements"                            |
| `dropdown.options` non-empty                                                                            | error     | "Cannot be empty"                                                                      |
| `dropdown.options` distinct                                                                             | error     | "`options` must be unique"                                                             |
| `dropdown.options` excludes `none` (case-insensitive)                                                   | error     | "the reserved word, none"                                                              |
| `dropdown.options` excludes `n/a` when `default` is set                                                 | error     | "you cannot include 'None' or 'n/a'"                                                   |
| `dropdown.default` is an in-range index                                                                 | error     | `default` is an index                                                                  |
| `label`/`description`/`value` non-empty and non-whitespace                                              | error     | "Empty strings… are not permissible"                                                   |
| `label` contains `password`                                                                             | **error** | documented fatal; the rest of the blocklist is unpublished and is not guessed          |

The two conditional label rules are the correction that matters: the first draft
made them unconditional and would have rejected forms GitHub accepts.

### Chooser (constructor)

| Rule                                       | Severity |
| ------------------------------------------ | -------- |
| `contactLinks[].url` matches `^https?://`  | error    |
| `contactLinks[].name` / `.about` non-empty | error    |

### Cross-file (`preSynthesize`)

| Rule                                                                                             | Severity                                               |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `name` unique across all forms **and** Markdown templates                                        | error                                                  |
| A path in the previous `.projen/files.json` is about to become unmanaged or `SampleFile`-managed | **error**, with recovery instructions (§3.4)           |
| An `unmanaged` or `SampleFile` path collides with a `FileBase` path                              | error — projen's own duplicate check does not see this |
| A legacy `ISSUE_TEMPLATE.md` exists in the repository                                            | **warn** — retired 2025-03-30, now dead weight         |

### Not validated, deliberately

`labels` existing in the repository, `type` existing at the org, `projects`
write access, `textarea.render` being a real Linguist language, filename
ordering conventions, label _similarity_. The first four are unknowable at synth
time; the last two were warnings that cost more attention than they returned
(§11.9).

---

## 6. `.projenrc.ts` configuration examples

### 6.1 A bug-report Issue Form

```ts
import { Project } from '@langri-sha/projen-project'

const project = new Project({
  name: 'acme',
  package: {/* … */},
  githubTemplates: {
    files: {
      '.github/ISSUE_TEMPLATE/01-bug-report.yml': {
        name: 'Bug report',
        description: 'Something is broken and you can reproduce it.',
        title: '[bug] ',
        labels: ['bug', 'needs triage'],
        body: [
          {
            type: 'markdown',
            attributes: {
              value: [
                'Thanks for taking the time to file this.',
                '',
                'Please search existing issues first — duplicates get closed.',
              ].join('\n'),
            },
          },
          {
            type: 'checkboxes',
            id: 'prerequisites',
            attributes: {
              label: 'Prerequisites',
              options: [
                { label: 'I searched the existing issues', required: true },
                { label: 'I am on the latest release', required: true },
              ],
            },
          },
          {
            type: 'input',
            id: 'version',
            attributes: {
              label: 'Version',
              description: 'Output of `acme --version`.',
              // Serialized as "1:20"-safe — see §2.7. A bare 1:20 would be
              // read back as the integer 80.
              placeholder: '1.4.2',
            },
            validations: { required: true },
          },
          {
            type: 'dropdown',
            id: 'install-method',
            attributes: {
              label: 'How did you install it?',
              options: ['npm', 'pnpm', 'Homebrew', 'Built from source'],
              default: 1,
            },
            validations: { required: true },
          },
          {
            type: 'textarea',
            id: 'reproduction',
            attributes: {
              label: 'Reproduction steps',
              description: 'What did you run, and what happened?',
              value: '1.\n2.\n3.\n',
            },
            validations: { required: true },
          },
          {
            type: 'textarea',
            id: 'logs',
            attributes: { label: 'Relevant log output', render: 'shell' },
            validations: { required: false },
          },
        ],
      },
    },
  },
})

project.synth()
```

### 6.2 A Markdown issue template plus chooser and contact links

```ts
githubTemplates: {
  files: {
    '.github/ISSUE_TEMPLATE/02-proposal.md': {
      name: 'Proposal',
      about: 'Suggest a change that needs discussion before implementation.',
      title: '[proposal] ',
      labels: ['proposal'],
      body: [
        '## Problem',
        '',
        'What is currently hard, and for whom?',
        '',
        '## Proposed change',
        '',
        'What would you do instead?',
        '',
        '## Alternatives considered',
        '',
        '## Out of scope',
        '',
      ].join('\n'),
    },

    '.github/ISSUE_TEMPLATE/config.yml': {
      // Write-access users still see "Blank issue", labelled "Maintainers only".
      blankIssuesEnabled: false,
      contactLinks: [
        {
          name: 'Questions and usage help',
          url: 'https://github.com/acme/acme/discussions',
          about: 'Ask here first — issues are for defects and proposals.',
        },
        {
          name: 'Report a security vulnerability',
          url: 'https://github.com/acme/acme/security/advisories/new',
          about: 'Please do not open a public issue for security reports.',
        },
      ],
    },
  },

  // Hand-authored, owned by the security team. Never written by projen;
  // declaring a template at this path is a synth-time error.
  unmanaged: ['.github/ISSUE_TEMPLATE/00-security.md'],
}
```

### 6.3 A PR template with a project-specific checklist

Note that the default template and the named one now sit in _different_
directories — which the first draft's single `pullRequestTemplateDirectory` enum
could not express.

```ts
githubTemplates: {
  files: {
    '.github/pull_request_template.md': {
      body: [
        '## What changed',
        '',
        '<!-- One paragraph. The diff shows how; say why. -->',
        '',
        '## Checklist',
        '',
        '- [ ] `pnpm exec projen` run and the tree is clean',
        '- [ ] Change file written (`pnpm change`) for every package touched',
        '- [ ] Tests cover the behaviour, not just the lines',
        '- [ ] Public API changes are reflected in the package readme',
        '',
        '## Rollout',
        '',
        '- [ ] Safe to land behind no flag',
        '- [ ] Needs coordination — describe below',
        '',
      ].join('\n'),
    },

    // Selectable with ?template=release.md. Not applied automatically.
    'docs/PULL_REQUEST_TEMPLATE/release.md': {
      body: [
        '## Release',
        '',
        '- [ ] Beachball change files present for every package',
        '- [ ] `pnpm -r --if-present prepublishOnly` is green',
        '- [ ] Release workflow dispatched after merge',
        '',
      ].join('\n'),
      // Seeded once, then owned by whoever runs releases. Never flip this on an
      // existing managed file — see §3.4.
      managed: false,
    },
  },
}
```

### 6.4 Standalone use, without `@langri-sha/projen-project`

```ts
import { GitHubTemplates } from '@langri-sha/projen-github-templates'
import { Project } from 'projen'

const project = new Project({ name: 'acme' })

new GitHubTemplates(project, {
  files: { '.github/pull_request_template.md': { body: 'Fixes #\n' } },
})

project.synth()
```

---

## 7. Generated file layout

From §6.1–6.3 combined:

```
.github/
  ISSUE_TEMPLATE/
    00-security.md          # hand-authored; declared `unmanaged`, never written
    01-bug-report.yml       # generated, read-only, linguist-generated
    02-proposal.md          # generated, read-only, linguist-generated
    config.yml              # generated, read-only, linguist-generated
  pull_request_template.md  # generated, read-only, linguist-generated
docs/
  PULL_REQUEST_TEMPLATE/
    release.md              # SampleFile: written once, then hand-owned
```

### `.github/ISSUE_TEMPLATE/01-bug-report.yml`

<!-- prettier-ignore -->
```yaml
# ~~ Generated by projen. To modify, edit .projenrc.ts and run "pnpm exec projen".

name: Bug report
description: Something is broken and you can reproduce it.
title: "[bug] "
labels:
  - bug
  - needs triage
body:
  - type: markdown
    attributes:
      value: |-
        Thanks for taking the time to file this.

        Please search existing issues first — duplicates get closed.
  - type: checkboxes
    id: prerequisites
    attributes:
      label: Prerequisites
      options:
        - label: I searched the existing issues
          required: true
        - label: I am on the latest release
          required: true
  - type: input
    id: version
    attributes:
      label: Version
      description: Output of `acme --version`.
      placeholder: 1.4.2
    validations:
      required: true
  - type: dropdown
    id: install-method
    attributes:
      label: How did you install it?
      options:
        - npm
        - pnpm
        - Homebrew
        - Built from source
      default: 1
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Reproduction steps
      description: What did you run, and what happened?
      value: |
        1.
        2.
        3.
    validations:
      required: true
  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      render: shell
    validations:
      required: false
```

Under YAML 1.1 serialization the quoting is slightly heavier than 1.2 would
produce — `"[bug] "` here, and `"Yes"`/`"1:20"`/`"2001-12-15"` wherever such
values appear. That is the point.

### `.github/ISSUE_TEMPLATE/config.yml`

```yaml
# ~~ Generated by projen. To modify, edit .projenrc.ts and run "pnpm exec projen".

blank_issues_enabled: false
contact_links:
  - name: Questions and usage help
    url: https://github.com/acme/acme/discussions
    about: Ask here first — issues are for defects and proposals.
  - name: Report a security vulnerability
    url: https://github.com/acme/acme/security/advisories/new
    about: Please do not open a public issue for security reports.
```

### `.github/ISSUE_TEMPLATE/02-proposal.md`

No marker — the body below the frontmatter is copied verbatim into every issue.

<!-- prettier-ignore -->
```markdown
---
name: Proposal
about: Suggest a change that needs discussion before implementation.
title: "[proposal] "
labels:
  - proposal
---

## Problem

What is currently hard, and for whom?

## Proposed change

What would you do instead?

## Alternatives considered

## Out of scope
```

### `.gitattributes` additions

```
/.github/ISSUE_TEMPLATE/01-bug-report.yml linguist-generated
/.github/ISSUE_TEMPLATE/02-proposal.md linguist-generated
/.github/ISSUE_TEMPLATE/config.yml linguist-generated
/.github/pull_request_template.md linguist-generated
```

`docs/PULL_REQUEST_TEMPLATE/release.md` is absent — `SampleFile` is not a
`FileBase` and is not annotated.

---

## 8. Testing plan

Vitest via `@langri-sha/vitest`, `synthSnapshot` from `projen/lib/util/synth` —
the idiom in `projen-codeowners` and `projen-renovate`. `synthSnapshot` sets
`PROJEN_DISABLE_POST=true`, so tests assert the serializer's own output.

**`src/index.test.ts` — snapshots**

Defaults (no options → no files); one Issue Form exercising all six element
types; a Markdown template with full frontmatter; the chooser; the default PR
template in each of the three directories; a named PR template; `managed: false`
producing the file with no marker and no `.gitattributes` entry; `marker: true`
emitting the HTML comment.

**`src/lib/yaml-file.test.ts` — the interop invariant**

The load-bearing test. It must cover the **whole** YAML 1.1 ambiguity set, not
just Booleans — a `['Yes','No','Maybe']` round trip is exactly the test that
would have passed against the first draft's broken serializer:

```ts
test('survives a YAML 1.1 round trip', () => {
  // GitHub coerces scalars per YAML 1.1: `Yes` is a Boolean, `1:20` is the
  // integer 80, `2001-12-15` is a date, `12_000` is 12000. Every one of these
  // must come back as the string it was declared as.
  const declared = [
    'Yes',
    'No',
    'y',
    'n',
    'on',
    'off',
    '1:20',
    '12:34:56',
    '2001-12-15',
    '2001-12-15T02:59:43.1Z',
    '12_000',
    'Maybe',
  ]

  const emitted = synthSnapshot(project)['.github/ISSUE_TEMPLATE/poll.yml']

  expect(
    YAML.parse(emitted, { version: '1.1' }).body[0].attributes.options,
  ).toEqual(declared)
})
```

Plus: `#`-leading Markdown values, `:`-containing descriptions, `[BUG] <title>`
titles, multi-line values as block scalars, `undefined` optionals absent rather
than `null`, and byte-identical output across two synths.

**`src/lib/ownership.test.ts` — the transitions**

Each of the five §3.4 findings, as a test against a real temp-dir project:

- edit a managed file, re-synth, assert content is restored (documents the
  behavior rather than pretending CI catches it)
- `managed: true → false` on an existing file throws before cleanup, and does
  **not** delete the file
- dropping a template into `unmanaged` throws before cleanup
- `SampleFile` colliding with a `FileBase` path throws from our check, since
  projen's does not fire
- validation runs on the resolved object: `addOverride('name', 'ab')` after
  construction still fails the >3-character rule

**`src/lib/paths.test.ts`** — canonicalization, traversal rejection, backslash
rejection, kind selection precedence (`config.yml` before `*.yml`), case-folded
collisions, cross-directory named-PR basename collisions.

**`src/lib/validate.test.ts`** — one case per rule in §5, asserting on message
_text_. Including the two corrected label rules: duplicate labels **with**
disambiguating `id`s must pass; **without** must fail.

**`packages/projen-project/src/index.test.ts`** — one added case, asserting the
opt-in and the `this.parent` guard.

No schema canary. §11.10 explains why the first draft's version could not have
worked, and a scheduled live check is a CI concern rather than a unit test.

---

## 9. Documentation plan

**`packages/projen-github-templates/readme.md`** — the `projen-renovate` shape
(title, description, install, usage, "See also"), extended with:

- the **scope boundary** (§3.7)
- an **ownership** section stating plainly that projen's cleanup deletes files
  dropped from the manifest, what the component does to prevent it, and how to
  recover (`git show HEAD:<path>`)
- **caveats**, because these silently produce broken repositories:
  - templates only take effect on the **default branch**
  - `name` must exceed 3 characters or the template is silently hidden
  - `labels` that do not exist in the repository are silently dropped
  - named PR templates are **not** applied automatically
  - **any** file in a repo's own `.github/ISSUE_TEMPLATE/` disables _all_
    org-wide defaults (§2.9)
  - root and `docs/` `ISSUE_TEMPLATE/` work via `?template=` but are **not
    offered** by this package
  - `.txt` PR templates are supported by GitHub and **not offered** here
  - `validations.required` works on private repositories despite the docs
  - `PullRequestTemplate` is distinct from `projen.github.PullRequestTemplate`
  - the serializer's output is canonical; Prettier does not normalize it
- links to each cited GitHub page

**Root `readme.md`** — one table row:

```
| `@langri-sha/projen-github-templates` | `.github/` issue & pull request template generator |
```

---

## 10. Beachball release plan

1. **Initial version `0.0.0`.** Every package here was born at `0.0.0` and let
   Beachball drive the first release. Do the same.

2. **Change files land in the same PR as the code.** AGENTS.md is explicit:
   releasing publishes only packages with a change file, and `beachball check`
   goes quiet once a PR merges, so a missing change file strands the package on
   npm indefinitely.

3. **Expect fan-out.** Adding a subproject re-synthesizes the workspace: a new
   root `tsconfig.json` project reference, and a new dependency in
   `packages/projen-project/package.json` if wired in the same PR. Minimum two
   change files:

   | Package                               | Type    | Comment                                                 |
   | ------------------------------------- | ------- | ------------------------------------------------------- |
   | `@langri-sha/projen-github-templates` | `minor` | `Add GitHub issue and pull request template components` |
   | `@langri-sha/projen-project`          | `minor` | `Add optional githubTemplates option`                   |

   Downgrade incidental packages to `patch` rather than letting a re-synth bump
   24 packages a minor.

4. **Two PRs.** PR 1 ships the package alone — it is usable standalone (§6.4).
   PR 2 wires it into `projen-project`. Keeps a brand-new serializer and
   ownership-transition detector separable from the meta-component every repo in
   the garden depends on.

5. **Publish gate.** The `publish` composition supplies `publishConfig`,
   `tsconfig.build.json`, and `prepublishOnly`. This package ships **no**
   generated `.d.ts`, so it does not need the `test -f dist/*.d.ts` guard that
   `projen-renovate` and `projen-swcrc` carry after #91 — state that in the PR
   so the omission reads as deliberate.

6. **Peer policy.** `peerDeps: [...projenPeer.peerDeps]` — spread the shared
   constant so Renovate's projenrc customManager keeps finding it. Runtime
   dependency `yaml@2.9.0`, pinned exactly (precedent:
   `serialize-javascript@7.0.7` in `projen-babel`). Declaring `yaml` directly
   rather than leaning on projen's transitive copy is deliberate — correctness
   depends on its version, and on `version: '1.1'` support specifically.

---

## 11. Rejected alternatives

### 11.1 Generate types from SchemaStore, like `projen-renovate`

**Rejected — but not because it is impossible.** The first draft said "hand-
written union or no types at all"; §2.6 shows that rewriting the schema's
`if`/`then` branches to `oneOf` yields a proper discriminated union, and
`schemastore-to-typescript` already has precedent for pre-compile fixups.

The real reasons:

- **Authority.** SchemaStore is a community mirror, not GitHub. It already
  disagrees with GitHub's docs on `projects` (array-only vs. array-or-comma-
  delimited-string). Generating from it makes a third-party's reading of the
  docs the package's contract.
- **Output quality.** The generated union is ~42 KB, most of it the entire
  embedded Linguist language enum for `textarea.render`. That is a 42 KB
  generated file, a `prepare` script, a `tsx` devDependency, and the `.d.ts`
  packaging failure mode that #91 just fixed for three packages — to replace 90
  lines of hand-written, JSDoc'd, doc-linked types.
- **The fixup is upstream.** The `if`/`then` → `oneOf` transform would live in
  `schemastore-to-typescript`, which is shared. Teaching a general-purpose
  compiler a GitHub-specific rewrite to serve one consumer is the wrong place
  for it.

Worth revisiting if a second consumer of the same schema appears — discussion
category forms in v2 would be exactly that.

### 11.2 Use `projen.YamlFile` directly

**Rejected: emits documents GitHub misreads.** §2.7.

### 11.3 The `YAML.visit` + `QUOTE_DOUBLE` visitor (first draft's fix)

**Rejected: incomplete, and dangerously so.** It fixes the Booleans everyone
thinks of and leaves sexagesimals, dates, timestamps, and underscore-separated
integers mutating silently — with a test that passes. `version: '1.1'` moves the
predicate into the library. Cheaper _and_ correct is a rare combination; take
it.

Also rejected: `defaultStringType: 'QUOTE_DOUBLE'` (quote everything), which
turns every multi-line `value` into an escaped one-liner and makes the generated
files unreviewable.

### 11.4 Validate with `ajv` against the SchemaStore document at synth time

**Rejected.** Network at synth time or a vendored copy that goes stale; error
messages like `data/body/3 must match "then" schema`, the opposite of
actionable; and the highest-value rules are not in the schema at all — `name`
length, cross-template uniqueness, the reserved `none`, the `default` index
range, the conditional label rules, ownership transitions.

### 11.5 The compile-time mapped type (B-prime)

**Rejected — with a corrected rationale.** The first draft rejected it for
needing a self-referential generic that would have to survive `ProjectOptions`.
**That reason was wrong**: §3.3 verifies a mapped type over a _closed
template-literal union_ type-checks bad values and bad paths under
`tsc --strict` with no generics anywhere.

The reasons that survive:

- **It is brittle at the edges.** Spreads, computed keys, and any variable typed
  `Record<string, …>` widen the key to `string` and lose every guarantee — and
  `.projenrc.ts` files do compose config from variables.
- **Its failure messages are poor.** A near-miss path reports "does not exist in
  type 'Files'" with the full union inlined, which for nine template-literal
  members is unreadable next to
  `.github/ISSUE_TEMPLATE/bug.yaml: issue forms must use the .yml extension`.
- **It does not remove the runtime check.** Path canonicalization, case-folding,
  and traversal rejection are still required, so the type buys a second
  mechanism rather than replacing the first.
- **Structural overlap defeats it anyway.** `IssueFormOptions` and
  `IssueTemplateOptions` share enough keys that some wrong-kind values satisfy
  both regardless of which one the path selects.

Worth reconsidering if the runtime messages turn out to be enough on their own
and the type could be layered on as a pure convenience.

### 11.6 Separate keys per kind (the first draft's option A)

**Rejected**, superseded by §3.3. Six options meaning "a template", a
singular/plural pair one letter apart, and a directory enum that cannot express
a default template in `.github/` alongside a named one in `docs/`.

### 11.7 Fluent builders / static element factories

**Rejected.** A second API surface maintained in lockstep with the union, for no
safety the union does not already provide.

### 11.8 "CI re-synth is the overwrite guard"

**Rejected — this was a claim, not an alternative, and it was false.** §3.4. CI
detects committed drift after mutation. It cannot see a reverted uncommitted
edit, and it does not run before projen's cleanup deletes an orphaned file.

### 11.9 The four heuristic warnings

**Cut:** the Rails `parameterize` "labels are too similar" rule (an
approximation whose false positives now interact with the conditional `id`
exemption); "`render` looks like a Linguist language" (an undefined predicate
without vendoring `languages.yml`); numeric-prefix consistency (style policing);
and "named PR templates without a default" (a documentation problem).

**Kept and promoted to errors:** exact duplicate labels without `id`
disambiguation, and `password` — both documented-fatal.

### 11.10 The schema drift canary

**Cut.** The first draft's design — a recorded fixture in CI, live fetch only
under `UPDATE_SCHEMA_FIXTURE` — compares the code against the fixture. Upstream
changes never touch the fixture, so it stays green forever. It was a
fixture-consistency test wearing a canary's name, and shipping it would have
been worse than shipping nothing, because the readme would have claimed drift
detection that did not exist.

If drift detection is wanted later it belongs in a scheduled workflow against
the live schema — and even then SchemaStore is a secondary source that cannot
establish GitHub behavior on its own.

### 11.11 Name the package `@langri-sha/projen-github`

**Rejected.** An invitation for workflows, Dependabot, settings, and community
health files to accrete into one package.

---

## 12. Sequenced implementation plan

Each step leaves the tree valid and is a commit.

**1 — Scaffold.** `.projenrc.ts`; generated
`packages/projen-github-templates/{package.json,tsconfig.json,tsconfig.build.json,.gitignore,.npmignore,license,readme.md,.projen/*}`;
root `tsconfig.json`.

```ts
project.addSubproject(
  {
    name: '@langri-sha/projen-github-templates',
    outdir: path.join('packages', 'projen-github-templates'),
    npmIgnore: {},
    readme: { filename: 'readme.md' },
    typeScriptConfig: {},
    package: {
      ...pkg,
      copyrightYear: '2026',
      type: 'module',
      deps: ['yaml@2.9.0'],
      peerDeps: [...projenPeer.peerDeps],
    },
  },
  subproject,
  test,
  publish,
)
```

**2 — `lib/yaml-file.ts`.** YAML 1.1 serialization, with the full round-trip
test from §8. The invariant that justifies the file.

**3 — `lib/paths.ts`.** Canonicalization, kind selection, collision detection,
with tests. Pure functions, no `Project`.

**4 — `lib/form-schema.ts`.** Types only. JSDoc every key with its constraint
and doc link, in the style of `EditorConfigOptions`.

**5 — `lib/validate.ts`.** The §5 rules as pure functions returning
`{ errors: string[]; warnings: string[] }`, testable without a `Project`.

**6 — `IssueForm` and `IssueTemplateChooser`**, wired to steps 2–5, with
resolved-object validation in `synthesizeContent`.

**7 — `IssueTemplate` and `PullRequestTemplate`**, including the
`managed: false` / `SampleFile` branch and the opt-in HTML-comment marker.

**8 — `GitHubTemplates` and the barrel.** The flat-map dispatch,
`preSynthesize()` cross-file validation, and **ownership-transition detection
against the previous `.projen/files.json`** — the highest-risk code in the
package, landing with `src/lib/ownership.test.ts`.

**9 — Documentation.** Package readme, root readme table row.

**10 — Change file, then PR 1.** Verify: `pnpm exec projen` leaves the tree
clean, `pnpm exec vitest run`, `pnpm -r --if-present prepublishOnly`,
`pnpm exec beachball check`.

**11 — PR 2: wire into `@langri-sha/projen-project`.** `.projenrc.ts` (add the
`workspace:*` dep); `packages/projen-project/src/index.ts` (the option, the
field, `#configureGitHubTemplates` with the `!options || this.parent` guard and
**no** `deepMerge`); its test; its generated `package.json`; a `minor` change
file.

**12 — Dogfood (separate PR).** `langri-sha/projen` has no templates today.
Adding a bug-report form and a PR template to this repo's own `.projenrc.ts` is
the honest end-to-end test — and the point at which §2.9's org-defaults caveat
becomes real for the garden, so it deserves its own decision.

---

## 13. Review log

Revision 2 folds in an adversarial review (`gpt-5.6-sol`, max effort, 17 min).
Its verdict on revision 1 was "reject as written: the package idea survives, and
hand-written form types remain defensible, but the proposed serializer,
ownership guarantees, validation model, and several GitHub facts do not." Each
finding below was independently re-verified before acceptance.

| #   | Finding                                                                                                                                                                                                                         | Verified how                                                                                                       | Outcome                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The `YAML.visit` fix covered Booleans only; `1:20`, `12:34:56`, ISO dates and `12_000` still mutate. `version: '1.1'` fixes the whole set.                                                                                      | `yaml@2.9.0` round trip under `{version:'1.1'}`                                                                    | **Accepted.** §2.7, §4.5, §11.3 rewritten; §8's test broadened.                                                                                                   |
| 2   | "GitHub uses Ruby/Psych" is inferred, not established.                                                                                                                                                                          | —                                                                                                                  | **Accepted.** Reframed around documented coercion behavior.                                                                                                       |
| 3   | CI re-synth is not an overwrite guard; `managed → SampleFile` and `managed → unmanaged` delete the file via projen's cleanup; `SampleFile` + `FileBase` collisions go undetected; `0444` is not preserved by Git.               | `projen/lib/cleanup.js` `findOrphanedFiles` + `rmSync`; `SampleFile` is a `Component`, absent from `project.files` | **Accepted.** §3.4 rewritten; transition detection added to §4.4/§5/§8/§12-8.                                                                                     |
| 4   | `validations.required` supports private repositories since 2025-02-18; the docs reusable is stale.                                                                                                                              | GitHub changelog, verbatim                                                                                         | **Accepted.** §2.5 corrected.                                                                                                                                     |
| 5   | `ISSUE_TEMPLATE.md` was retired 2025-03-30, not merely undocumented.                                                                                                                                                            | GitHub changelog, verbatim                                                                                         | **Accepted.** §2.1; added as a warning rule.                                                                                                                      |
| 6   | Root and `docs/` `ISSUE_TEMPLATE/` work via `?template=`; the absolute "GitHub does not read them" claim is false.                                                                                                              | GitHub docs, verbatim                                                                                              | **Accepted.** §2.1 corrected; non-goal reworded to "not offered".                                                                                                 |
| 7   | Duplicate input and checkbox labels are valid when disambiguated by `id`; the unconditional errors would reject valid forms.                                                                                                    | [common-validation-errors], verbatim                                                                               | **Accepted.** §5 rules made conditional.                                                                                                                          |
| 8   | `password` is documented-fatal; warning on it contradicted the stated severity policy.                                                                                                                                          | [common-validation-errors]                                                                                         | **Accepted.** Promoted to error.                                                                                                                                  |
| 9   | Case-folded path collisions need checking, since GitHub treats filenames case-insensitively.                                                                                                                                    | —                                                                                                                  | **Accepted** as a validation obligation; no claim made about GitHub's own validator.                                                                              |
| 10  | Markdown-frontmatter arrays for `labels`/`assignees` are assumed, not documented.                                                                                                                                               | —                                                                                                                  | **Accepted** as a caveat (§2.4) flagged for live verification before publishing.                                                                                  |
| 11  | SchemaStore compiles to a useless type as published, but `allOf` is not ignored — `if`/`then` is — and an `if`/`then` → `oneOf` rewrite produces a proper union. "Hand-written or nothing" was overstated.                      | `json-schema-to-typescript@15.0.4` before and after the rewrite                                                    | **Accepted.** §2.6 and §11.1 rewritten; recommendation unchanged, rationale replaced.                                                                             |
| 12  | The fixture-based schema canary cannot detect upstream drift.                                                                                                                                                                   | —                                                                                                                  | **Accepted.** Cut (§11.10).                                                                                                                                       |
| 13  | Validation must run on the resolved object, since `addOverride`/`patch` apply after the resolver.                                                                                                                               | `projen/lib/object-file.d.ts`                                                                                      | **Accepted.** §3.4, §4.5, §8.                                                                                                                                     |
| 14  | Choose option B; B-prime's precision does not survive spreads and widened maps, and its complexity is not justified. Notably, B-prime needs **no** generics — the first draft's stated reason for rejecting it was wrong.       | `tsc 5.9.3 --strict` against a mapped type over a closed template-literal union                                    | **Accepted**, and matches the direction already taken. §3.3 rewritten; §11.5 rejection rationale replaced.                                                        |
| 15  | Scope: keep types, YAML 1.1, path validation, documented-fatal rules, cross-file collisions, transition-tested ownership. Drop `parameterize`, the Linguist warning, numeric-prefix warnings, the named-PR warning, the canary. | —                                                                                                                  | **Accepted with one refinement**: the _exact_ duplicate-label rule is kept (documented and unambiguous); only the fuzzy _similarity_ heuristic is dropped. §11.9. |

---

## References

- [about-issue-and-pull-request-templates]
- [configuring-issue-templates]
- [syntax-for-issue-forms]
- [syntax-for-githubs-form-schema]
- [creating-a-pull-request-template]
- [common-validation-errors]
- [creating-a-default-community-health-file]
- [creating-an-issue#url-query]
- [using-query-parameters]
- [issues-changelog-2025-02-18] — required fields on private repositories;
  `ISSUE_TEMPLATE.md` retirement
- SchemaStore:
  [`github-issue-forms.json`](https://www.schemastore.org/github-issue-forms.json),
  [`github-issue-config.json`](https://www.schemastore.org/github-issue-config.json)
- [Linguist `languages.yml`](https://github.com/github-linguist/linguist/blob/main/lib/linguist/languages.yml)
- [YAML 1.1 type repository](https://yaml.org/type/) — the ambiguity set
  `version: '1.1'` handles

[langri-sha/projen#94]: https://github.com/langri-sha/projen/issues/94
[about-issue-and-pull-request-templates]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates
[configuring-issue-templates]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository
[configuring-issue-templates#creating-issue-forms]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository#creating-issue-forms
[configuring-issue-templates#configuring-the-template-chooser]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository#configuring-the-template-chooser
[configuring-issue-templates#changing-the-order-of-templates]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository#changing-the-order-of-templates
[syntax-for-issue-forms]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
[syntax-for-issue-forms#top-level-syntax]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms#top-level-syntax
[syntax-for-githubs-form-schema]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema
[creating-a-pull-request-template]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository
[common-validation-errors]:
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/common-validation-errors-when-creating-issue-forms
[creating-a-default-community-health-file]:
  https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file
[creating-an-issue#url-query]:
  https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query
[using-query-parameters]:
  https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/using-query-parameters-to-create-a-pull-request
[issues-changelog-2025-02-18]:
  https://github.blog/changelog/2025-02-18-github-issues-projects-february-18th-update/
