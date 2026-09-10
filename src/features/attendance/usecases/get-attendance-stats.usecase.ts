import { adminDb } from '@/lib/firebase/admin'
import type { AttendanceStats } from '../types'

interface GetAttendanceStatsInput {
  userId: string
}

export async function getAttendanceStatsUseCase(input: GetAttendanceStatsInput): Promise<AttendanceStats> {
  const attendanceSnapshot = await adminDb
    .collection('eventAttendees')
    .where('userId', '==', input.userId)
    .get()

  let presentCount = 0
  let partialCount = 0

  attendanceSnapshot.docs.forEach((doc) => {
    const data = doc.data()
    if (data.status === 'present') {
      presentCount++
    } else if (data.status === 'partially present') {
      partialCount++
    }
  })

  let absencesCount = 0
  try {
    const finesSnapshot = await adminDb
      .collection('fines')
      .where('userId', '==', input.userId)
      .where('metadata.isArchived', '==', false)
      .get()

    for (const fineDoc of finesSnapshot.docs) {
      const itemsSnapshot = await fineDoc.ref.collection('fineItems').get()
      itemsSnapshot.docs.forEach((itemDoc) => {
        const itemData = itemDoc.data()
        if (itemData.eventId && !itemData.isArchived) {
          absencesCount++
        }
      })
    }
  } catch {
    // Keep count at 0 on failure
  }

  return {
    presentCount,
    partialCount,
    totalAttended: presentCount + partialCount,
    absencesCount,
  }
}
