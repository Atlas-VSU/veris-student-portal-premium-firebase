import assert from 'node:assert/strict'
import test from 'node:test'

import { mapWithConcurrency } from '../src/lib/map-with-concurrency.ts'

test('maps all values in input order while bounding active work', async () => {
  let activeCount = 0
  let maximumActiveCount = 0

  const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
    activeCount += 1
    maximumActiveCount = Math.max(maximumActiveCount, activeCount)

    await new Promise((resolve) => setTimeout(resolve, (7 - value) * 2))

    activeCount -= 1
    return value * 10
  })

  assert.deepEqual(results, [10, 20, 30, 40, 50, 60])
  assert.equal(maximumActiveCount, 2)
})

test('rejects invalid concurrency limits', async () => {
  await assert.rejects(
    mapWithConcurrency([1], 0, async (value) => value),
    RangeError
  )
})
