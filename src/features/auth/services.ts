import 'server-only'

import { adminAuth } from '@/lib/firebase/admin'
import { getSessionUserUseCase } from './usecases/get-session-user.usecase'
import type { SessionUser, SessionUserRecord } from './types'

export const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000

export const SESSION_COOKIE_OPTIONS = {
  maxAge: SESSION_DURATION_MS / 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
} as const

export class StudentSessionError extends Error {
  constructor(
    message: string,
    readonly userId: string
  ) {
    super(message)
    this.name = 'StudentSessionError'
  }
}

function requireEligibleStudent(
  record: SessionUserRecord | null,
  userId: string,
  fallbackEmail = ''
): SessionUser {
  if (!record) {
    throw new StudentSessionError(
      'Student account record not found. Please contact administration.',
      userId
    )
  }

  if (record.isDeleted) {
    throw new StudentSessionError('This student account has been deactivated.', userId)
  }

  if (record.status !== 'approved') {
    throw new StudentSessionError('Student account is pending approval.', userId)
  }

  if (record.role !== 'user') {
    throw new StudentSessionError('This portal is available to student accounts only.', userId)
  }

  return {
    uid: record.uid,
    email: record.email || fallbackEmail,
    firstName: record.firstName,
    lastName: record.lastName,
    studentId: record.studentId,
    role: 'user',
    programId: record.programId,
    facultyId: record.facultyId,
    orgId: record.orgId,
    yearLevel: record.yearLevel,
    status: 'approved',
    corURL: record.corURL,
  }
}

export async function createStudentSessionService(idToken: string): Promise<{
  sessionCookie: string
  user: SessionUser
}> {
  const decodedToken = await adminAuth.verifyIdToken(idToken)
  const record = await getSessionUserUseCase({ userId: decodedToken.uid })
  const user = requireEligibleStudent(record, decodedToken.uid, decodedToken.email)
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  })

  return { sessionCookie, user }
}

export async function getSessionUserService(
  userId: string,
  fallbackEmail = ''
): Promise<SessionUser> {
  const record = await getSessionUserUseCase({ userId })
  return requireEligibleStudent(record, userId, fallbackEmail)
}
