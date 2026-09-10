import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'

const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000 // 14 days

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json()
    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'idToken is required.' }, { status: 400 })
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    })

    const response = NextResponse.json({ ok: true })
    response.cookies.set('__session', sessionCookie, {
      maxAge: SESSION_DURATION_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
