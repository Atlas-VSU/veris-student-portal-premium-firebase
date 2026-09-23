import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require an active session
const PROTECTED_PREFIXES = [
  '/',
  '/events',
  '/attendance',
  '/fees',
  '/fines',
  '/clearance',
  '/profile',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('__session')?.value

  // 1. Bypass static files, Next internals, and public API endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 2. Always allow the login route. Cookie presence alone does not prove that
  // the session is valid, and redirecting here can trap stale sessions in a loop.
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // 3. For protected routes, optimistically check if a session cookie exists.
  const isProtected =
    pathname === '/' ||
    PROTECTED_PREFIXES.some(
      (prefix) => prefix !== '/' && (pathname === prefix || pathname.startsWith(`${prefix}/`))
    )

  if (isProtected && !session) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
