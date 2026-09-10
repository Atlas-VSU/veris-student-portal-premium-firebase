import 'server-only'
import { cookies } from 'next/headers'
import { adminAuth } from './admin'
import { ActionResult } from '@/app/types'
export async function withAuth<T>(
  action: string,
  fn: (userId: string) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    // 1. AUTHENTICATION
    const sessionCookie = (await cookies()).get('__session')?.value

    if (!sessionCookie) {
    //   void logAction({ userId: 'anonymous', action, success: false, error: 'Authentication required.' })
      return { ok: false, error: 'Authentication required.' }
    }

    const claims = await adminAuth.verifySessionCookie(sessionCookie, true)

    // 2. AUTHORIZATION (ownership)
    // userId comes from the verified cookie — it cannot be spoofed by the client.
    // Passes userId to the action's callback; use cases filter by studentId == userId.

    return await fn(claims.uid)

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    // void logAction({ userId: 'unknown', action, success: false, error: message })
    return { ok: false, error: message }
  }
}