'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { getActiveTermUseCase } from './usecases/get-active-term.usecase'
import type { ActionResult, Term } from './types'

export async function getActiveTermAction(): Promise<ActionResult<Term | null>> {
  return withAuth('terms:getActive', async () => {
    const term = await getActiveTermUseCase()
    return { ok: true, data: term }
  })
}
