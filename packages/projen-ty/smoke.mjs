import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as projen from 'projen'
import { Ty } from 'projen-ty'

const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'))
const project = new projen.Project({ name: 'smoke', outdir })
const read = (file) => fs.readFileSync(path.join(outdir, file), 'utf8')

new Ty(project, { environment: { 'python-version': '3.13' } })

project.synth()

assert.ok(read('ty.toml').includes('python-version = "3.13"'))
