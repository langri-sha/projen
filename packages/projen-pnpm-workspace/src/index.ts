import * as path from 'node:path'

import { type IResolver, Project, YamlFile, javascript } from 'projen'
import YAML from 'yaml'

import { type PnpmWorkspacePnpmWorkspaceYaml as PnpmWorkspaceSchema } from './pnpm-workspace'

/**
 * Options for maintaining a PNPM workspace.
 *
 * Every setting `pnpm-workspace.yaml` accepts is inherited from the schema;
 * `filename` is the only option belonging to the component rather than to pnpm.
 */
export interface PnpmWorkspaceOptions extends PnpmWorkspaceSchema {
  /**
   * Name of the workspace configuration file.
   *
   * @default 'pnpm-workspace.yaml'
   */
  readonly filename?: string
}

export class PnpmWorkspace extends YamlFile {
  constructor(project: Project, options: PnpmWorkspaceOptions = {}) {
    const { filename = 'pnpm-workspace.yaml', ...settings } = options

    super(project, filename, {
      readonly: true,
      marker: true,
      obj: {
        ...settings,
        // Copied rather than passed through, so `addPackages` appends to the
        // file's own array instead of the caller's.
        packages: [...(settings.packages ?? [])],
      },
    })
  }

  override preSynthesize(): void {
    const packages = this.project.subprojects
      .map((project) =>
        project.node
          .findAll(1)
          .filter(
            (file): file is javascript.NodePackage =>
              file instanceof javascript.NodePackage,
          ),
      )
      .flat()
      .map((pkg) =>
        path.relative(this.project.outdir, path.dirname(pkg.file.absolutePath)),
      )

    for (const pkg of packages) {
      if (
        packages
          .filter((other) => other !== pkg)
          .some((other) => path.dirname(other) === path.dirname(pkg))
      ) {
        this.addPackages(path.join(path.dirname(pkg), '*'))
      } else {
        this.addPackages(pkg)
      }
    }
  }

  protected override synthesizeContent(
    resolver: IResolver,
  ): string | undefined {
    const yaml = super.synthesizeContent(resolver)

    if (!yaml) {
      return
    }

    const parsed: Writable<Omit<PnpmWorkspaceOptions, 'filename'>> =
      YAML.parse(yaml)

    if (parsed.packages) {
      parsed.packages = [...new Set(parsed.packages)].sort()
    }

    return [
      ...(this.marker ? [`# ${this.marker}`, ''] : []),
      YAML.stringify(parsed, {
        indent: 2,
        lineWidth: this.lineWidth,
      }),
    ].join('\n')
  }

  addPackages(...packages: string[]): void {
    for (const pkg of packages) {
      this.addToArray('packages', pkg)
    }
  }
}

type Writable<T> = {
  -readonly [K in keyof T]: T[K]
}
