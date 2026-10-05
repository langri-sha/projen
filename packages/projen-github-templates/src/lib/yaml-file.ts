import {
  type IResolver,
  ObjectFile,
  type ObjectFileOptions,
  type Project,
} from 'projen'
import YAML from 'yaml'

/**
 * Serialize for GitHub, which coerces plain scalars per YAML 1.1: `Yes` is a
 * Boolean, `1:20` is the integer 80, `2001-12-15` is a date. `yaml` defaults to
 * 1.2 and would emit all three unquoted; serializing as 1.1 quotes the whole
 * ambiguity set. `lineWidth: 0` keeps a long `description` on one line.
 */
export const stringify = (value: unknown): string =>
  YAML.stringify(value, { indent: 2, lineWidth: 0, version: '1.1' })

/**
 * Resolves plain data the way projen's resolver does, for reading a file's
 * final object outside synthesis.
 */
const resolver: IResolver = {
  resolve: (value) =>
    value === undefined ? undefined : JSON.parse(JSON.stringify(value)),
}

/**
 * A YAML file GitHub reads. Keeps `ObjectFile`'s overrides and patches, and
 * replaces only the serialization.
 */
export abstract class GitHubYamlFile extends ObjectFile {
  constructor(project: Project, filePath: string, options: ObjectFileOptions) {
    super(project, filePath, { readonly: true, marker: true, ...options })
  }

  /**
   * The object as it will be written, after overrides and patches.
   */
  resolve(): Record<string, unknown> | undefined {
    const json = super.synthesizeContent(resolver)

    return json === undefined ? undefined : JSON.parse(json)
  }

  /**
   * Problems with the object as it will be written, one sentence each.
   */
  protected abstract validate(obj: Record<string, unknown>): string[]

  protected assertValid(obj: Record<string, unknown>) {
    const errors = this.validate(obj)

    if (errors.length > 0) {
      throw new Error(
        errors.map((error) => `${this.path}: ${error}`).join('\n'),
      )
    }
  }

  protected override synthesizeContent(
    resolver: IResolver,
  ): string | undefined {
    const json = super.synthesizeContent(resolver)

    if (json === undefined) {
      return undefined
    }

    const obj = JSON.parse(json)

    // Overrides and patches apply after the resolver, so this is the first
    // point at which the final object is visible.
    this.assertValid(obj)

    return [
      ...(this.marker ? [`# ${this.marker}`, ''] : []),
      stringify(obj),
    ].join('\n')
  }
}
