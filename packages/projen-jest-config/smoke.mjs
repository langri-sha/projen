import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as projen from 'projen'
import { JestConfig } from 'projen-jest-config'

const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'))
const project = new projen.Project({ name: 'smoke', outdir })
const read = (file) => fs.readFileSync(path.join(outdir, file), 'utf8')

new JestConfig(project, { config: { testTimeout: 1234 } })

project.synth()

assert.ok(read('jest.config.ts').includes('1234'))
