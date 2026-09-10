import type { SessionUser } from './types'

// Auth domain business logic and orchestration
export function validateSessionUser(user: Partial<SessionUser>): boolean {
  return Boolean(user.uid && user.email)
}
