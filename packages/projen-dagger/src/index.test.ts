import { expect, test } from '@langri-sha/vitest'
import { Project } from 'projen'
import { synthSnapshot } from 'projen/lib/util/synth'

import { Dagger } from './index'

test('defaults', () => {
  const project = new Project({
    name: 'test-project',
  })

  new Dagger(project)

  project.synth()
  expect(synthSnapshot(project)).toMatchSnapshot()
})
