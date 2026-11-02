import { expect, test } from '@langri-sha/vitest'

import { GitAttributesFile as SubpathGitAttributesFile } from './lib/gitattributes.js'
import { NodePackage as SubpathNodePackage } from './lib/node-package.js'
import { ProjenrcFile as SubpathProjenrcFile } from './lib/projenrc.js'

import { GitAttributesFile, NodePackage, ProjenrcFile } from './index.js'

test('root component exports preserve their subpath identities', () => {
  expect(GitAttributesFile).toBe(SubpathGitAttributesFile)
  expect(NodePackage).toBe(SubpathNodePackage)
  expect(ProjenrcFile).toBe(SubpathProjenrcFile)
})
