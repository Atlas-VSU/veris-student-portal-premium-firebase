'use server'

import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import type { ActionResult } from './types'

const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000 // 14 days

export async function createSessionAction(idToken: string): Promise<ActionResult> {
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    })
    const cookieStore = await cookies()

    cookieStore.set('__session', sessionCookie, {
      maxAge: SESSION_DURATION_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })

    return { ok: true, data: undefined }
  } catch {
    return { ok: false, error: 'Failed to create session.' }
  }
}

export async function destroySessionAction(): Promise<ActionResult> {
  const cookieStore = await cookies()
  const session = cookieStore.get('__session')?.value

  if (session) {
    try {
      const claims = await adminAuth.verifySessionCookie(session)
      await adminAuth.revokeRefreshTokens(claims.uid)
    } catch {
      // Token already expired, proceed with cookie cleanup
    }
  }

  cookieStore.delete('__session')
  return { ok: true, data: undefined }
}
