#!/usr/bin/env bash
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
module=$(dirname "$here")
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

fixture() {
  local dir=$scratch/$1
  mkdir -p "$dir/modules/smoke"
  cp -r "$here/workspace/." "$dir/"
  git -C "$dir" init --quiet
  cp "$module/main.dang" "$module/run.mjs" "$module/api-diff.mjs" "$module/dagger-module.toml" "$dir/modules/smoke/"
  printf '[modules.smoke]\nsource = "modules/smoke"\n' >"$dir/dagger.toml"
}

edit() {
  local name=$1 path=$2
  printf '%s\n' "$3" >"$scratch/$name/$path"
}

smoke() {
  (cd "$scratch/$1" && dagger check smoke:smoke >"$scratch/$1.log" 2>&1)
}

documented() {
  (cd "$scratch/$1" && dagger check smoke:api-docs >"$scratch/$1.log" 2>&1)
}

passes() {
  echo "== $1: smoke passes"
  smoke "$1"
}

fails() {
  local name=$1 reason=$2
  echo "== $name: smoke fails on $reason"
  if smoke "$name"; then
    echo "smoke passed" >&2
    return 1
  fi
  grep -q "$reason" "$scratch/$name.log" || {
    echo "no $reason in the log" >&2
    return 1
  }
}

fixture good
passes good

fixture extensionless
edit extensionless packages/good/src/index.js "export * from './greeting'"
fails extensionless 'ERR_MODULE_NOT_FOUND'
grep -q 'fail their smoke test' "$scratch/extensionless.log"

fixture empty
edit empty packages/good/src/index.js 'export {}'
edit empty packages/good/smoke.mjs "import 'good'"
fails empty 'good: exports nothing'

fixture unsmoked
rm "$scratch/unsmoked/packages/good/smoke.mjs"
passes unsmoked

fixture unscripted
rm "$scratch/unscripted/packages/good/smoke.mjs"
edit unscripted packages/good/build.js "import { cpSync, rmSync, writeFileSync } from 'node:fs'
rmSync('dist', { recursive: true, force: true })
cpSync('src', 'dist', { recursive: true })
writeFileSync('.jsii', JSON.stringify({ name: 'good', types: {} }))"
fails unscripted 'good: has no smoke.mjs'

fixture unexported
edit unexported packages/good/build.js "import { cpSync, rmSync, writeFileSync } from 'node:fs'
rmSync('dist', { recursive: true, force: true })
cpSync('src', 'dist', { recursive: true })
writeFileSync('.jsii', JSON.stringify({ name: 'good', types: { 'good.Greeter': { kind: 'class' }, 'good.Options': { kind: 'interface' } } }))"
fails unexported 'good: does not export Greeter$'

compressed() {
  local name=$1 listed=$2
  fixture "$name"
  edit "$name" packages/good/src/greeter.js 'export class Greeter {}'
  edit "$name" packages/good/src/index.js "export * from './greeter.js'
export * from './greeting.js'"
  edit "$name" packages/good/build.js "import { cpSync, rmSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
rmSync('dist', { recursive: true, force: true })
cpSync('src', 'dist', { recursive: true })
writeFileSync('.jsii', JSON.stringify({ schema: 'jsii/file-redirect', compression: 'gzip', filename: '.jsii.gz' }))
writeFileSync('.jsii.gz', gzipSync(JSON.stringify({ name: 'good', types: { 'good.$listed': { kind: 'class' } } })))"
}

compressed compressed Greeter
passes compressed

compressed compressed-unexported Missing
fails compressed-unexported 'good: does not export Missing$'

fixture unshipped
edit unshipped packages/good/package.json '{"name": "good", "version": "1.0.0", "type": "module", "main": "dist/index.js", "jsii": {}, "scripts": {"prepublishOnly": "node build.js"}}'
edit unshipped packages/good/.npmignore '.jsii'
edit unshipped packages/good/build.js "import { cpSync, rmSync, writeFileSync } from 'node:fs'
rmSync('dist', { recursive: true, force: true })
cpSync('src', 'dist', { recursive: true })
writeFileSync('.jsii', JSON.stringify({ name: 'good', types: {} }))"
fails unshipped 'good: ships no assembly'

writes_docs() {
  local name=$1 committed=$2
  fixture "$name"
  edit "$name" packages/good/package.json '{"name": "good", "version": "1.0.0", "type": "module", "main": "dist/index.js", "scripts": {"prepublishOnly": "node build.js"}}'
  edit "$name" packages/good/build.js "import { cpSync, rmSync, writeFileSync } from 'node:fs'
rmSync('dist', { recursive: true, force: true })
cpSync('src', 'dist', { recursive: true })
writeFileSync('API.md', '# API\n')"
  if [ -n "$committed" ]; then
    edit "$name" packages/good/API.md "$committed"
  fi
}

writes_docs fresh-docs '# API'
echo "== fresh-docs: api-docs passes"
documented fresh-docs

writes_docs stale-docs '# Old API'
echo "== stale-docs: api-docs fails on the difference"
if documented stale-docs; then
  echo "api-docs passed" >&2
  exit 1
fi
grep -q -- '+# API$' "$scratch/stale-docs.log" || {
  echo "no difference in the log" >&2
  exit 1
}
grep -q 'packages/good/API.md is stale: run dagger generate smoke/generate-api-docs, or pnpm --dir packages/good run prepublishOnly, and commit packages/good/API.md' "$scratch/stale-docs.log" || {
  echo "no hint in the log" >&2
  exit 1
}

writes_docs uncommitted-docs ''
echo "== uncommitted-docs: api-docs fails on the missing copy"
if documented uncommitted-docs; then
  echo "api-docs passed" >&2
  exit 1
fi
grep -q 'packages/good/API.md is stale' "$scratch/uncommitted-docs.log" || {
  echo "no hint in the log" >&2
  exit 1
}

generated() {
  (cd "$scratch/$1" && dagger generate -y --require-load smoke/generate-api-docs >"$scratch/$1.log" 2>&1)
}

writes_docs regenerated-docs '# Old API'
echo "== regenerated-docs: the generator replaces a stale API.md"
generated regenerated-docs
[ "$(cat "$scratch/regenerated-docs/packages/good/API.md")" = '# API' ] || {
  echo "API.md was not regenerated" >&2
  exit 1
}
documented regenerated-docs

writes_docs created-docs ''
echo "== created-docs: the generator writes an API.md that was never committed"
generated created-docs
[ "$(cat "$scratch/created-docs/packages/good/API.md")" = '# API' ] || {
  echo "API.md was not created" >&2
  exit 1
}
[ ! -e "$scratch/created-docs/packages/good/dist" ] || {
  echo "the generator wrote more than API.md" >&2
  exit 1
}
documented created-docs

repo=$(cd "$module/../.." && pwd)
release=$scratch/release
mkdir -p "$release"
(cd "$release" && npm pack projen-readme@0.1.17 --silent >/dev/null && tar -xzf ./*.tgz)

api_workspace() {
  local name=$1 package=${2:-projen-readme} version=${3:-0.1.17}
  local dir=$scratch/$name
  mkdir -p "$dir/packages/readme/node_modules" "$dir/scripts" "$dir/change"
  printf '{"name": "fixture", "private": true}\n' >"$dir/package.json"
  printf 'packages:\n  - packages/*\n' >"$dir/pnpm-workspace.yaml"
  node -e "
    const fs = require('node:fs')
    const manifest = JSON.parse(fs.readFileSync('$release/package/package.json', 'utf8'))
    fs.writeFileSync('$dir/packages/readme/package.json', JSON.stringify({ ...manifest, name: '$package', version: '$version' }))
  "
  sed "s|projen-readme|$package|g" "$release/package/.jsii" >"$dir/packages/readme/.jsii"
  mkdir "$dir/packages/readme/dist"
  : >"$dir/packages/readme/dist/index.js"
  cp "$repo/scripts/inline-manifest.mjs" "$dir/scripts/"
  ln -s "$repo/node_modules" "$dir/node_modules"
  for dependency in projen constructs; do
    ln -s "$(readlink -f "$repo/packages/projen-readme/node_modules/$dependency")" "$dir/packages/readme/node_modules/$dependency"
  done
}

removes_property() {
  node -e "
    const fs = require('node:fs')
    const file = '$scratch/$1/packages/readme/.jsii'
    const assembly = JSON.parse(fs.readFileSync(file, 'utf8'))
    assembly.types['projen-readme.ReadmeFileOptions'].properties = []
    fs.writeFileSync(file, JSON.stringify(assembly))
  "
}

changes() {
  mkdir -p "$scratch/$1/change"
  printf '{"type": "%s", "comment": "Change", "packageName": "projen-readme"}\n' "$2" >"$scratch/$1/change/projen-readme-$2.json"
}

api_diff() {
  (cd "$scratch/$1" && env ${registry:+npm_config_registry=$registry} API_DIFF_RETRY_DELAY=0 npm_config_fetch_retries=0 JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1 node "$module/api-diff.mjs" >"$scratch/$1.log" 2>&1)
}

api_passes() {
  echo "== $1: api-breaks passes"
  api_diff "$1" || {
    cat "$scratch/$1.log" >&2
    return 1
  }
}

api_fails() {
  local name=$1 reason=$2
  echo "== $name: api-breaks fails on $reason"
  if api_diff "$name"; then
    echo "api-breaks passed" >&2
    return 1
  fi
  grep -q -- "$reason" "$scratch/$name.log" || {
    echo "no $reason in the log" >&2
    return 1
  }
}

api_workspace compatible
api_passes compatible

api_workspace unmarked-break
removes_property unmarked-break
api_fails unmarked-break 'projen-readme: PROP projen-readme.ReadmeFileOptions.filename: has been removed.*Add a minor change file: pnpm change'

api_workspace patched-break
removes_property patched-break
changes patched-break patch
api_fails patched-break 'Add a minor change file: pnpm change'

api_workspace minor-break
removes_property minor-break
changes minor-break minor
api_passes minor-break

api_workspace unreachable-registry
registry=http://127.0.0.1:9 api_fails unreachable-registry 'the registry did not answer'

api_workspace unreleased-version projen-readme 0.0.1
api_fails unreleased-version 'projen-readme@0.0.1 is not among its'

api_workspace never-published @langri-sha/smoke-fixture-never-published 1.0.0
api_passes never-published

api_workspace staged-only @langri-sha/smoke-fixture-never-published 0.0.0-stage
api_passes staged-only

api_workspace unbuilt
rm "$scratch/unbuilt/packages/readme/.jsii"
api_fails unbuilt 'projen-readme: has a jsii configuration but no .jsii'

api_workspace undistributed
rm -r "$scratch/undistributed/packages/readme/dist"
api_fails undistributed 'projen-readme: has a jsii configuration but no dist/index.js'

api_workspace sibling-dependency
sibling=$scratch/sibling-dependency/packages/constructs
mkdir -p "$sibling/dist"
: >"$sibling/dist/index.js"
constructs=$(readlink -f "$repo/packages/projen-readme/node_modules/constructs")
cp "$constructs/.jsii" "$sibling/.jsii"
node -e "
  const fs = require('node:fs')
  const manifest = JSON.parse(fs.readFileSync('$constructs/package.json', 'utf8'))
  fs.writeFileSync('$sibling/package.json', JSON.stringify({ ...manifest, main: 'src/index.ts', publishConfig: { main: 'dist/index.js' } }))
"
ln -sfn "$sibling" "$scratch/sibling-dependency/packages/readme/node_modules/constructs"
api_passes sibling-dependency

api_workspace malformed-change
printf '{' >"$scratch/malformed-change/change/broken.json"
api_fails malformed-change 'change/broken.json'

broken_release() {
  local name=$1
  fixture "$name"
  mkdir -p "$scratch/$name/packages/readme" "$scratch/$name/scripts"
  cp "$repo/scripts/inline-manifest.mjs" "$scratch/$name/scripts/"
  node -e "
    const fs = require('node:fs')
    const dir = '$scratch/$name'
    const root = JSON.parse(fs.readFileSync(dir + '/package.json', 'utf8'))
    const pinned = JSON.parse(fs.readFileSync('$repo/package.json', 'utf8')).devDependencies['jsii-diff']
    fs.writeFileSync(dir + '/package.json', JSON.stringify({ ...root, devDependencies: { 'jsii-diff': pinned } }))
    const assembly = JSON.parse(fs.readFileSync('$release/package/.jsii', 'utf8'))
    const { dependencies, dependencyClosure, ...bare } = assembly
    fs.writeFileSync(dir + '/packages/readme/assembly.json', JSON.stringify({ ...bare, types: {} }))
    fs.writeFileSync(dir + '/packages/readme/package.json', JSON.stringify({
      name: 'projen-readme',
      version: '0.1.17',
      type: 'module',
      jsii: {},
      scripts: { prepublishOnly: 'node build.js' },
    }))
    fs.writeFileSync(dir + '/packages/readme/build.js', \"import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'\\nmkdirSync('dist', { recursive: true })\\nwriteFileSync('dist/index.js', '')\\ncopyFileSync('assembly.json', '.jsii')\\n\")
  "
  (cd "$scratch/$name" && pnpm install --lockfile-only --silent)
}

dagger_breaks() {
  (cd "$scratch/$1" && dagger check smoke:api-breaks >"$scratch/$1.log" 2>&1)
}

broken_release dagger-unmarked-break
echo "== dagger-unmarked-break: smoke:api-breaks fails on the removed types"
if dagger_breaks dagger-unmarked-break; then
  echo "api-breaks passed" >&2
  exit 1
fi
grep -q 'Add a minor change file: pnpm change' "$scratch/dagger-unmarked-break.log" || {
  echo "no hint in the log" >&2
  exit 1
}

broken_release dagger-minor-break
changes dagger-minor-break minor
echo "== dagger-minor-break: smoke:api-breaks passes with a pending minor"
dagger_breaks dagger-minor-break
