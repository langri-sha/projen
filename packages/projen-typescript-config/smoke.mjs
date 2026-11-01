import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as projen from 'projen'
import { TypeScriptConfig } from 'projen-typescript-config'

const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'))
const project = new projen.Project({ name: 'smoke', outdir })
const read = (file) => fs.readFileSync(path.join(outdir, file), 'utf8')

new TypeScriptConfig(project, { config: { compilerOptions: { strict: true } } })

project.synth()

assert.ok(read('tsconfig.json').includes('"strict": true'))
