import type { ActionResult } from '@/types'
import type { Timestamp } from 'firebase-admin/firestore'
import type { TermFilter } from '@/features/terms/types'

export type { ActionResult, TermFilter }

export type ClearanceState = 'cleared' | 'not_cleared' | 'pending'

export interface BlockingItem {
  type: 'fees' | 'fines'
  referenceId: string
  parentFineId?: string
  title: string
  balance: number
  status: 'unpaid' | 'paid'
  pendingReview: boolean
  isRequiredForClearance: boolean
  academicYear: string
  semester: string
}

export interface ClearanceStatus {
  id: string
  userId: string
  orgId: string
  studentId: string
  userName: string
  academicYear: string
  semester: string
  status: ClearanceState
  isArchived: boolean
  visibility?: 'public' | 'private'
  blockingItems: Record<string, BlockingItem>
  clearanceDate?: Timestamp | null
  lastCalculatedAt?: Timestamp
  startDate?: Timestamp
  dueDate?: Timestamp
  createdAt?: Timestamp
  updatedAt?: Timestamp
}
