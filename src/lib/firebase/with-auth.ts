import 'server-only'
import { cookies } from 'next/headers'
import { adminAuth } from './admin'
import { logAction } from '@/features/auth/usecases/log-action.usecase'
import type { ActionResult } from '@/types'

export async function withAuth<T>(
  action: string,
  fn: (userId: string) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('__session')?.value

  if (!sessionCookie) {
    void logAction({ userId: 'anonymous', action, success: false, error: 'Authentication required.' })
    return { ok: false, error: 'Authentication required.' }
  }

  let uid: string
  try {
    const claims = await adminAuth.verifySessionCookie(sessionCookie, true)
    uid = claims.uid
  } catch (authError) {
    try {
      cookieStore.delete('__session')
    } catch {
      // ignore if headers are immutable
    }
    const message = authError instanceof Error ? authError.message : 'Session verification failed.'
    void logAction({ userId: 'unknown', action, success: false, error: message })
    return { ok: false, error: 'Session expired or revoked. Please log in again.' }
  }

  try {
    return await fn(uid)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    void logAction({ userId: uid, action, success: false, error: message })
    return { ok: false, error: message }
  }
}
