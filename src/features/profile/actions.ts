'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import type { ActionResult, StudentProfile, UpdateProfileInput } from './types'

export async function getMyProfileAction(): Promise<ActionResult<StudentProfile | null>> {
  return withAuth('profile:get', async (_userId) => {
    // Implementation will call getMyProfileUseCase({ userId })
    return { ok: true, data: null }
  })
}

export async function updateMyProfileAction(_input: UpdateProfileInput): Promise<ActionResult> {
  return withAuth('profile:update', async (_userId) => {
    // Implementation will call updateMyProfileUseCase({ userId, input })
    return { ok: true, data: undefined }
  })
}
