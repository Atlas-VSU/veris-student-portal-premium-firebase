import 'server-only'
import { cookies } from 'next/headers'
import { adminAuth } from './admin'
import { logAction } from '@/features/auth/usecases/log-action.usecase'
import type { ActionResult } from '@/types'

export async function withAuth<T>(
  action: string,
  fn: (userId: string) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    const sessionCookie = (await cookies()).get('__session')?.value

    if (!sessionCookie) {
      void logAction({ userId: 'anonymous', action, success: false, error: 'Authentication required.' })
      return { ok: false, error: 'Authentication required.' }
    }

    const claims = await adminAuth.verifySessionCookie(sessionCookie, true)

    return await fn(claims.uid)

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    void logAction({ userId: 'unknown', action, success: false, error: message })
    return { ok: false, error: message }
  }
}
