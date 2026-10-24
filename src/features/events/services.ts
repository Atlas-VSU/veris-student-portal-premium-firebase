import { resolveTermFilterService } from '@/features/terms/services'
import { getActiveEventsUseCase } from './usecases/get-active-events.usecase'
import { getEventByIdUseCase } from './usecases/get-event-by-id.usecase'
import { getEventsByIdsUseCase } from './usecases/get-events-by-ids.usecase'
import { presentEvent } from './presentation'
export { determineEventStatus } from './presentation'
import type { SessionUser } from '@/features/auth/types'
import type { Event, TermFilter } from './types'

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

export async function getEventsService(
  user: SessionUser,
  eligibleOrganizationIds: readonly string[],
  filter?: TermFilter
): Promise<Event[]> {
  const resolvedFilter = await resolveTermFilterService(filter)

  const rawEvents = await getActiveEventsUseCase({
    eligibleOrganizationIds,
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

export async function getEventsByIdsService(
  user: SessionUser,
  eligibleOrganizationIds: readonly string[],
  eventIds: readonly string[]
): Promise<Event[]> {
  const events = await getEventsByIdsUseCase({ eventIds })
  const eligibleOrganizationIdSet = new Set(eligibleOrganizationIds)

  return events
    .filter((event) => canStudentViewEvent(event, user, eligibleOrganizationIdSet))
    .map(presentEvent)
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
