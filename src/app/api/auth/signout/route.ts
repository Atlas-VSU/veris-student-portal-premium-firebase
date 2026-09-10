import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'

export async function POST() {
  const cookieStore = await cookies()
  const session = cookieStore.get('__session')?.value

  if (session) {
    try {
      const claims = await adminAuth.verifySessionCookie(session)
      await adminAuth.revokeRefreshTokens(claims.uid)
    } catch {
      // Session already expired, continue to clear cookie
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('__session')
  return response
}
