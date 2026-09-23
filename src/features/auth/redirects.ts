const REDIRECT_BASE_URL = 'https://student-portal.invalid'

export function getSafeRedirectPath(candidate: string | null): string {
  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\')
  ) {
    return '/'
  }

  try {
    const url = new URL(candidate, REDIRECT_BASE_URL)
    if (url.origin !== REDIRECT_BASE_URL) {
      return '/'
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}
