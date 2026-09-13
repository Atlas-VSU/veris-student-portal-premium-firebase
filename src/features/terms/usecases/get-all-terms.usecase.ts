import { adminDb } from '@/lib/firebase/admin'
import type { Term } from '../types'

export async function getAllTermsUseCase(): Promise<Term[]> {
  const snapshot = await adminDb
    .collection('terms')
    .where('isDeleted', '==', false)
    .get()

  const terms: Term[] = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      AY: data.AY,
      semester: data.semester,
      isActive: data.isActive ?? false,
      isDeleted: data.isDeleted ?? false,
      metadata: data.metadata,
    }
  })

  // Sort terms chronologically descending (e.g. 2025-2026 2nd before 2025-2026 1st before 2024-2025)
  return terms.sort((a, b) => {
    if (a.AY !== b.AY) {
      return b.AY.localeCompare(a.AY)
    }
    return b.semester.localeCompare(a.semester)
  })
}
