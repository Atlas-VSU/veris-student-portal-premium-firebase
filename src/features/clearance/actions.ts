'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import type { ActionResult, ClearanceStatus, TermFilter } from './types'

export async function getMyClearanceAction(_filter?: TermFilter): Promise<ActionResult<ClearanceStatus | null>> {
  return withAuth('clearance:getMyStatus', async (_userId) => {
    // Implementation will call getMyClearanceService({ userId, ...filter })
    return { ok: true, data: null }
  })
}

