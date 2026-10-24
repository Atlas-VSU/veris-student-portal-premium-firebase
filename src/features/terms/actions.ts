'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { getActiveTermService, getAllTermsService } from './services'
import type { ActionResult, Term } from './types'

export async function getActiveTermAction(): Promise<ActionResult<Term | null>> {
  return withAuth('terms:getActive', async () => {
    const term = await getActiveTermService()
    return { ok: true, data: term }
  })
}

export async function getAllTermsAction(): Promise<ActionResult<Term[]>> {
  return withAuth('terms:getAll', async () => {
    const terms = await getAllTermsService()
    return { ok: true, data: terms }
  })
}
