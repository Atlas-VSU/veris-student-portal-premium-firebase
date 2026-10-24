import 'server-only'

import { cookies } from 'next/headers'
import { adminAuth } from './admin'
import {
  getStudentAccessContextService,
  StudentSessionError,
} from '@/features/auth/services'
import { logAction } from '@/features/auth/usecases/log-action.usecase'
import type { SessionUser } from '@/features/auth/types'
import type { ActionResult } from '@/types'

export async function withAuth<T>(
  action: string,
  fn: (
    userId: string,
    user: SessionUser,
    eligibleOrganizationIds: string[]
  ) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('__session')?.value

  if (!sessionCookie) {
    return { ok: false, error: 'Authentication required.' }
  }

  let uid: string
  let fallbackEmail = ''
  try {
    const claims = await adminAuth.verifySessionCookie(sessionCookie, true)
    uid = claims.uid
    fallbackEmail = claims.email || ''
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

  let user: SessionUser
  let eligibleOrganizationIds: string[]
  try {
    const context = await getStudentAccessContextService(uid, fallbackEmail)
    user = context.user
    eligibleOrganizationIds = context.eligibleOrganizationIds
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Student eligibility check failed.'
    void logAction({ userId: uid, action, success: false, error: message })

    if (error instanceof StudentSessionError) {
      try {
        cookieStore.delete('__session')
      } catch {
        // ignore if headers are immutable
      }
      return { ok: false, error: error.message }
    }

    return { ok: false, error: 'Unable to verify your account. Please try again.' }
  }

  try {
    return await fn(uid, user, eligibleOrganizationIds)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    void logAction({ userId: uid, action, success: false, error: message })
    return { ok: false, error: 'Unable to complete the request. Please try again.' }
  }
}
