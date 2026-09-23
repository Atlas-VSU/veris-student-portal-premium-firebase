import type { ActionResult } from '@/types'

export type { ActionResult }

export interface LogEntry {
  userId: string
  action: string
  success: boolean
  error?: string
}

export interface SessionClaims {
  uid: string
  email?: string
  role?: 'user' | 'admin' | 'super-admin'
  [key: string]: unknown
}

export interface SessionUser {
  uid: string
  email: string
  firstName?: string
  lastName?: string
  studentId?: string
  role: 'user' | 'admin' | 'super-admin'
  programId?: string
  facultyId?: string
  orgId?: string
  yearLevel?: number
  status?: 'pending' | 'approved'
  corURL?: string
}

export interface SessionUserRecord {
  uid: string
  email?: string
  firstName?: string
  lastName?: string
  studentId?: string
  role?: string
  programId?: string
  facultyId?: string
  orgId?: string
  yearLevel?: number
  status?: string
  corURL?: string
  isDeleted: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (credentials: LoginCredentials) => Promise<ActionResult>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}
