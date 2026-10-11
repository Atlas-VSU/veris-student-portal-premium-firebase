import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateAttendanceStats,
  matchesTerm,
  resolveAttendanceFineState,
} from '../src/features/attendance/calculations.ts'
import type { AttendanceHistoryItem } from '../src/features/attendance/types.ts'
import type { TermFilter } from '../src/features/terms/types.ts'

test('term filtering fails closed when event term data is unavailable', () => {
  const activeTerm: TermFilter = { academicYear: '2026-2027', semester: '1st' }

  assert.equal(matchesTerm(activeTerm, '2026-2027', '1st'), true)
  assert.equal(matchesTerm(activeTerm, '2025-2026', '1st'), false)
  assert.equal(matchesTerm(activeTerm, undefined, undefined), false)
  assert.equal(matchesTerm(undefined, undefined, undefined), true)
})

test('attendance totals count only full attendance', () => {
  const history: AttendanceHistoryItem[] = [
    historyItem('present'),
    historyItem('partially present'),
    historyItem('absent'),
  ]

  assert.deepEqual(calculateAttendanceStats(history), {
    presentCount: 1,
    partialCount: 1,
    totalAttended: 1,
    absencesCount: 1,
  })
})

test('attendance fine states distinguish review, payment, and waiver outcomes', () => {
  assert.equal(
    resolveAttendanceFineState({ isWaived: false, isPaid: false, isPending: false }),
    'outstanding'
  )
  assert.equal(
    resolveAttendanceFineState({ isWaived: false, isPaid: false, isPending: true }),
    'pending_review'
  )
  assert.equal(
    resolveAttendanceFineState({ isWaived: false, isPaid: true, isPending: true }),
    'paid'
  )
  assert.equal(
    resolveAttendanceFineState({ isWaived: true, isPaid: true, isPending: true }),
    'waived'
  )
})

function historyItem(
  status: AttendanceHistoryItem['status']
): AttendanceHistoryItem {
  return {
    id: status,
    eventId: status,
    eventName: status,
    majorEvent: false,
    status,
  }
}
