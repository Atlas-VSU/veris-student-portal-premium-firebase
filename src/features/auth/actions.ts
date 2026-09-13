'use server'

import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { logAction } from './usecases/log-action.usecase'
import type { ActionResult, SessionUser } from './types'

const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000 // 14 days

// Called after client-side signInWithEmailAndPassword() returns an idToken
export async function createSessionAction(idToken: string): Promise<ActionResult<{ user: SessionUser }>> {
  try {
    // 1. Verify the idToken first to extract student UID
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // 2. Precondition check: Validate student record exists, is active, and is approved
    const userDoc = await adminDb.collection('users').doc(uid).get()
    if (!userDoc.exists) {
      void logAction({
        userId: uid,
        action: 'auth:signin',
        success: false,
        error: 'Student record does not exist.',
      })
      return { ok: false, error: 'Student account record not found. Please contact administration.' }
    }

    const userData = userDoc.data()
    if (userData?.isDeleted === true) {
      void logAction({
        userId: uid,
        action: 'auth:signin',
        success: false,
        error: 'Account is deleted.',
      })
      return { ok: false, error: 'This student account has been deactivated.' }
    }

    if (userData?.status && userData.status !== 'approved') {
      void logAction({
        userId: uid,
        action: 'auth:signin',
        success: false,
        error: `Account status is ${userData.status}.`,
      })
      return { ok: false, error: 'Student account is pending approval.' }
    }

    // 3. Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    })
    const cookieStore = await cookies()

    cookieStore.set('__session', sessionCookie, {
      maxAge: SESSION_DURATION_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Lax allows smooth deep-link redirects while maintaining CSRF safety
      path: '/',
    })

    const sessionUser: SessionUser = {
      uid,
      email: userData?.email || decodedToken.email || '',
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      studentId: userData?.studentId,
      role: userData?.role || 'user',
      programId: userData?.programId,
      facultyId: userData?.facultyId,
      orgId: userData?.orgId,
      yearLevel: userData?.yearLevel,
      status: userData?.status || 'approved',
      corURL: userData?.corURL,
    }

    void logAction({
      userId: uid,
      action: 'auth:signin',
      success: true,
    })

    return { ok: true, data: { user: sessionUser } }
  } catch (error) {
    console.error('[createSessionAction Server Error]:', error)
    const message = error instanceof Error ? error.message : 'Failed to create session.'
    void logAction({
      userId: 'unknown',
      action: 'auth:signin',
      success: false,
      error: message,
    })
    return { ok: false, error: 'Failed to establish session. Please try again.' }
  }
}

// Called on sign-out — revokes refresh tokens so cookie cannot be reused
export async function destroySessionAction(): Promise<ActionResult> {
  const cookieStore = await cookies()
  const session = cookieStore.get('__session')?.value

  if (session) {
    try {
      const claims = await adminAuth.verifySessionCookie(session)
      await adminAuth.revokeRefreshTokens(claims.uid)
      void logAction({
        userId: claims.uid,
        action: 'auth:signout',
        success: true,
      })
    } catch {
      // already expired — still clear the cookie
    }
  }

  cookieStore.delete('__session')
  return { ok: true, data: undefined }
}

// Resolves current session user from the __session cookie on the server
export async function getSessionUserAction(): Promise<ActionResult<SessionUser | null>> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('__session')?.value

    if (!session) {
      return { ok: true, data: null }
    }

    const claims = await adminAuth.verifySessionCookie(session, true)
    const userDoc = await adminDb.collection('users').doc(claims.uid).get()

    if (!userDoc.exists) {
      return { ok: true, data: null }
    }

    const userData = userDoc.data()
    if (userData?.isDeleted === true) {
      return { ok: true, data: null }
    }

    const sessionUser: SessionUser = {
      uid: claims.uid,
      email: userData?.email || claims.email || '',
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      studentId: userData?.studentId,
      role: userData?.role || 'user',
      programId: userData?.programId,
      facultyId: userData?.facultyId,
      orgId: userData?.orgId,
      yearLevel: userData?.yearLevel,
      status: userData?.status,
      corURL: userData?.corURL,
    }

    return { ok: true, data: sessionUser }
  } catch {
    return { ok: true, data: null }
  }
}