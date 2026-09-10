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
}
