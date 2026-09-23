import 'server-only'

import { adminAuth } from '@/lib/firebase/admin'
import { getSessionUserUseCase } from './usecases/get-session-user.usecase'
import { isRecentSignIn, isTerminalSessionError } from './session-security'
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
    readonly userId: string,
    readonly reason: 'ineligible' | 'recent-sign-in-required' = 'ineligible'
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
  const decodedToken = await adminAuth.verifyIdToken(idToken, true)

  if (!isRecentSignIn(decodedToken.auth_time)) {
    throw new StudentSessionError(
      'For your security, please sign in again before starting a new session.',
      decodedToken.uid,
      'recent-sign-in-required'
    )
  }

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

export interface SessionRevocationResult {
  revoked: boolean
  userId?: string
}

export class SessionRevocationError extends Error {
  constructor(
    readonly userId: string,
    cause: unknown
  ) {
    super(cause instanceof Error ? cause.message : 'Session revocation failed.')
    this.name = 'SessionRevocationError'
  }
}

export async function revokeStudentSessionService(
  sessionCookie: string
): Promise<SessionRevocationResult> {
  let userId: string

  try {
    const claims = await adminAuth.verifySessionCookie(sessionCookie, true)
    userId = claims.uid
  } catch (error) {
    if (isTerminalSessionError(error)) {
      return { revoked: false }
    }
    throw error
  }

  try {
    await adminAuth.revokeRefreshTokens(userId)
  } catch (error) {
    throw new SessionRevocationError(userId, error)
  }

  return { revoked: true, userId }
}
