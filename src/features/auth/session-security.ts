const RECENT_SIGN_IN_WINDOW_SECONDS = 5 * 60
const MAX_CLOCK_SKEW_SECONDS = 60

const TERMINAL_SESSION_ERROR_CODES = new Set([
  'auth/argument-error',
  'auth/invalid-id-token',
  'auth/session-cookie-expired',
  'auth/session-cookie-revoked',
  'auth/user-disabled',
  'auth/user-not-found',
])

export function isRecentSignIn(
  authTimeSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const tokenAgeSeconds = nowSeconds - authTimeSeconds
  return tokenAgeSeconds >= -MAX_CLOCK_SKEW_SECONDS && tokenAgeSeconds <= RECENT_SIGN_IN_WINDOW_SECONDS
}

export function isTerminalSessionError(error: unknown): boolean {
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' && TERMINAL_SESSION_ERROR_CODES.has(code)
}
