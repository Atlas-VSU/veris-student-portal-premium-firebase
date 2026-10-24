import { adminDb } from '@/lib/firebase/admin'
import type { AttendanceFineParent, TermFilter } from '../types'

interface GetMyAttendanceFinesInput {
  userId: string
  filter?: TermFilter
}

export async function getMyAttendanceFinesUseCase(
  input: GetMyAttendanceFinesInput
): Promise<AttendanceFineParent[]> {
  let query = adminDb.collection('fines').where('userId', '==', input.userId)

  if (input.filter?.academicYear) {
    query = query.where('academicYear', '==', input.filter.academicYear)
  }

  if (input.filter?.semester) {
    query = query.where('semester', '==', input.filter.semester)
  }

  const snapshot = await query.get()

  return snapshot.docs.flatMap((doc) => {
    const data = doc.data()
    if (data.isArchived === true || data.metadata?.isArchived === true) {
      return []
    }

    return [{
      id: doc.id,
      orgId: typeof data.orgId === 'string' ? data.orgId : '',
      orgName: typeof data.orgName === 'string' ? data.orgName : undefined,
      academicYear: typeof data.academicYear === 'string' ? data.academicYear : undefined,
      semester: typeof data.semester === 'string' ? data.semester : undefined,
    }]
  })
}
