import { getActiveTermUseCase } from '@/features/terms/usecases/get-active-term.usecase'
import { getActiveEventsUseCase } from './usecases/get-active-events.usecase'
import { getEventByIdUseCase } from './usecases/get-event-by-id.usecase'
import { getStudentAffiliationUseCase } from '@/features/profile/usecases/get-student-affiliation.usecase'
import { toSafeDate } from '@/lib/date-format'
import type { StudentAffiliation } from '@/features/profile/usecases/get-student-affiliation.usecase'
import type { Event, EventStatus, TermFilter } from './types'

export function determineEventStatus(dateMillis: number, manuallyCompleted = false): EventStatus {
  if (manuallyCompleted) return 'completed'
  const today = new Date().setHours(0, 0, 0, 0)
  const eventDay = new Date(dateMillis).setHours(0, 0, 0, 0)

  if (eventDay < today) return 'completed'
  if (eventDay === today) return 'ongoing'
  return 'upcoming'
}

function canStudentViewEvent(
  event: Event,
  affiliation: StudentAffiliation | null
): boolean {
  if (event.accessLevelEvent === 3) {
    return true
  }

  if (event.accessLevelEvent === 2) {
    return Boolean(
      event.facultyId &&
      affiliation?.facultyId &&
      event.facultyId === affiliation.facultyId
    )
  }

  if (event.accessLevelEvent === 1) {
    return Boolean(
      event.programId &&
      affiliation?.programId &&
      event.programId === affiliation.programId
    )
  }

  return false
}

function presentEvent(event: Event): Event {
  const dateMillis = toSafeDate(event.date)?.getTime() ?? Date.now()
  const computedStatus =
    event.status === 'archived' || event.manuallyCompleted
      ? event.status
      : determineEventStatus(dateMillis, event.manuallyCompleted)

  return {
    ...event,
    orgName: event.orgName || 'University Organization',
    status: computedStatus,
  }
}

export async function getEventsService(userId: string, filter?: TermFilter): Promise<Event[]> {
  let academicYear = filter?.academicYear
  let semester = filter?.semester

  // If filter is explicitly undefined (default initial load), fallback to active term
  if (filter === undefined) {
    const activeTerm = await getActiveTermUseCase()
    if (activeTerm) {
      academicYear = activeTerm.AY
      semester = activeTerm.semester
    }
  }

  const [rawEvents, affiliation] = await Promise.all([
    getActiveEventsUseCase({
      academicYear,
      semester,
    }),
    getStudentAffiliationUseCase(userId),
  ])

  return rawEvents
    .filter((event) => canStudentViewEvent(event, affiliation))
    .map(presentEvent)
}

export async function getActiveEventsService(userId: string): Promise<Event[]> {
  return getEventsService(userId)
}

export async function getEventByIdService(
  userId: string,
  eventId: string
): Promise<Event | null> {
  const [event, affiliation] = await Promise.all([
    getEventByIdUseCase({ eventId }),
    getStudentAffiliationUseCase(userId),
  ])

  if (!event || !canStudentViewEvent(event, affiliation)) {
    return null
  }

  return presentEvent(event)
}
