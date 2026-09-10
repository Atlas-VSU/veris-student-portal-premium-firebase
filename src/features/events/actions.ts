'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import type { ActionResult, Event } from './types'

export async function getMyEventsAction(): Promise<ActionResult<Event[]>> {
  return withAuth('events:list', async (_userId) => {
    // Implementation will call getMyEventsUseCase({ userId })
    return { ok: true, data: [] }
  })
}
