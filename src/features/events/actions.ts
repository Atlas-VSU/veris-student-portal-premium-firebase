'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { getEventsService, getActiveEventsService, getEventByIdService } from './services'
import type { ActionResult, Event, TermFilter } from './types'

export async function getEventsAction(filter?: TermFilter): Promise<ActionResult<Event[]>> {
  return withAuth('events:list', async (userId) => {
    const events = await getEventsService(userId, filter)
    return { ok: true, data: events }
  })
}

export async function getActiveEventsAction(): Promise<ActionResult<Event[]>> {
  return withAuth('events:listActive', async (userId) => {
    const events = await getActiveEventsService(userId)
    return { ok: true, data: events }
  })
}

export async function getEventByIdAction(eventId: string): Promise<ActionResult<Event | null>> {
  return withAuth('events:getById', async (userId) => {
    if (!eventId.trim()) {
      return { ok: false, error: 'Event ID is required.' }
    }

    const event = await getEventByIdService(userId, eventId)
    return { ok: true, data: event }
  })
}
