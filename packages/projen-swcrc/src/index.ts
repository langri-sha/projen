import { JsonFile, type Project } from 'projen'

import { type SwcrcSchema } from './swcrc.js'

export * from './swcrc.js'

/**
 * SWC configuration options.
 */
export type SWCConfigOptions = SwcrcSchema

/**
 * A component for managing SWC configurations, written to a `.swcrc`.
 */
export class SWCConfig extends JsonFile {
  constructor(project: Project, options?: SWCConfigOptions) {
    super(project, '.swcrc', {
      // NB: SWC errs on unknown property `//`.
      marker: false,

      obj: {
        $schema: 'https://swc.rs/schema.json',
        ...options,
      },
    })
  }
}
