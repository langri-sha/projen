import {
  Component,
  type IResolver,
  ObjectFile,
  type ObjectFileOptions,
  type Project,
  SampleFile,
  TextFile,
} from 'projen'
import { stringify } from 'smol-toml'

import { type PyProject } from './pyproject.js'
import { type Uv } from './uv.js'

export * from './pyproject.js'
export * from './uv.js'

/**
 * The `[tool]` table, with `[tool.uv]` typed by SchemaStore's "uv" schema.
 *
 * SchemaStore's "PyProject" schema refers each tool it knows to that tool's
 * own schema, `uv` to the very one compiled here. `schemastore-to-typescript`
 * keeps only the open table those references sit in, since it drops optional
 * members beside an `additionalProperties` schema, so `[tool.uv]` is typed from
 * the referenced schema directly and every other tool stays an open table.
 */
export interface PyProjectTool {
  readonly uv?: Uv
  readonly [tool: string]:
    | NonNullable<PyProject['tool']>[string]
    | Uv
    | undefined
}

/**
 * A `pyproject.toml`, as published in SchemaStore's "PyProject" schema.
 *
 * `[project] name` and `version` are optional here where the schema requires
 * them, because both components fall back to the project's own name and to
 * the `0.1.0` that `uv init` writes — uv refuses a `[project]` table with
 * neither a `version` nor one listed in `dynamic`.
 */
export interface PyProjectOptions extends Omit<PyProject, 'project' | 'tool'> {
  /**
   * The `[project]` table. Omit it at a workspace root to keep the root
   * virtual — a workspace, and not a package of its own.
   *
   * @default The project's name at version 0.1.0, when the table is declared at all
   */
  readonly project?: Partial<NonNullable<PyProject['project']>>

  /**
   * The `[tool]` table.
   */
  readonly tool?: PyProjectTool
}

/**
 * A `pyproject.toml`, written as TOML 1.0.
 *
 * Projen's own `TomlFile` writes TOML 0.5, which refuses an array holding both
 * strings and tables and fails the whole synthesis over one. `pyproject.toml`
 * needs exactly that wherever a list takes either a requirement or a table
 * standing in for one — a dependency group including another, or uv's
 * overrides, exclusions and cache keys.
 */
class PyProjectFile extends ObjectFile {
  constructor(project: Project, options: ObjectFileOptions) {
    super(project, 'pyproject.toml', options)
  }

  protected override synthesizeContent(
    resolver: IResolver,
  ): string | undefined {
    const json = super.synthesizeContent(resolver)

    if (!json) {
      return
    }

    return [
      ...(this.marker ? [`# ${this.marker}`] : []),
      '',
      stringify(JSON.parse(json)),
    ].join('\n')
  }
}

/**
 * A distribution name for a project named for npm.
 *
 * A distribution name has nowhere to put a scope — the core metadata allows
 * neither the `@` nor the slash — so the scope is dropped rather than passed
 * through to be refused.
 */
const distributionName = (name: string): string => name.replace(/^@[^/]+\//, '')

/**
 * The module a build backend looks for by default: the normalized distribution
 * name, with underscores where the name has dashes and dots.
 */
const moduleName = (name: string): string =>
  name.toLowerCase().replace(/[-_.]+/g, '_')

const projectTable = (
  project: Project,
  table: PyProjectOptions['project'] = {},
) => ({
  name: distributionName(project.name),
  ...(!table.dynamic?.includes('version') && { version: '0.1.0' }),
  ...table,
})

/**
 * Spelled out in the order a manifest is usually written in, rather than in
 * whichever order the options happened to arrive in.
 */
const manifest = ({
  project,
  'dependency-groups': dependencyGroups,
  'build-system': buildSystem,
  tool,
  ...rest
}: PyProjectOptions) => ({
  ...(project && { project }),
  ...(dependencyGroups && { 'dependency-groups': dependencyGroups }),
  ...(buildSystem && { 'build-system': buildSystem }),
  ...rest,
  ...(tool && { tool }),
})

/**
 * Keep out of Git what `uv init` keeps out of it: the bytecode Python writes
 * beside the sources, what the build backends leave behind, and the
 * environment uv syncs.
 */
const ignoreBuildOutput = (project: Project) => {
  for (const pattern of [
    '__pycache__/',
    '*.py[oc]',
    'build/',
    'dist/',
    'wheels/',
    '*.egg-info',
    '.venv',
  ]) {
    project.addGitIgnore(pattern)
  }
}

/**
 * uv workspace options.
 */
export interface UvWorkspaceOptions extends PyProjectOptions {
  /**
   * The Python `uv python pin` writes into `.python-version`, e.g. `3.14`.
   * Omit to leave the interpreter to what `requires-python` allows.
   */
  readonly pythonVersion?: string
}

/**
 * A component for authoring the root of a uv workspace.
 */
export class UvWorkspace extends Component {
  /**
   * The workspace manifest.
   */
  readonly manifest: ObjectFile

  /**
   * The interpreter uv selects for anything run inside the workspace, when
   * one was pinned.
   */
  readonly pythonVersion?: TextFile

  /**
   * The paths in `[tool.uv.workspace] members`.
   *
   * Read at synthesis rather than at construction, so that members added
   * afterwards — as `@langri-sha/projen-project` does, for every subproject
   * that declares a package — still reach the manifest.
   */
  readonly members: string[]

  constructor(project: Project, options: UvWorkspaceOptions = {}) {
    super(project)

    const { project: metadata, pythonVersion, tool, ...rest } = options
    const { uv, ...tools }: PyProjectTool = tool ?? {}

    this.members = [...(uv?.workspace?.members ?? [])]

    this.manifest = new PyProjectFile(project, {
      obj: manifest({
        ...rest,
        ...(metadata && { project: projectTable(project, metadata) }),
        tool: {
          uv: {
            ...uv,
            workspace: {
              ...uv?.workspace,
              members: this.members,
            },
          },
          ...tools,
        },
      }),
    })

    if (pythonVersion) {
      // Ended in a newline, as `uv python pin` ends it.
      this.pythonVersion = new TextFile(project, '.python-version', {
        lines: [pythonVersion, ''],
      })
    }

    ignoreBuildOutput(project)
  }

  /**
   * Add paths to `[tool.uv.workspace] members`, skipping any already listed.
   */
  addMember(...paths: string[]): void {
    for (const path of paths) {
      if (!this.members.includes(path)) {
        this.members.push(path)
      }
    }
  }
}

/**
 * uv package options.
 */
export interface UvPackageOptions extends PyProjectOptions {
  /**
   * Whether to write a sample `src/<module>/__init__.py`, so that a freshly
   * scaffolded package builds before anything has been written into it.
   *
   * @default true
   */
  readonly sampleCode?: boolean
}

/**
 * Options for either of the components, for callers that route on
 * `project.parent` rather than choosing between them up front.
 */
export interface UvOptions extends UvWorkspaceOptions, UvPackageOptions {}

/**
 * A component for authoring a Python package managed by uv.
 */
export class UvPackage extends Component {
  /**
   * The package manifest.
   */
  readonly manifest: ObjectFile

  constructor(project: Project, options: UvPackageOptions = {}) {
    super(project)

    const { project: metadata, sampleCode = true, ...rest } = options
    const table = projectTable(project, metadata)

    this.manifest = new PyProjectFile(project, {
      obj: manifest({ ...rest, project: table }),
    })

    if (sampleCode) {
      new SampleFile(project, `src/${moduleName(table.name)}/__init__.py`, {
        contents: `"""The ${table.name} package."""\n`,
      })
    }

    ignoreBuildOutput(project)
  }
}
