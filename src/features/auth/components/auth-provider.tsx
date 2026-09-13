'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { signInWithCredentials, signOutUser } from '../services'
import { getSessionUserAction } from '../actions'
import type { ActionResult, AuthContextValue, LoginCredentials, SessionUser } from '../types'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode
  initialUser?: SessionUser | null
}) {
  const [user, setUser] = useState<SessionUser | null>(initialUser)
  const [loading, setLoading] = useState<boolean>(!initialUser)

  const refreshUser = useCallback(async () => {
    try {
      const res = await getSessionUserAction()
      if (res.ok) {
        setUser(res.data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Listen to Firebase client auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync with server session and fetch full profile
        await refreshUser()
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [refreshUser])

  const signIn = async (credentials: LoginCredentials): Promise<ActionResult> => {
    setLoading(true)
    try {
      const result = await signInWithCredentials(credentials)
      if (result.ok && result.data) {
        setUser(result.data.user)
        return { ok: true, data: undefined }
      }
      return { ok: false, error: result.ok ? 'Failed to sign in.' : result.error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (): Promise<void> => {
    setLoading(true)
    try {
      await signOutUser()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    signIn,
    signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
