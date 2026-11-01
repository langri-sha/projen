import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as projen from 'projen'
import { SWCConfig } from 'projen-swcrc'

const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'))
const project = new projen.Project({ name: 'smoke', outdir })
const read = (file) => fs.readFileSync(path.join(outdir, file), 'utf8')

new SWCConfig(project, { jsc: { parser: { syntax: 'ecmascript' } } })

project.synth()

assert.equal(JSON.parse(read('.swcrc')).jsc.parser.syntax, 'ecmascript')
