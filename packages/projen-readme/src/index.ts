import type { Project } from 'projen'
import { SampleFile } from 'projen'

/**
 * Initial `README` for new packages.
 */
export interface ReadmeFileOptions {
  readonly filename?: string
}

/**
 * Initial `README` for new packages.
 */
export class ReadmeFile extends SampleFile {
  constructor(project: Project, options: ReadmeFileOptions = {}) {
    super(project, options.filename ?? 'README.md', {
      contents: `# ${project.name}\n`,
    })
  }
}
