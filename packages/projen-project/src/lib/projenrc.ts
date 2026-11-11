import type { Project } from 'projen'
import { ProjenrcFile as BaseProjenrcFile, SampleFile } from 'projen'

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

  /**
   * Whether the project is the ESM package `nodePackage` stands for.
   */
  readonly nodePackage?: boolean

  /**
   * Whether the project runs the projenrc with `tsx` where Node would do.
   */
  readonly tsx?: boolean
}

export class ProjenrcFile extends BaseProjenrcFile {
  public override readonly filePath: string

  /**
   * The program that runs the projenrc, which a subproject shares with its
   * parent.
   */
  public readonly runner: 'node' | 'tsx'

  constructor(
    project: Project,
    {
      filename = '.projenrc.ts',
      package: pkg,
      nodePackage,
      tsx,
    }: ProjenrcOptions,
  ) {
    super(project)

    if (project.parent) {
      const parent = ProjenrcFile.of(project.parent) as ProjenrcFile | undefined

      this.filePath = parent?.filePath ?? filename
      this.runner = parent?.runner ?? 'tsx'

      return
    }

    this.filePath = filename
    this.runner = nodePackage && !tsx ? 'node' : 'tsx'

    this.project.defaultTask?.exec(`${this.runner} ${filename}`)

    const name = JSON.stringify(project.name)
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/'/g, "\\'")

    const packageOption = nodePackage
      ? `nodePackage: true${tsx ? ',\n  projenrcTsx: true' : ''}`
      : !pkg
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
