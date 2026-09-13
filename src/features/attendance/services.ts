import { adminDb } from '@/lib/firebase/admin'
import { getEventByIdUseCase } from '@/features/events/usecases/get-event-by-id.usecase'
import { getOrganizationsMapUseCase } from '@/features/events/usecases/get-organizations-map.usecase'
import { getMyAttendanceUseCase } from './usecases/get-my-attendance.usecase'
import { getAttendanceStatsUseCase } from './usecases/get-attendance-stats.usecase'
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
  academicYear?: string
  semester?: string
}

async function getStudentAbsenceFineItems(userId: string, filter?: TermFilter): Promise<FineItemInfo[]> {
  const fineItems: FineItemInfo[] = []
  try {
    let finesQuery = adminDb.collection('fines').where('userId', '==', userId)

    if (filter?.academicYear) {
      finesQuery = finesQuery.where('academicYear', '==', filter.academicYear)
    }
    if (filter?.semester) {
      finesQuery = finesQuery.where('semester', '==', filter.semester)
    }

    const finesSnapshot = await finesQuery.get()

    for (const fineDoc of finesSnapshot.docs) {
      const fineData = fineDoc.data()
      if (fineData.isArchived === true || fineData.metadata?.isArchived === true) {
        continue
      }

      const itemsSnapshot = await fineDoc.ref.collection('fineItems').get()
      itemsSnapshot.docs.forEach((itemDoc) => {
        const itemData = itemDoc.data()
        if (itemData.eventId && !itemData.isArchived && !itemData.isWaived) {
          fineItems.push({
            id: itemDoc.id,
            parentFineId: fineDoc.id,
            eventId: itemData.eventId,
            eventName: itemData.eventName,
            eventDate: itemData.eventDate,
            amount: itemData.amount ?? 0,
            reason: itemData.reason,
            isPending: itemData.isPending === true,
            orgId: fineData.orgId,
            academicYear: fineData.academicYear,
            semester: fineData.semester,
          })
        }
      })
    }
  } catch (err) {
    console.error('Failed to fetch student fine items in getStudentAbsenceFineItems:', err)
  }
  return fineItems
}

export async function getMyAttendanceHistoryService(
  userId: string,
  filter?: TermFilter
): Promise<AttendanceHistoryItem[]> {
  const [records, absenceFines, orgMap] = await Promise.all([
    getMyAttendanceUseCase({ userId }),
    getStudentAbsenceFineItems(userId, filter),
    getOrganizationsMapUseCase(),
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
    const orgName = orgMap.get(orgId)?.name || 'University Organization'

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
    const orgName = orgMap.get(orgId)?.name || 'University Organization'
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
  return getAttendanceStatsUseCase({
    userId,
    academicYear: filter?.academicYear,
    semester: filter?.semester,
  })
}
