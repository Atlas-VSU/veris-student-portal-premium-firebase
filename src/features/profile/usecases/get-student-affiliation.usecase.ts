import { adminDb } from '@/lib/firebase/admin'

export interface StudentAffiliation {
  userId: string
  studentId?: string
  programId?: string
  program?: string
  facultyId?: string
  faculty?: string
  orgId?: string
}

export async function getStudentAffiliationUseCase(userId: string): Promise<StudentAffiliation | null> {
  const userDoc = await adminDb.collection('users').doc(userId).get()
  if (!userDoc.exists) {
    return null
  }

  const data = userDoc.data()!
  return {
    userId,
    studentId: typeof data.studentId === 'string' ? data.studentId : undefined,
    programId: typeof data.programId === 'string' ? data.programId : undefined,
    program: typeof data.program === 'string' ? data.program : undefined,
    facultyId: typeof data.facultyId === 'string' ? data.facultyId : undefined,
    faculty: typeof data.faculty === 'string' ? data.faculty : undefined,
    orgId: typeof data.orgId === 'string' ? data.orgId : undefined,
  }
}
