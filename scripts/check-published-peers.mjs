#!/usr/bin/env node
// Fail when a package's `peerDependencies` in source differ from what npm
// serves at the *same version number*.
//
// This catches the class of bug where a package's source is edited but never
// released: the version number stays put, so `beachball check` — which only
// demands change files for packages touched in a PR — goes quiet forever after
// the PR that made the edit lands. Eight packages sat in that state across
// three releases and two years before anyone noticed.
//
// `peerDependencies` is the field worth diffing. Beachball rewrites
// `workspace:*` to an exact pin at publish time, so `dependencies` legitimately
// differ between source and tarball; peers pass through untouched.
//
// Talks to the registry over plain HTTP rather than shelling out to `npm view`,
// which changes its `--json` shape between majors (npm 12 wrapped single
// results in an array and broke beachball's registry read the same way).

import { readFile, readdir } from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = process.env.NPM_CONFIG_REGISTRY ?? 'https://registry.npmjs.org'

/** Packages with a pending change file are about to be released — skip them. */
async function pendingReleases() {
  const dir = path.join(root, 'change')
  let entries = []

  try {
    entries = await readdir(dir)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return new Set()
    }

    throw error
  }

  const names = await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.json'))
      .map(async (entry) => {
        const change = JSON.parse(await readFile(path.join(dir, entry), 'utf8'))

        return change.packageName
      }),
  )

  return new Set(names.filter(Boolean))
}

async function workspacePackages() {
  const dir = path.join(root, 'packages')
  const entries = await readdir(dir, { withFileTypes: true })

  const packages = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const manifest = path.join(dir, entry.name, 'package.json')

        try {
          return JSON.parse(await readFile(manifest, 'utf8'))
        } catch (error) {
          if (error.code === 'ENOENT') {
            return null
          }

          throw error
        }
      }),
  )

  return packages.filter((pkg) => pkg && !pkg.private && pkg.name)
}

/** Peers published at `version`, or null when that version isn't on the registry. */
async function publishedPeers(name, version) {
  const response = await fetch(`${REGISTRY}/${name.replace('/', '%2f')}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`${name}: registry returned ${response.status}`)
  }

  const packument = await response.json()

  return packument.versions?.[version]?.peerDependencies ?? null
}

function diff(source = {}, published = {}) {
  const names = [
    ...new Set([...Object.keys(source), ...Object.keys(published)]),
  ].sort()

  return names
    .filter((name) => source[name] !== published[name])
    .map((name) => ({
      name,
      source: source[name],
      published: published[name],
    }))
}

const [packages, pending] = await Promise.all([
  workspacePackages(),
  pendingReleases(),
])

const drifted = []

for (const pkg of packages) {
  if (pending.has(pkg.name)) {
    continue
  }

  const published = await publishedPeers(pkg.name, pkg.version)

  // Never published at this version — beachball will ship it on the next
  // release, so there is nothing to reconcile.
  if (published === null) {
    continue
  }

  const changes = diff(pkg.peerDependencies, published)

  if (changes.length) {
    drifted.push({ name: pkg.name, version: pkg.version, changes })
  }
}

if (!drifted.length) {
  console.log(
    `✓ ${packages.length} packages: published peer ranges match source`,
  )
  process.exit(0)
}

console.error(
  `✗ ${drifted.length} package(s) have peer ranges that never shipped.\n` +
    `  Source was edited without a release, so npm still serves the old range\n` +
    `  at the same version. Run \`pnpm change\` for each and cut a release.\n`,
)

for (const { name, version, changes } of drifted) {
  console.error(`  ${name}@${version}`)

  for (const { name: peer, source, published } of changes) {
    console.error(
      `    ${peer}: source ${source ?? '(absent)'} — npm ${published ?? '(absent)'}`,
    )
  }
}

process.exit(1)
