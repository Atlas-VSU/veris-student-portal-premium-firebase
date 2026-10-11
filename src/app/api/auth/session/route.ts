import { NextResponse } from 'next/server'
import {
  createStudentSessionService,
  SESSION_COOKIE_OPTIONS,
  StudentSessionError,
} from '@/features/auth/services'
import { isJsonRequest, isSameOriginRequest } from '@/features/auth/request-security'
import { logAction } from '@/features/auth/usecases/log-action.usecase'

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Invalid request origin.' }, { status: 403 })
  }

  if (!isJsonRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Content-Type must be application/json.' }, { status: 415 })
  }

  try {
    const body: unknown = await request.json()
    const idToken =
      typeof body === 'object' && body !== null && 'idToken' in body
        ? (body as { idToken?: unknown }).idToken
        : undefined

    if (typeof idToken !== 'string' || !idToken) {
      return NextResponse.json({ ok: false, error: 'idToken is required.' }, { status: 400 })
    }

    const { sessionCookie, user } = await createStudentSessionService(idToken)

    const response = NextResponse.json({ ok: true })
    response.cookies.set('__session', sessionCookie, SESSION_COOKIE_OPTIONS)

    void logAction({ userId: user.uid, action: 'auth:signin', success: true })

    return response
  } catch (error) {
    const userId = error instanceof StudentSessionError ? error.userId : 'unknown'
    const auditMessage = error instanceof Error ? error.message : 'Failed to create session.'
    void logAction({ userId, action: 'auth:signin', success: false, error: auditMessage })

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof StudentSessionError
            ? error.message
            : 'Failed to establish session. Please try again.',
      },
      {
        status:
          error instanceof StudentSessionError && error.reason === 'ineligible'
            ? 403
            : 401,
      }
    )
  }
}
