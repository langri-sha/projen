import fs from 'node:fs'
import path from 'node:path'

// The dependencies that are not jsii modules are inlined.
export const inlinedDependencies = (manifest, packageDir) =>
  Object.keys(manifest.dependencies ?? {}).filter(
    (name) =>
      !fs.existsSync(path.join(packageDir, 'node_modules', name, '.jsii')),
  )

export const withoutDependencies = (text, packageDir) => {
  const manifest = JSON.parse(text)

  for (const name of inlinedDependencies(manifest, packageDir)) {
    delete manifest.dependencies[name]
  }

  if (!Object.keys(manifest.dependencies ?? {}).length) {
    delete manifest.dependencies
  }

  return `${JSON.stringify(manifest, null, 2)}\n`
}
