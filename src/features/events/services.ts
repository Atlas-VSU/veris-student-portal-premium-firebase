import { getActiveTermUseCase } from '@/features/terms/usecases/get-active-term.usecase'
import { getActiveEventsUseCase } from './usecases/get-active-events.usecase'
import { getEventByIdUseCase } from './usecases/get-event-by-id.usecase'
import { toSafeDate } from '@/lib/date-format'
import type { SessionUser } from '@/features/auth/types'
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
  student: SessionUser
): boolean {
  if (event.accessLevelEvent === 3) {
    return true
  }

  if (event.accessLevelEvent === 2) {
    return Boolean(
      event.facultyId &&
      student.facultyId &&
      event.facultyId === student.facultyId
    )
  }

  if (event.accessLevelEvent === 1) {
    return Boolean(
      event.programId &&
      student.programId &&
      event.programId === student.programId
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

export async function getEventsService(user: SessionUser, filter?: TermFilter): Promise<Event[]> {
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

  const rawEvents = await getActiveEventsUseCase({
    academicYear,
    semester,
  })

  return rawEvents
    .filter((event) => canStudentViewEvent(event, user))
    .map(presentEvent)
}

export async function getActiveEventsService(user: SessionUser): Promise<Event[]> {
  return getEventsService(user)
}

export async function getEventByIdService(
  user: SessionUser,
  eventId: string
): Promise<Event | null> {
  const event = await getEventByIdUseCase({ eventId })

  if (!event || !canStudentViewEvent(event, user)) {
    return null
  }

  return presentEvent(event)
}
