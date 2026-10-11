'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import {
  getMyAttendanceOverviewService,
  getRecentAttendanceService,
} from './services'
import type { ActionResult, AttendanceHistoryItem, AttendanceOverview, TermFilter } from './types'

export async function getMyAttendanceOverviewAction(
  filter?: TermFilter
): Promise<ActionResult<AttendanceOverview>> {
  return withAuth('attendance:getOverview', async (userId, user, eligibleOrganizationIds) => {
    const overview = await getMyAttendanceOverviewService({
      userId,
      user,
      eligibleOrganizationIds,
      filter,
    })
    return { ok: true, data: overview }
  })
}

export async function getRecentAttendanceAction(limit = 3): Promise<ActionResult<AttendanceHistoryItem[]>> {
  return withAuth('attendance:getRecent', async (userId, user, eligibleOrganizationIds) => {
    const recent = await getRecentAttendanceService({
      userId,
      user,
      eligibleOrganizationIds,
      limit,
    })
    return { ok: true, data: recent }
  })
}
