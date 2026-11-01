import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as projen from 'projen'
import { ESLint } from 'projen-eslint'

const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'))
const project = new projen.Project({ name: 'smoke', outdir })
const read = (file) => fs.readFileSync(path.join(outdir, file), 'utf8')

new ESLint(project, { config: [{ rules: { 'no-undef': 'off' } }] })

project.synth()

assert.ok(read('eslint.config.js').includes('"no-undef":"off"'))
