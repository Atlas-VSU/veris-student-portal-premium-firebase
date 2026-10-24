import { toSafeDate } from '../../lib/date-format'
import type { Event, EventStatus } from './types'

export function determineEventStatus(dateMillis: number, manuallyCompleted = false): EventStatus {
  if (manuallyCompleted) return 'completed'
  const today = new Date().setHours(0, 0, 0, 0)
  const eventDay = new Date(dateMillis).setHours(0, 0, 0, 0)

  if (eventDay < today) return 'completed'
  if (eventDay === today) return 'ongoing'
  return 'upcoming'
}

export function presentEvent(event: Event): Event {
  const date = toSafeDate(event.date)
  const status = event.status === 'archived'
    ? 'archived'
    : event.manuallyCompleted
      ? 'completed'
      : date
        ? determineEventStatus(date.getTime())
        : 'unavailable'

  return { ...event, status }
}

export function compareEventDatesDescending(a: Pick<Event, 'date'>, b: Pick<Event, 'date'>): number {
  const aTime = toSafeDate(a.date)?.getTime() ?? null
  const bTime = toSafeDate(b.date)?.getTime() ?? null
  if (aTime === null) return bTime === null ? 0 : 1
  if (bTime === null) return -1
  return bTime - aTime
}
