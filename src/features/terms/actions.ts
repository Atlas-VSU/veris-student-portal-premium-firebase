'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { getActiveTermUseCase } from './usecases/get-active-term.usecase'
import { getAllTermsUseCase } from './usecases/get-all-terms.usecase'
import type { ActionResult, Term } from './types'

export async function getActiveTermAction(): Promise<ActionResult<Term | null>> {
  return withAuth('terms:getActive', async () => {
    const term = await getActiveTermUseCase()
    return { ok: true, data: term }
  })
}

export async function getAllTermsAction(): Promise<ActionResult<Term[]>> {
  return withAuth('terms:getAll', async () => {
    const terms = await getAllTermsUseCase()
    return { ok: true, data: terms }
  })
}

