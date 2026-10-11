'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { ActiveTermUnavailableError } from '@/features/terms/services'
import { validateTermFilter } from '@/features/terms/validation'
import { getEventsService, getActiveEventsService, getEventByIdService } from './services'
import type { ActionResult, Event, TermFilter } from './types'

export async function getEventsAction(filter?: TermFilter): Promise<ActionResult<Event[]>> {
  return withAuth('events:list', async (_userId, user, eligibleOrganizationIds) => {
    const validatedFilter = validateTermFilter(filter)
    if (!validatedFilter.ok) {
      return { ok: false, error: validatedFilter.error }
    }

    try {
      const events = await getEventsService(
        user,
        eligibleOrganizationIds,
        validatedFilter.data
      )
      return { ok: true, data: events }
    } catch (error) {
      if (error instanceof ActiveTermUnavailableError) {
        return { ok: false, error: error.message }
      }
      throw error
    }
  })
}

export async function getActiveEventsAction(): Promise<ActionResult<Event[]>> {
  return withAuth('events:listActive', async (_userId, user, eligibleOrganizationIds) => {
    try {
      const events = await getActiveEventsService(user, eligibleOrganizationIds)
      return { ok: true, data: events }
    } catch (error) {
      if (error instanceof ActiveTermUnavailableError) {
        return { ok: false, error: error.message }
      }
      throw error
    }
  })
}

export async function getEventByIdAction(eventId: string): Promise<ActionResult<Event | null>> {
  return withAuth('events:getById', async (_userId, user, eligibleOrganizationIds) => {
    if (!eventId.trim()) {
      return { ok: false, error: 'Event ID is required.' }
    }

    const event = await getEventByIdService(user, eligibleOrganizationIds, eventId)
    return { ok: true, data: event }
  })
}
