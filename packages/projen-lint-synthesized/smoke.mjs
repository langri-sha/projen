import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as projen from 'projen'
import { LintSynthesized } from 'projen-lint-synthesized'

const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'))
const project = new projen.Project({ name: 'smoke', outdir })
const read = (file) => fs.readFileSync(path.join(outdir, file), 'utf8')

new projen.TextFile(project, 'a.txt', { lines: ['a'] })
new LintSynthesized(project, { '*.txt': 'touch linted &&' })

project.synth()

assert.equal(read('linted'), '')
