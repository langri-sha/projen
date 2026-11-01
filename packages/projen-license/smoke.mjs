import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as projen from 'projen'
import { License } from 'projen-license'

const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'))
const project = new projen.Project({ name: 'smoke', outdir })
const read = (file) => fs.readFileSync(path.join(outdir, file), 'utf8')

new License(project, { copyrightHolder: 'Smoke', spdx: 'MIT', year: '2000' })

project.synth()

assert.ok(read('license').includes('MIT License'))
