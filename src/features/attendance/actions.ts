'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { ActiveTermUnavailableError } from '@/features/terms/services'
import { validateTermFilter } from '@/features/terms/validation'
import {
  getMyAttendanceOverviewService,
  getRecentAttendanceService,
} from './services'
import type { ActionResult, AttendanceHistoryItem, AttendanceOverview, TermFilter } from './types'

export async function getMyAttendanceOverviewAction(
  filter?: TermFilter
): Promise<ActionResult<AttendanceOverview>> {
  return withAuth('attendance:getOverview', async (userId, user, eligibleOrganizationIds) => {
    const validatedFilter = validateTermFilter(filter)
    if (!validatedFilter.ok) {
      return { ok: false, error: validatedFilter.error }
    }

    try {
      const overview = await getMyAttendanceOverviewService({
        userId,
        user,
        eligibleOrganizationIds,
        filter: validatedFilter.data,
      })
      return { ok: true, data: overview }
    } catch (error) {
      if (error instanceof ActiveTermUnavailableError) {
        return { ok: false, error: error.message }
      }
      throw error
    }
  })
}

export async function getRecentAttendanceAction(limit = 3): Promise<ActionResult<AttendanceHistoryItem[]>> {
  return withAuth('attendance:getRecent', async (userId, user, eligibleOrganizationIds) => {
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      return { ok: false, error: 'Attendance result limit must be between 1 and 20.' }
    }

    try {
      const recent = await getRecentAttendanceService({
        userId,
        user,
        eligibleOrganizationIds,
        limit,
      })
      return { ok: true, data: recent }
    } catch (error) {
      if (error instanceof ActiveTermUnavailableError) {
        return { ok: false, error: error.message }
      }
      throw error
    }
  })
}
