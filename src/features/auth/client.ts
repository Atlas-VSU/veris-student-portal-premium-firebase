import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { createSessionAction, destroySessionAction } from './actions'
import type { ActionResult, LoginCredentials, SessionUser } from './types'

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
      await firebaseSignOut(auth).catch(() => {})
    }

    return result
  } catch (error) {
    console.error('[Auth] Sign in failed:', error)
    const message = error instanceof Error ? error.message : 'Invalid student credentials.'

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

    return {
      ok: false,
      error: message.startsWith('Firebase:') ? 'Invalid student credentials.' : message,
    }
  }
}

export async function signOutUser(): Promise<ActionResult> {
  try {
    return await destroySessionAction()
  } finally {
    await firebaseSignOut(auth).catch(() => {})
  }
}
