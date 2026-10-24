import { fileURLToPath } from 'node:url'

/**
 * The directory the preset's default GitHub templates ship in, at the package
 * root. The only place that resolves it from the module's own location.
 */
export const templatesDirectory = (): string =>
  fileURLToPath(new URL('../../templates/', import.meta.url))
