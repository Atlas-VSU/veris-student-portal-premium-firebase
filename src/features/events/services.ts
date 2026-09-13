import { getActiveTermUseCase } from '@/features/terms/usecases/get-active-term.usecase'
import { getActiveEventsUseCase } from './usecases/get-active-events.usecase'
import type { Event, EventStatus, TermFilter } from './types'

export function determineEventStatus(dateMillis: number, manuallyCompleted = false): EventStatus {
  if (manuallyCompleted) return 'completed'
  const today = new Date().setHours(0, 0, 0, 0)
  const eventDay = new Date(dateMillis).setHours(0, 0, 0, 0)

  if (eventDay < today) return 'completed'
  if (eventDay === today) return 'ongoing'
  return 'upcoming'
}

export async function getEventsService(filter?: TermFilter): Promise<Event[]> {
  let academicYear = filter?.academicYear
  let semester = filter?.semester

  if (!academicYear || !semester) {
    const activeTerm = await getActiveTermUseCase()
    if (!activeTerm) {
      return []
    }
    academicYear = academicYear || activeTerm.AY
    semester = semester || activeTerm.semester
  }

  const events = await getActiveEventsUseCase({
    academicYear,
    semester,
  })

  return events.map((event) => {
    if (event.status === 'archived' || event.manuallyCompleted) {
      return event
    }
    const computedStatus = determineEventStatus(event.date?.toMillis?.() ?? 0, event.manuallyCompleted)
    return {
      ...event,
      status: computedStatus,
    }
  })
}

export async function getActiveEventsService(): Promise<Event[]> {
  return getEventsService()
}

