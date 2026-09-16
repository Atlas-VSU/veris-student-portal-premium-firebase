import { getActiveTermUseCase } from '@/features/terms/usecases/get-active-term.usecase'
import { getActiveEventsUseCase } from './usecases/get-active-events.usecase'
import { getOrganizationsMapUseCase } from './usecases/get-organizations-map.usecase'
import { getStudentAffiliationUseCase } from '@/features/profile/usecases/get-student-affiliation.usecase'
import { toSafeDate } from '@/lib/date-format'
import type { Event, EventStatus, TermFilter } from './types'

export function determineEventStatus(dateMillis: number, manuallyCompleted = false): EventStatus {
  if (manuallyCompleted) return 'completed'
  const today = new Date().setHours(0, 0, 0, 0)
  const eventDay = new Date(dateMillis).setHours(0, 0, 0, 0)

  if (eventDay < today) return 'completed'
  if (eventDay === today) return 'ongoing'
  return 'upcoming'
}

export async function getEventsService(userId?: string, filter?: TermFilter): Promise<Event[]> {
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

  const [rawEvents, orgMap, affiliation] = await Promise.all([
    getActiveEventsUseCase({
      academicYear,
      semester,
    }),
    getOrganizationsMapUseCase(),
    userId ? getStudentAffiliationUseCase(userId) : Promise.resolve(null),
  ])

  // Filter events based on student's affiliation & Access Level (1, 2, 3)
  const scopedEvents = rawEvents.filter((event) => {
    const level = event.accessLevelEvent ?? 3
    if (level === 3) return true // Campus(all students)

    if (!affiliation) return true // If no affiliation context, default to open

    if (level === 2) {
      // Faculty level
      if (event.facultyId && affiliation.facultyId && event.facultyId !== affiliation.facultyId) {
        return false
      }
      return true
    }

    if (level === 1) {
      // Department level
      if (event.programId && affiliation.programId && event.programId !== affiliation.programId) {
        return false
      }
      return true
    }

    return true
  })

  return scopedEvents.map((event) => {
    const dateMillis = toSafeDate(event.date)?.getTime() ?? Date.now()
    const computedStatus =
      event.status === 'archived' || event.manuallyCompleted
        ? event.status
        : determineEventStatus(dateMillis, event.manuallyCompleted)

    const org = event.orgId ? orgMap.get(event.orgId) : undefined
    const orgName = org?.name || 'University Organization'

    return {
      ...event,
      orgName,
      status: computedStatus,
    }
  })
}

export async function getActiveEventsService(userId?: string): Promise<Event[]> {
  return getEventsService(userId)
}
