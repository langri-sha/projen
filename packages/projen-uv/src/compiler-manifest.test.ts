import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@langri-sha/vitest'

const script = fileURLToPath(
  new URL('../../../scripts/inline-dependencies.mjs', import.meta.url),
)

test.each([0, 1])(
  'restores runtime dependencies after compiler exit %i',
  (exitCode) => {
    const directory = mkdtempSync(join(tmpdir(), 'jsii-manifest-'))
    const manifest = '{"name":"fixture","dependencies":{"runtime":"1.0.0"}}\n'
    const bin = join(directory, 'bin')
    mkdirSync(bin)
    writeFileSync(join(directory, 'package.json'), manifest)
    writeFileSync(
      join(bin, 'jsii'),
      `#!/bin/sh\ncp package.json observed.json\nexit ${exitCode}\n`,
      { mode: 0o755 },
    )

    try {
      const run = () =>
        execFileSync(process.execPath, [script, 'compile'], {
          cwd: directory,
          env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
          stdio: 'pipe',
        })
      if (exitCode) {
        expect(run).toThrow()
      } else {
        run()
      }
      expect(
        JSON.parse(readFileSync(join(directory, 'observed.json'), 'utf8'))
          .dependencies,
      ).toBeUndefined()
      expect(readFileSync(join(directory, 'package.json'), 'utf8')).toBe(
        manifest,
      )
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  },
)
