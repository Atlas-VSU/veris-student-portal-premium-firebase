import { adminDb } from '@/lib/firebase/admin'
import { toSafeDate, toIsoString } from '@/lib/date-format'
import type { Event } from '../types'

import { queryEligibleEvents, type GetEventsInput } from './query-eligible-events'

export async function getActiveEventsUseCase(input: GetEventsInput): Promise<Event[]> {
  const docs = await queryEligibleEvents(adminDb, input)

  const events: Event[] = docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data.name || 'University Event',
      date: toIsoString(data.date) || new Date().toISOString(),
      location: data.location || 'Campus',
      note: data.note,
      majorEvent: data.majorEvent ?? false,
      fineTypeId: data.fineTypeId || '',
      orgId: data.orgId || '',
      orgName: typeof data.orgName === 'string' ? data.orgName : undefined,
      programId: data.programId,
      facultyId: data.facultyId,
      accessLevelEvent: data.accessLevelEvent,
      status: data.status || 'upcoming',
      attendees: data.attendees ?? 0,
      academicYear: data.academicYear || '',
      semester: data.semester || '',
      finesGenerated: data.finesGenerated ?? false,
      manuallyCompleted: data.manuallyCompleted ?? false,
      timeInStart: data.timeInStart,
      timeInEnd: data.timeInEnd,
      timeOutStart: data.timeOutStart,
      timeOutEnd: data.timeOutEnd,
      isDeleted: data.isDeleted ?? false,
      createdAt: toIsoString(data.createdAt),
    }
  })

  return events.sort((a, b) => (toSafeDate(b.date)?.getTime() ?? 0) - (toSafeDate(a.date)?.getTime() ?? 0))
}
