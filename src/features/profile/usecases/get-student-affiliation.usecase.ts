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
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) return null

    const data = userDoc.data()!
    return {
      userId,
      studentId: data.studentId,
      programId: data.programId,
      program: data.program,
      facultyId: data.facultyId,
      faculty: data.faculty,
      orgId: data.orgId,
    }
  } catch (err) {
    console.error(`Failed to fetch student affiliation for user ${userId}:`, err)
    return null
  }
}
