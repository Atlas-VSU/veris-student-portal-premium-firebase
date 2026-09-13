import { adminDb } from '@/lib/firebase/admin'
import { toSafeDate, toIsoString } from '@/lib/date-format'
import type { AttendanceRecord } from '../types'

interface GetMyAttendanceInput {
  userId: string
}

export async function getMyAttendanceUseCase(input: GetMyAttendanceInput): Promise<AttendanceRecord[]> {
  const snapshot = await adminDb
    .collection('eventAttendees')
    .where('userId', '==', input.userId)
    .get()

  const records: AttendanceRecord[] = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      eventId: data.eventId,
      userId: data.userId,
      studentId: data.studentId,
      student: data.student,
      timeIn: toIsoString(data.timeIn),
      timeOut: toIsoString(data.timeOut),
      status: data.status || 'partially present',
      remark: data.remark,
      orgId: data.orgId,
    }
  })

  return records.sort((a, b) => (toSafeDate(b.timeIn)?.getTime() ?? 0) - (toSafeDate(a.timeIn)?.getTime() ?? 0))
}
