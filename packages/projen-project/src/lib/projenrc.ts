import { ProjenrcFile as BaseProjenrcFile, Project, SampleFile } from 'projen'

export interface ProjenrcOptions {
  /**
   * The name of the projenrc file.
   * @default ".projenrc.mts"
   */
  readonly filename?: string

  /**
   * Whether the project is a package, and of which module type.
   */
  readonly package?: { readonly type?: 'commonjs' | 'module' }
}

export class ProjenrcFile extends BaseProjenrcFile {
  public override readonly filePath: string

  constructor(
    project: Project,
    { filename = '.projenrc.ts', package: pkg }: ProjenrcOptions,
  ) {
    super(project)

    if (project.parent) {
      this.filePath = ProjenrcFile.of(project.parent)?.filePath ?? filename

      return
    }

    this.filePath = filename

    this.project.defaultTask?.exec(`tsx ${filename}`)

    const name = JSON.stringify(project.name)
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/'/g, "\\'")

    const packageOption = !pkg
      ? undefined
      : pkg.type
        ? `package: { type: '${pkg.type}' }`
        : 'package: {}'

    const options = packageOption
      ? `{
  name: '${name}',
  ${packageOption},
}`
      : `{ name: '${name}' }`

    new SampleFile(project, filename, {
      contents: `import { Project } from '@langri-sha/projen-project'

const project = new Project(${options})

project.synth()
`,
    })
  }
}
