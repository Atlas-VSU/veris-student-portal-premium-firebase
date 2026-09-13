'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import type { ActionResult, StudentFee, ProofOfPayment, TermFilter } from './types'

export async function getMyFeesAction(_filter?: TermFilter): Promise<ActionResult<StudentFee[]>> {
  return withAuth('fees:list', async (_userId) => {
    // Implementation will call getMyFeesUseCase({ userId, ...filter })
    return { ok: true, data: [] }
  })
}


export async function submitPaymentProofAction(_payload: Partial<ProofOfPayment>): Promise<ActionResult> {
  return withAuth('fees:submitProof', async (_userId) => {
    // Implementation will call submitPaymentProofUseCase
    return { ok: true, data: undefined }
  })
}
