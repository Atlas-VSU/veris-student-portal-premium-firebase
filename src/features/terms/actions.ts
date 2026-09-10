'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import type { ActionResult, Term } from './types'

export async function getActiveTermAction(): Promise<ActionResult<Term | null>> {
  return withAuth('terms:getActive', async () => {
    // Implementation will call getActiveTermUseCase
    return { ok: true, data: null }
  })
}
