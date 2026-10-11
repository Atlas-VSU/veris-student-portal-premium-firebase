'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { getEventsService, getActiveEventsService, getEventByIdService } from './services'
import type { ActionResult, Event, TermFilter } from './types'

export async function getEventsAction(filter?: TermFilter): Promise<ActionResult<Event[]>> {
  return withAuth('events:list', async (_userId, user, eligibleOrganizationIds) => {
    const events = await getEventsService(user, eligibleOrganizationIds, filter)
    return { ok: true, data: events }
  })
}

export async function getActiveEventsAction(): Promise<ActionResult<Event[]>> {
  return withAuth('events:listActive', async (_userId, user, eligibleOrganizationIds) => {
    const events = await getActiveEventsService(user, eligibleOrganizationIds)
    return { ok: true, data: events }
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
