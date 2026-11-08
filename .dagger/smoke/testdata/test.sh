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
  cp "$module/main.dang" "$module/run.mjs" "$module/dagger-module.toml" "$dir/modules/smoke/"
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

