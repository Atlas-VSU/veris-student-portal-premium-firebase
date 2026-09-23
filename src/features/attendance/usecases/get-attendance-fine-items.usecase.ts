import { adminDb } from '@/lib/firebase/admin'
import type { AttendanceFineItem } from '../types'

interface GetAttendanceFineItemsInput {
  fineId: string
}

export async function getAttendanceFineItemsUseCase(
  input: GetAttendanceFineItemsInput
): Promise<AttendanceFineItem[]> {
  const snapshot = await adminDb
    .collection('fines')
    .doc(input.fineId)
    .collection('fineItems')
    .get()

  return snapshot.docs.flatMap((doc) => {
    const data = doc.data()
    if (!data.eventId || data.isArchived === true || data.isWaived === true) {
      return []
    }

    return [{
      id: doc.id,
      eventId: data.eventId,
      eventName: typeof data.eventName === 'string' ? data.eventName : undefined,
      eventDate: data.eventDate,
      amount: typeof data.amount === 'number' ? data.amount : 0,
      reason: typeof data.reason === 'string' ? data.reason : undefined,
      isPending: data.isPending === true,
    }]
  })
}
