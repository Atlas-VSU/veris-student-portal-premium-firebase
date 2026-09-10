import { adminDb } from '@/lib/firebase/admin'
import type { AttendanceRecord } from '../types'

interface GetRecentAttendanceInput {
  userId: string
  limit?: number
}

export async function getRecentAttendanceUseCase(input: GetRecentAttendanceInput): Promise<AttendanceRecord[]> {
  const take = input.limit || 3
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
      timeIn: data.timeIn,
      timeOut: data.timeOut,
      status: data.status,
      remark: data.remark,
      orgId: data.orgId,
    }
  })

  return records
    .sort((a, b) => (b.timeIn?.toMillis?.() ?? 0) - (a.timeIn?.toMillis?.() ?? 0))
    .slice(0, take)
}
