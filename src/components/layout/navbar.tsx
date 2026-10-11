'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/use-auth'

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/events', label: 'Events' },
  { href: '/attendance', label: 'Attendance' },
  { href: '/fees', label: 'Fees' },
  { href: '/fines', label: 'Fines' },
  { href: '/clearance', label: 'Clearance' },
  { href: '/profile', label: 'Profile' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      router.push('/login')
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }

  // Generate initials for avatar
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    if (user?.firstName) return user.firstName.slice(0, 2).toUpperCase()
    if (user?.email) return user.email.slice(0, 2).toUpperCase()
    return 'ST'
  }

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.studentId || user?.email || 'Student'

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 14l9-5-9-5-9 5 9 5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white leading-tight">
                  VERIS
                </span>
                <span className="text-[10px] uppercase font-semibold text-blue-400 tracking-wider">
                  Student Portal
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === '/'
                    ? pathname === '/'
                    : pathname === link.href || pathname.startsWith(`${link.href}/`)

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User Profile Snippet & Sign Out */}
          <div className="hidden sm:flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-36 bg-slate-800/60 rounded-lg animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-900/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shadow-inner">
                    {getInitials()}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-medium text-slate-200 leading-tight">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {user.studentId || 'Enrolled Student'}
                    </p>
                  </div>
                </Link>

                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  title="Sign Out"
                  className="p-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <svg className="animate-spin w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  )}
                  <span className="hidden xl:inline font-medium">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2">
          {user && (
            <div className="flex items-center gap-3 p-3 mb-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.studentId || user.email}</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname === link.href || pathname.startsWith(`${link.href}/`)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800">
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleSignOut()
                }}
                disabled={isSigningOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
