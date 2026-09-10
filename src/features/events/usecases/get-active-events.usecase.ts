import { adminDb } from '@/lib/firebase/admin'
import type { Event } from '../types'

interface GetActiveEventsInput {
  academicYear: string
  semester: string
}

export async function getActiveEventsUseCase(input: GetActiveEventsInput): Promise<Event[]> {
  const snapshot = await adminDb
    .collection('events')
    .where('academicYear', '==', input.academicYear)
    .where('semester', '==', input.semester)
    .where('isDeleted', '==', false)
    .get()

  const events: Event[] = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data.name,
      date: data.date,
      location: data.location,
      note: data.note,
      majorEvent: data.majorEvent ?? false,
      fineTypeId: data.fineTypeId,
      orgId: data.orgId,
      programId: data.programId,
      facultyId: data.facultyId,
      accessLevelEvent: data.accessLevelEvent,
      status: data.status,
      attendees: data.attendees ?? 0,
      academicYear: data.academicYear,
      semester: data.semester,
      finesGenerated: data.finesGenerated ?? false,
      manuallyCompleted: data.manuallyCompleted ?? false,
      timeInStart: data.timeInStart,
      timeInEnd: data.timeInEnd,
      timeOutStart: data.timeOutStart,
      timeOutEnd: data.timeOutEnd,
      isDeleted: data.isDeleted ?? false,
      createdAt: data.createdAt,
    }
  })

  return events.sort((a, b) => (b.date?.toMillis?.() ?? 0) - (a.date?.toMillis?.() ?? 0))
}
