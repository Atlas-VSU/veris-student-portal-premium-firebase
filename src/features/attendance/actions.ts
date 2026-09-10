'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import {
  getMyAttendanceHistoryService,
  getMyAttendanceStatsService,
  getRecentAttendanceService,
} from './services'
import type { ActionResult, AttendanceHistoryItem, AttendanceStats } from './types'

export async function getMyAttendanceAction(): Promise<ActionResult<AttendanceHistoryItem[]>> {
  return withAuth('attendance:listHistory', async (userId) => {
    const history = await getMyAttendanceHistoryService(userId)
    return { ok: true, data: history }
  })
}

export async function getMyAttendanceStatsAction(): Promise<ActionResult<AttendanceStats>> {
  return withAuth('attendance:getStats', async (userId) => {
    const stats = await getMyAttendanceStatsService(userId)
    return { ok: true, data: stats }
  })
}

export async function getRecentAttendanceAction(limit = 3): Promise<ActionResult<AttendanceHistoryItem[]>> {
  return withAuth('attendance:getRecent', async (userId) => {
    const recent = await getRecentAttendanceService(userId, limit)
    return { ok: true, data: recent }
  })
}
