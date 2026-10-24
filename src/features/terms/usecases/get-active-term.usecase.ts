import { adminDb } from '@/lib/firebase/admin'
import { toIsoString } from '@/lib/date-format'
import type { Term } from '../types'

export async function getActiveTermUseCase(): Promise<Term | null> {
  const snapshot = await adminDb
    .collection('terms')
    .where('isActive', '==', true)
    .where('isDeleted', '==', false)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  const data = doc.data()

  return {
    id: doc.id,
    AY: data.AY,
    semester: data.semester,
    isActive: data.isActive,
    isDeleted: data.isDeleted ?? false,
    metadata: data.metadata
      ? {
          createdAt: toIsoString(data.metadata.createdAt),
          updatedAt: toIsoString(data.metadata.updatedAt),
        }
      : undefined,
  }
}
