'use server'

import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { withAuth } from '@/lib/firebase/with-auth'
import {
  createStudentSessionService,
  getSessionUserService,
  SESSION_COOKIE_OPTIONS,
  StudentSessionError,
} from './services'
import { logAction } from './usecases/log-action.usecase'
import type { ActionResult, SessionUser } from './types'

export async function createSessionAction(idToken: string): Promise<ActionResult<{ user: SessionUser }>> {
  try {
    const { sessionCookie, user } = await createStudentSessionService(idToken)
    const cookieStore = await cookies()

    cookieStore.set('__session', sessionCookie, SESSION_COOKIE_OPTIONS)

    void logAction({
      userId: user.uid,
      action: 'auth:signin',
      success: true,
    })

    return { ok: true, data: { user } }
  } catch (error) {
    console.error('[createSessionAction Server Error]:', error)
    const userId = error instanceof StudentSessionError ? error.userId : 'unknown'
    const auditMessage = error instanceof Error ? error.message : 'Failed to create session.'
    void logAction({
      userId,
      action: 'auth:signin',
      success: false,
      error: auditMessage,
    })
    return {
      ok: false,
      error:
        error instanceof StudentSessionError
          ? error.message
          : 'Failed to establish session. Please try again.',
    }
  }
}

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

export async function getSessionUserAction(): Promise<ActionResult<SessionUser | null>> {
  return withAuth('auth:getSessionUser', async (userId) => {
    const user = await getSessionUserService(userId)
    return { ok: true, data: user }
  })
}
