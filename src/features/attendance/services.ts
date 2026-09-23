import { getEventByIdUseCase } from '@/features/events/usecases/get-event-by-id.usecase'
import { getMyAttendanceUseCase } from './usecases/get-my-attendance.usecase'
import { getMyAttendanceFinesUseCase } from './usecases/get-my-attendance-fines.usecase'
import { getAttendanceFineItemsUseCase } from './usecases/get-attendance-fine-items.usecase'
import { toSafeDate, toIsoString } from '@/lib/date-format'
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

interface FineItemInfo {
  id: string
  parentFineId: string
  eventId: string
  eventName?: string
  eventDate?: unknown
  amount: number
  reason?: string
  isPending?: boolean
  orgId: string
  orgName?: string
  academicYear?: string
  semester?: string
}

async function getStudentAbsenceFineItems(userId: string, filter?: TermFilter): Promise<FineItemInfo[]> {
  const fineParents = await getMyAttendanceFinesUseCase({ userId, filter })
  const itemGroups = await Promise.all(
    fineParents.map(async (fine) => {
      const items = await getAttendanceFineItemsUseCase({ fineId: fine.id })

      return items.map((item) => ({
        ...item,
        parentFineId: fine.id,
        orgId: fine.orgId,
        orgName: fine.orgName,
        academicYear: fine.academicYear,
        semester: fine.semester,
      }))
    })
  )

  return itemGroups.flat()
}

export async function getMyAttendanceHistoryService(
  userId: string,
  filter?: TermFilter
): Promise<AttendanceHistoryItem[]> {
  const [records, absenceFines] = await Promise.all([
    getMyAttendanceUseCase({ userId }),
    getStudentAbsenceFineItems(userId, filter),
  ])

  const fineByEventId = new Map<string, FineItemInfo>()
  absenceFines.forEach((fine) => {
    fineByEventId.set(fine.eventId, fine)
  })

  const eventCache = new Map<string, Awaited<ReturnType<typeof getEventByIdUseCase>>>()
  async function getCachedEvent(eventId: string) {
    if (!eventId) return null
    if (!eventCache.has(eventId)) {
      const ev = await getEventByIdUseCase({ eventId })
      eventCache.set(eventId, ev)
    }
    return eventCache.get(eventId) || null
  }

  const unifiedList: AttendanceHistoryItem[] = []
  const attendedEventIds = new Set<string>()

  // 1. Process Check-in records (Present / Partially Present)
  for (const record of records) {
    const event = await getCachedEvent(record.eventId)
    if (filter?.academicYear && event?.academicYear && event.academicYear !== filter.academicYear) {
      continue
    }
    if (filter?.semester && event?.semester && event.semester !== filter.semester) {
      continue
    }

    attendedEventIds.add(record.eventId)
    const fineInfo = fineByEventId.get(record.eventId)
    const orgId = event?.orgId || record.orgId
    const orgName = event?.orgName || fineInfo?.orgName || 'University Organization'

    unifiedList.push({
      id: record.id,
      eventId: record.eventId,
      eventName: event?.name || 'University Event',
      eventDate: event?.date || record.timeIn || null,
      location: event?.location || 'Campus',
      orgId,
      orgName,
      majorEvent: event?.majorEvent ?? false,
      timeIn: record.timeIn,
      timeOut: record.timeOut,
      status: record.status,
      remark: record.remark || fineInfo?.reason || undefined,
      fineAmount: fineInfo?.amount,
      isPendingAppeal: fineInfo?.isPending,
      parentFineId: fineInfo?.parentFineId,
      fineItemId: fineInfo?.id,
    })
  }

  // 2. Process Full Absence Infractions (Absent)
  for (const fine of absenceFines) {
    if (attendedEventIds.has(fine.eventId)) {
      continue // Already captured above
    }

    const event = await getCachedEvent(fine.eventId)
    if (filter?.academicYear && event?.academicYear && event.academicYear !== filter.academicYear) {
      continue
    }
    if (filter?.semester && event?.semester && event.semester !== filter.semester) {
      continue
    }

    const orgId = event?.orgId || fine.orgId
    const orgName = event?.orgName || fine.orgName || 'University Organization'
    const eventDateStr = event?.date || toIsoString(fine.eventDate)

    unifiedList.push({
      id: `fine_${fine.id}`,
      eventId: fine.eventId,
      eventName: event?.name || fine.eventName || 'University Event',
      eventDate: eventDateStr,
      location: event?.location || 'Campus',
      orgId,
      orgName,
      majorEvent: event?.majorEvent ?? false,
      timeIn: null,
      timeOut: null,
      status: 'absent',
      remark: fine.reason || 'Absent from event (infraction assessed)',
      fineAmount: fine.amount,
      isPendingAppeal: fine.isPending,
      parentFineId: fine.parentFineId,
      fineItemId: fine.id,
    })
  }

  // Sort chronologically descending
  return unifiedList.sort((a, b) => {
    const timeA = toSafeDate(a.eventDate || a.timeIn)?.getTime() ?? 0
    const timeB = toSafeDate(b.eventDate || b.timeIn)?.getTime() ?? 0
    return timeB - timeA
  })
}

export async function getRecentAttendanceService(
  userId: string,
  limit = 3
): Promise<AttendanceHistoryItem[]> {
  const history = await getMyAttendanceHistoryService(userId)
  return history.slice(0, limit)
}

export async function getMyAttendanceStatsService(
  userId: string,
  filter?: TermFilter
): Promise<AttendanceStats> {
  const history = await getMyAttendanceHistoryService(userId, filter)
  const presentCount = history.filter((item) => item.status === 'present').length
  const partialCount = history.filter((item) => item.status === 'partially present').length
  const absences = history.filter((item) => item.status === 'absent')

  return {
    presentCount,
    partialCount,
    totalAttended: presentCount + partialCount,
    absencesCount: absences.length,
    pendingAppealsCount: absences.filter((item) => item.isPendingAppeal).length,
  }
}
