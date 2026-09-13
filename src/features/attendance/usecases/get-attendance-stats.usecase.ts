import { adminDb } from '@/lib/firebase/admin'
import { getEventByIdUseCase } from '@/features/events/usecases/get-event-by-id.usecase'
import type { AttendanceStats } from '../types'

interface GetAttendanceStatsInput {
  userId: string
  academicYear?: string
  semester?: string
}

export async function getAttendanceStatsUseCase(input: GetAttendanceStatsInput): Promise<AttendanceStats> {
  const attendanceSnapshot = await adminDb
    .collection('eventAttendees')
    .where('userId', '==', input.userId)
    .get()

  let presentCount = 0
  let partialCount = 0

  for (const doc of attendanceSnapshot.docs) {
    const data = doc.data()

    // If term filter is active, check event's term
    if (input.academicYear && input.semester && data.eventId) {
      const event = await getEventByIdUseCase({ eventId: data.eventId })
      if (!event || event.academicYear !== input.academicYear || event.semester !== input.semester) {
        continue
      }
    }

    if (data.status === 'present') {
      presentCount++
    } else if (data.status === 'partially present') {
      partialCount++
    }
  }

  let absencesCount = 0
  let pendingAppealsCount = 0

  try {
    let finesQuery = adminDb
      .collection('fines')
      .where('userId', '==', input.userId)

    if (input.academicYear) {
      finesQuery = finesQuery.where('academicYear', '==', input.academicYear)
    }
    if (input.semester) {
      finesQuery = finesQuery.where('semester', '==', input.semester)
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
          absencesCount++
          if (itemData.isPending === true) {
            pendingAppealsCount++
          }
        }
      })
    }
  } catch (err) {
    console.error('Error computing fine absence infractions in getAttendanceStatsUseCase:', err)
  }

  return {
    presentCount,
    partialCount,
    totalAttended: presentCount + partialCount,
    absencesCount,
    pendingAppealsCount,
  }
}
