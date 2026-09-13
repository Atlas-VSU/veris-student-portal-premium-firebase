'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import type { ActionResult, FineParent, FineItem, TermFilter } from './types'

export async function getMyFinesAction(_filter?: TermFilter): Promise<ActionResult<FineParent | null>> {
  return withAuth('fines:getSummary', async (_userId) => {
    // Implementation will call getMyFinesSummaryUseCase({ userId, ...filter })
    return { ok: true, data: null }
  })
}

export async function getMyFineItemsAction(_filter?: TermFilter): Promise<ActionResult<FineItem[]>> {
  return withAuth('fines:listItems', async (_userId) => {
    // Implementation will call getMyFineItemsUseCase({ userId, ...filter })
    return { ok: true, data: [] }
  })
}

