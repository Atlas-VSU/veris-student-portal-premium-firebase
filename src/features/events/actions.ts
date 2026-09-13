'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { getEventsService, getActiveEventsService } from './services'
import { getEventByIdUseCase } from './usecases/get-event-by-id.usecase'
import type { ActionResult, Event, TermFilter } from './types'

export async function getEventsAction(filter?: TermFilter): Promise<ActionResult<Event[]>> {
  return withAuth('events:list', async () => {
    const events = await getEventsService(filter)
    return { ok: true, data: events }
  })
}

export async function getActiveEventsAction(): Promise<ActionResult<Event[]>> {
  return withAuth('events:listActive', async () => {
    const events = await getActiveEventsService()
    return { ok: true, data: events }
  })
}

export async function getEventByIdAction(eventId: string): Promise<ActionResult<Event | null>> {
  return withAuth('events:getById', async () => {
    const event = await getEventByIdUseCase({ eventId })
    return { ok: true, data: event }
  })
}

