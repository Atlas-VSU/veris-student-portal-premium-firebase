'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import type { ActionResult, AttendanceRecord } from './types'

export async function getMyAttendanceAction(): Promise<ActionResult<AttendanceRecord[]>> {
  return withAuth('attendance:list', async (_userId) => {
    // Implementation will call getMyAttendanceUseCase({ userId })
    return { ok: true, data: [] }
  })
}
