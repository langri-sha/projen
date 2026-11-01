import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as projen from 'projen'
import { Husky } from 'projen-husky'

const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'))
const project = new projen.Project({ name: 'smoke', outdir })
const read = (file) => fs.readFileSync(path.join(outdir, file), 'utf8')

new Husky(project, { 'pre-commit': 'npm run lint' })

project.synth()

assert.ok(read('.husky/pre-commit').includes('npm run lint'))
