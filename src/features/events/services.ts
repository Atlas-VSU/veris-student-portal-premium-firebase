import { resolveTermFilterService } from '@/features/terms/services'
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
  student: SessionUser,
  eligibleOrganizationIds: ReadonlySet<string>
): boolean {
  if (!event.orgId || !eligibleOrganizationIds.has(event.orgId)) {
    return false
  }

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

export async function getEventsService(
  user: SessionUser,
  eligibleOrganizationIds: readonly string[],
  filter?: TermFilter
): Promise<Event[]> {
  const resolvedFilter = await resolveTermFilterService(filter)

  const rawEvents = await getActiveEventsUseCase({
    academicYear: resolvedFilter.academicYear,
    semester: resolvedFilter.semester,
  })
  const eligibleOrganizationIdSet = new Set(eligibleOrganizationIds)

  return rawEvents
    .filter((event) => canStudentViewEvent(event, user, eligibleOrganizationIdSet))
    .map(presentEvent)
}

export async function getActiveEventsService(
  user: SessionUser,
  eligibleOrganizationIds: readonly string[]
): Promise<Event[]> {
  return getEventsService(user, eligibleOrganizationIds)
}

export async function getEventByIdService(
  user: SessionUser,
  eligibleOrganizationIds: readonly string[],
  eventId: string
): Promise<Event | null> {
  const event = await getEventByIdUseCase({ eventId })

  if (
    !event ||
    !canStudentViewEvent(event, user, new Set(eligibleOrganizationIds))
  ) {
    return null
  }

  return presentEvent(event)
}
