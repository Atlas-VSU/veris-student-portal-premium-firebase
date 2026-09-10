import type { ActionResult } from '@/types'
import type { Timestamp } from 'firebase-admin/firestore'

export type { ActionResult }

export type FeeStatus = 'unpaid' | 'partial' | 'paid' | 'pending'
export type PaymentMethod = 'gcash' | 'cash' | 'bank_transfer' | 'waiver'
export type PaymentVerificationStatus = 'pending' | 'verified' | 'rejected'

export interface FeeItem {
  id: string
  title: string
  amount: number
  feeType: string
  description?: string
  dueDate?: Timestamp
  isRequiredForClearance: boolean
  orgId: string
  academicYear: string
  semester: string
  totalStudents?: number
  isArchived: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface StudentFee {
  id: string
  orgId: string
  userId: string
  studentId: string
  userName: string
  feeItemId: string
  feeType: string
  title: string
  amount: number
  paidAmount: number
  balance: number
  status: FeeStatus
  dueDate?: Timestamp
  isRequiredForClearance: boolean
  eventId?: string
  description?: string
  createdBy?: string
  academicYear: string
  semester: string
  isArchived: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface PaymentHistoryEntry {
  id: string
  paymentNumber: number
  amount: number
  paymentMethod: PaymentMethod
  paymentProofId?: string
  status: PaymentVerificationStatus
  paidAt: Timestamp
  verifiedBy?: string
  verifiedByName?: string
  verifiedAt?: Timestamp
  rejectionReason?: string
  notes?: string
  createdAt?: Timestamp
}

export interface ProofOfPayment {
  id: string
  orgId: string
  userId: string
  studentId: string
  userName: string
  paymentType: 'fees' | 'fines' | 'bulk'
  referenceId: string // feeId, fineId, or 'bulk_transaction'
  paymentHistoryId?: string | string[]
  amount: number
  paymentMethod: PaymentMethod
  referenceNumber?: string
  senderNumber?: string
  imageUrl?: string
  status: PaymentVerificationStatus
  submittedAt: Timestamp
  verifiedBy?: string
  verifiedByName?: string
  verifiedAt?: Timestamp
  rejectionReason?: string
  notes?: string
  itemKeys?: string[] // feeItemIds for querying
  isArchived?: boolean
  academicYear: string
  semester: string
}
