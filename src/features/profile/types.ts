import type { ActionResult } from '@/types'
import type { Timestamp } from 'firebase-admin/firestore'

export type { ActionResult }

export interface StudentProfile {
  id: string
  studentId: string
  email: string
  firstName: string
  lastName: string
  programId: string
  facultyId: string
  orgId: string
  role: 'user' | 'admin' | 'super-admin'
  yearLevel: number
  status: 'pending' | 'approved'
  corURL?: string
  isDeleted: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
  registrationAt?: Timestamp
}

export interface UpdateProfileInput {
  firstName?: string
  lastName?: string
  yearLevel?: number
  corURL?: string
}
