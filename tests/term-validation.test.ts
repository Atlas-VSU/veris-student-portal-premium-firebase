import assert from 'node:assert/strict'
import test from 'node:test'

import { validateTermFilter } from '../src/features/terms/validation.ts'

test('term filters accept active-term, all-term, and complete selected-term inputs', () => {
  assert.deepEqual(validateTermFilter(undefined), { ok: true, data: undefined })
  assert.deepEqual(validateTermFilter({}), { ok: true, data: {} })
  assert.deepEqual(
    validateTermFilter({ academicYear: '2026-2027', semester: '1st' }),
    {
      ok: true,
      data: { academicYear: '2026-2027', semester: '1st' },
    }
  )
})

test('term filters reject partial and malformed selections', () => {
  assert.equal(validateTermFilter({ academicYear: '2026-2027' }).ok, false)
  assert.equal(validateTermFilter({ semester: '1st' }).ok, false)
  assert.equal(
    validateTermFilter({ academicYear: '2026/2027', semester: '1st' }).ok,
    false
  )
  assert.equal(
    validateTermFilter({ academicYear: '2026-2027', semester: 'summer' }).ok,
    false
  )
})
