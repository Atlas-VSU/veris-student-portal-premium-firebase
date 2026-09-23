'use server'

import { cookies } from 'next/headers'
import { withAuth } from '@/lib/firebase/with-auth'
import {
  createStudentSessionService,
  revokeStudentSessionService,
  SESSION_COOKIE_OPTIONS,
  SessionRevocationError,
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

  try {
    if (session) {
      const result = await revokeStudentSessionService(session)
      if (result.userId) {
        void logAction({
          userId: result.userId,
          action: 'auth:signout',
          success: true,
        })
      }
    }

    return { ok: true, data: undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Session revocation failed.'
    void logAction({
      userId: error instanceof SessionRevocationError ? error.userId : 'unknown',
      action: 'auth:signout',
      success: false,
      error: message,
    })

    return {
      ok: false,
      error: 'You were signed out locally, but other sessions could not be revoked.',
    }
  } finally {
    cookieStore.delete('__session')
  }
}

export async function getSessionUserAction(): Promise<ActionResult<SessionUser | null>> {
  return withAuth('auth:getSessionUser', async (_userId, user) => {
    return { ok: true, data: user }
  })
}
