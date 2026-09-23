import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isSameOriginRequest } from '@/features/auth/request-security'
import {
  revokeStudentSessionService,
  SessionRevocationError,
} from '@/features/auth/services'
import { logAction } from '@/features/auth/usecases/log-action.usecase'

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Invalid request origin.' }, { status: 403 })
  }

  const cookieStore = await cookies()
  const session = cookieStore.get('__session')?.value
  let response: NextResponse

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

    response = NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Session revocation failed.'
    void logAction({
      userId: error instanceof SessionRevocationError ? error.userId : 'unknown',
      action: 'auth:signout',
      success: false,
      error: message,
    })
    response = NextResponse.json(
      {
        ok: false,
        error: 'You were signed out locally, but other sessions could not be revoked.',
      },
      { status: 503 }
    )
  }

  response.cookies.delete('__session')
  return response
}
