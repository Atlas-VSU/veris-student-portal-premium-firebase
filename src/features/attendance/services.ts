import { getEventByIdUseCase } from '@/features/events/usecases/get-event-by-id.usecase'
import { getMyAttendanceUseCase } from './usecases/get-my-attendance.usecase'
import { getRecentAttendanceUseCase } from './usecases/get-recent-attendance.usecase'
import { getAttendanceStatsUseCase } from './usecases/get-attendance-stats.usecase'
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceHistoryItem,
  AttendanceStats,
  TermFilter,
} from './types'

export function resolveAttendanceStatus(record: Partial<AttendanceRecord>): AttendanceStatus {
  return record.timeIn && record.timeOut ? 'present' : 'partially present'
}

async function enrichAttendanceRecords(records: AttendanceRecord[]): Promise<AttendanceHistoryItem[]> {
  const uniqueEventIds = Array.from(new Set(records.map((r) => r.eventId).filter(Boolean)))

  const eventEntries = await Promise.all(
    uniqueEventIds.map(async (eventId) => {
      const event = await getEventByIdUseCase({ eventId })
      return [eventId, event] as const
    })
  )
  const eventMap = new Map(eventEntries)

  return records.map((record) => {
    const event = eventMap.get(record.eventId)
    return {
      id: record.id,
      eventId: record.eventId,
      eventName: event?.name || 'University Event',
      eventDate: event?.date,
      location: event?.location || 'Campus',
      majorEvent: event?.majorEvent ?? false,
      timeIn: record.timeIn,
      timeOut: record.timeOut,
      status: record.status,
      remark: record.remark,
    }
  })
}

export async function getMyAttendanceHistoryService(
  userId: string,
  filter?: TermFilter
): Promise<AttendanceHistoryItem[]> {
  const records = await getMyAttendanceUseCase({ userId })
  const enriched = await enrichAttendanceRecords(records)

  if (filter?.academicYear || filter?.semester) {
    const eventCache = new Map<string, { academicYear?: string; semester?: string } | null>()
    const filtered: AttendanceHistoryItem[] = []

    for (const item of enriched) {
      let event = eventCache.get(item.eventId)
      if (event === undefined) {
        const fetched = await getEventByIdUseCase({ eventId: item.eventId })
        event = fetched ? { academicYear: fetched.academicYear, semester: fetched.semester } : null
        eventCache.set(item.eventId, event)
      }

      if (!event) continue
      if (filter.academicYear && event.academicYear !== filter.academicYear) continue
      if (filter.semester && event.semester !== filter.semester) continue

      filtered.push(item)
    }

    return filtered
  }

  return enriched
}

export async function getRecentAttendanceService(
  userId: string,
  limit = 3
): Promise<AttendanceHistoryItem[]> {
  const records = await getRecentAttendanceUseCase({ userId, limit })
  return enrichAttendanceRecords(records)
}

export async function getMyAttendanceStatsService(
  userId: string,
  filter?: TermFilter
): Promise<AttendanceStats> {
  return getAttendanceStatsUseCase({
    userId,
    academicYear: filter?.academicYear,
    semester: filter?.semester,
  })
}

