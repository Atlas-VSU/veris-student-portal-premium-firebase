import type { SessionUser } from './types'

export function validateSessionUser(user: Partial<SessionUser>): boolean {
  return Boolean(user.uid && user.email)
}
