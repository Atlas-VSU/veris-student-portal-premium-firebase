import type { ActionResult } from '@/types'
import type { Timestamp } from 'firebase-admin/firestore'
import type { TermFilter } from '@/features/terms/types'

export type { ActionResult, TermFilter }

export type FineStatus = 'unpaid' | 'partial' | 'paid' | 'pending' | 'waived'

export interface FineType {
  id: string
  name: string
  description?: string
  defaultAmount: number
  requiresTimeIn: boolean
  requiresTimeOut?: boolean
  majorEventsOnly: boolean
  orgId: string
}

export interface FineParent {
  id: string
  orgId: string
  userId: string
  userName: string
  studentId: string
  academicYear: string
  semester: string
  accumulatedAmount: number
  paidAmount: number
  waivedAmount?: number
  balance: number
  status: FineStatus
  fineItemsCount: number
  firstFineIssuedAt?: Timestamp
  lastFineIssuedAt?: Timestamp
  dueDate?: Timestamp
  waivedBy?: string
  waivedReason?: string
  waivedAt?: Timestamp
  remarks?: string
  metadata?: {
    createdAt?: Timestamp
    updatedAt?: Timestamp
    isArchived?: boolean
  }
}

export interface FineItem {
  id: string
  itemNumber: number
  fineTypeId: string
  fineTypeName: string
  eventId: string
  eventName: string
  eventDate: Timestamp
  amount: number
  reason: string
  issuedBy?: string
  issuedAt?: Timestamp
  isWaived: boolean
  waivedBy?: string
  waivedReason?: string
  waivedAt?: Timestamp
  isPaid: boolean
  isPending: boolean
  isArchived: boolean
  parentFineId: string
  userId: string
  studentId: string
  academicYear: string
  semester: string
}
