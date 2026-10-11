import { adminDb } from '@/lib/firebase/admin'
import type { SessionUserRecord } from '../types'

interface GetSessionUserInput {
  userId: string
}

export async function getSessionUserUseCase(
  input: GetSessionUserInput
): Promise<SessionUserRecord | null> {
  const userDoc = await adminDb.collection('users').doc(input.userId).get()

  if (!userDoc.exists) {
    return null
  }

  const data = userDoc.data()!

  return {
    uid: input.userId,
    email: typeof data.email === 'string' ? data.email : undefined,
    firstName: typeof data.firstName === 'string' ? data.firstName : undefined,
    lastName: typeof data.lastName === 'string' ? data.lastName : undefined,
    studentId: typeof data.studentId === 'string' ? data.studentId : undefined,
    role: typeof data.role === 'string' ? data.role : undefined,
    programId: typeof data.programId === 'string' ? data.programId : undefined,
    facultyId: typeof data.facultyId === 'string' ? data.facultyId : undefined,
    orgId: typeof data.orgId === 'string' ? data.orgId : undefined,
    yearLevel: typeof data.yearLevel === 'number' ? data.yearLevel : undefined,
    status: typeof data.status === 'string' ? data.status : undefined,
    corURL: typeof data.corURL === 'string' ? data.corURL : undefined,
    isDeleted: data.isDeleted === true,
  }
}
