import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { createSessionAction, destroySessionAction } from './actions'
import type { ActionResult, LoginCredentials, SessionUser } from './types'

export function validateSessionUser(user: Partial<SessionUser>): boolean {
  return Boolean(user.uid && user.email)
}

/**
 * Authenticates student using Firebase Client SDK, extracts fresh idToken,
 * and creates secure HTTP-only session cookie via Server Action.
 */
export async function signInWithCredentials(
  credentials: LoginCredentials
): Promise<ActionResult<{ user: SessionUser }>> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email.trim(),
      credentials.password
    )

    const idToken = await userCredential.user.getIdToken(true)
    const result = await createSessionAction(idToken)

    if (!result.ok) {
      // If server session validation failed (e.g. account pending or deleted), clear client auth
      await firebaseSignOut(auth).catch(() => {})
      return result
    }

    return result
  } catch (error) {
    console.error('[Auth] Sign in failed:', error)
    const message = error instanceof Error ? error.message : 'Invalid student credentials.'
    // Firebase auth error code translation
    if (
      message.includes('auth/invalid-credential') ||
      message.includes('auth/user-not-found') ||
      message.includes('auth/wrong-password') ||
      message.includes('auth/invalid-email')
    ) {
      return { ok: false, error: 'Invalid student credentials.' }
    }
    if (message.includes('auth/too-many-requests')) {
      return { ok: false, error: 'Too many failed attempts. Please try again in a few minutes.' }
    }
    return { ok: false, error: message.startsWith('Firebase:') ? 'Invalid student credentials.' : message }
  }
}

/**
 * Terminates server session cookie and client Firebase state.
 */
export async function signOutUser(): Promise<ActionResult> {
  try {
    await destroySessionAction()
  } finally {
    await firebaseSignOut(auth).catch(() => {})
  }
  return { ok: true, data: undefined }
}

