import type { Event, EventStatus } from './types'

// Events domain business rules
export function determineEventStatus(dateTimestamp: number, manuallyCompleted = false): EventStatus {
  if (manuallyCompleted) return 'completed'
  const today = new Date().setHours(0, 0, 0, 0)
  const eventDay = new Date(dateTimestamp).setHours(0, 0, 0, 0)

  if (eventDay < today) return 'completed'
  if (eventDay === today) return 'ongoing'
  return 'upcoming'
}
