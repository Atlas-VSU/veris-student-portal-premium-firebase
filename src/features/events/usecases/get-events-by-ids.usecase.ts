import { adminDb } from '@/lib/firebase/admin'
import { toIsoString } from '@/lib/date-format'
import type { Event } from '../types'

const EVENT_READ_BATCH_SIZE = 100

interface GetEventsByIdsInput {
  eventIds: readonly string[]
}

export async function getEventsByIdsUseCase(
  input: GetEventsByIdsInput
): Promise<Event[]> {
  const events: Event[] = []

  for (let index = 0; index < input.eventIds.length; index += EVENT_READ_BATCH_SIZE) {
    const eventIds = input.eventIds.slice(index, index + EVENT_READ_BATCH_SIZE)
    const references = eventIds.map((eventId) =>
      adminDb.collection('events').doc(eventId)
    )
    const snapshots = await adminDb.getAll(...references)

    for (const snapshot of snapshots) {
      if (!snapshot.exists) {
        continue
      }

      const data = snapshot.data()!
      if (data.isDeleted) {
        continue
      }

      events.push({
        id: snapshot.id,
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
      })
    }
  }

  return events
}
