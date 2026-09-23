import { adminDb } from '@/lib/firebase/admin'
import { toIsoString } from '@/lib/date-format'
import type { Event } from '../types'

interface GetEventByIdInput {
  eventId: string
}

export async function getEventByIdUseCase(input: GetEventByIdInput): Promise<Event | null> {
  const doc = await adminDb.collection('events').doc(input.eventId).get()

  if (!doc.exists) {
    return null
  }

  const data = doc.data()!
  if (data.isDeleted) {
    return null
  }

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
}
