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
  readonly #configured: readonly string[]

  constructor(project: Project, options: PnpmWorkspaceOptions = {}) {
    const { filename = 'pnpm-workspace.yaml', ...settings } = options

    project.tryRemoveFile(filename)

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

    this.#configured = [...(settings.packages ?? [])]
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
      const candidate = packages
        .filter((other) => other !== pkg)
        .some((other) => path.dirname(other) === path.dirname(pkg))
        ? path.join(path.dirname(pkg), '*')
        : pkg

      if (!this.#configured.some((glob) => covers(glob, candidate))) {
        this.addPackages(candidate)
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

    // An empty `packages` is not the same as none: tools such as
    // `@manypkg/tools` take the key as proof of a monorepo, find no packages
    // in it, and so lose the root package of a single-package repository.
    if (parsed.packages?.length) {
      parsed.packages = [...new Set(parsed.packages)].sort()
    } else {
      delete parsed.packages
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

/**
 * Whether a `packages` entry matches a path. Entries using syntax beyond `*`,
 * `**` and `?` are never taken to cover anything, which at worst leaves a
 * redundant line behind.
 */
const covers = (glob: string, target: string): boolean => {
  if (glob.startsWith('!') || /[{}[\]()!+@,]/.test(glob)) {
    return false
  }

  const pattern = glob
    .split('/')
    .map((segment) =>
      segment === '**'
        ? '.*'
        : segment
            .replace(/[.\\^$|]/g, '\\$&')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]'),
    )
    .join('/')

  return new RegExp(`^${pattern}$`).test(target)
}

type Writable<T> = {
  -readonly [K in keyof T]: T[K]
}
