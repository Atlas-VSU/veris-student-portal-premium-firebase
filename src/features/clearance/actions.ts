'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import type { ActionResult, ClearanceStatus } from './types'

export async function getMyClearanceAction(): Promise<ActionResult<ClearanceStatus | null>> {
  return withAuth('clearance:getMyStatus', async (_userId) => {
    // Implementation will call getMyClearanceService({ userId })
    return { ok: true, data: null }
  })
}
