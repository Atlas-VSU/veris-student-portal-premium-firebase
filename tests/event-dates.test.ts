import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { toSafeDate, toIsoString } from '../src/lib/date-format.ts'
import { presentEvent, compareEventDatesDescending } from '../src/features/events/presentation.ts'
import { EventCard } from '../src/features/events/components/event-card.tsx'
import { EventDetailsModal } from '../src/features/events/components/event-details-modal.tsx'
import type { Event } from '../src/features/events/types.ts'

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event', name: 'Test Event', date: null, location: 'Campus',
    majorEvent: false, fineTypeId: '', orgId: 'org', status: 'upcoming',
    attendees: 0, academicYear: '2026-2027', semester: '1', isDeleted: false,
    ...overrides,
  }
}

test('missing and invalid event dates are unavailable without inventing a date', () => {
  for (const date of [null, '', 'invalid']) {
    const result = presentEvent(event({ date }))
    assert.equal(result.date, date)
    assert.equal(result.status, 'unavailable')
  }
})

test('archived takes precedence over manual completion, which takes precedence over date', () => {
  for (const date of [null, 'invalid', '2099-01-01T00:00:00.000Z']) {
    assert.equal(presentEvent(event({ date, status: 'archived', manuallyCompleted: true })).status, 'archived')
    assert.equal(presentEvent(event({ date, manuallyCompleted: true })).status, 'completed')
  }
})

test('valid event dates retain calendar-day lifecycle derivation', () => {
  const today = new Date()
  const past = new Date(today)
  past.setDate(past.getDate() - 2)
  const future = new Date(today)
  future.setDate(future.getDate() + 2)
  for (const [date, expected] of [[past, 'completed'], [today, 'ongoing'], [future, 'upcoming']] as const) {
    assert.equal(presentEvent(event({ date: date.toISOString() })).status, expected)
  }
})

test('descending event dates put null and invalid dates last, after pre-epoch dates', () => {
  const dates = [null, '1960-01-01T00:00:00.000Z', 'invalid', '2026-01-01T00:00:00.000Z']
  assert.deepEqual(dates.map((date) => ({ date })).sort(compareEventDatesDescending).map(({ date }) => date),
    ['2026-01-01T00:00:00.000Z', '1960-01-01T00:00:00.000Z', null, 'invalid'])
  assert.equal(compareEventDatesDescending({ date: null }, { date: null }), 0)
})

test('serialized timestamps reject nonfinite and out-of-range seconds without throwing', () => {
  for (const key of ['seconds', '_seconds']) {
    for (const seconds of [NaN, Infinity, -Infinity, Number.MAX_VALUE, 8.64e12 + 1]) {
      assert.equal(toSafeDate({ [key]: seconds }), null)
      assert.equal(toIsoString({ [key]: seconds }), null)
    }
    assert.equal(toIsoString({ [key]: 0 }), '1970-01-01T00:00:00.000Z')
    assert.equal(toIsoString({ [key]: -1 }), '1969-12-31T23:59:59.000Z')
  }
})

test('event card and details display unavailable dates and status', () => {
  const unavailable = presentEvent(event())
  const card = renderToStaticMarkup(createElement(EventCard, { event: unavailable, onSelect() {} }))
  const details = renderToStaticMarkup(createElement(EventDetailsModal, { event: unavailable, onClose() {} }))
  for (const html of [card, details]) {
    assert.match(html, /Date unavailable/)
    assert.match(html, /[Uu]navailable/)
    assert.doesNotMatch(html, /Archived/)
  }
})
