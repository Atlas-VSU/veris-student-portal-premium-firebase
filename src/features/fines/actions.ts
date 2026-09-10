'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import type { ActionResult, FineParent, FineItem } from './types'

export async function getMyFinesAction(): Promise<ActionResult<FineParent | null>> {
  return withAuth('fines:getSummary', async (_userId) => {
    // Implementation will call getMyFinesSummaryUseCase({ userId })
    return { ok: true, data: null }
  })
}

export async function getMyFineItemsAction(): Promise<ActionResult<FineItem[]>> {
  return withAuth('fines:listItems', async (_userId) => {
    // Implementation will call getMyFineItemsUseCase({ userId })
    return { ok: true, data: [] }
  })
}
