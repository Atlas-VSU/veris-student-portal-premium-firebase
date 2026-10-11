import type { ActionResult } from '@/types'
import type { TermFilter } from '@/features/terms/types'

export type { ActionResult, TermFilter }

export type AttendanceStatus = 'present' | 'partially present' | 'absent'
export type AttendanceFineState = 'outstanding' | 'pending_review' | 'paid' | 'waived'

export interface AttendanceRecord {
  id: string
  eventId: string
  userId: string
  studentId: string
  student?: {
    firstName?: string
    lastName?: string
    email?: string
    programId?: string
    facultyId?: string
    yearLevel?: number
  }
  timeIn?: string | null
  timeOut?: string | null
  status: AttendanceStatus
  remark?: string
  orgId: string
}

export interface AttendanceHistoryItem {
  id: string
  eventId: string
  eventName: string
  eventDate?: string | null
  location?: string
  orgId?: string
  orgName?: string
  majorEvent: boolean
  timeIn?: string | null
  timeOut?: string | null
  status: AttendanceStatus
  remark?: string
  fineAmount?: number
  fineState?: AttendanceFineState
  waiverReason?: string
  parentFineId?: string
  fineItemId?: string
}

export interface AttendanceStats {
  presentCount: number
  partialCount: number
  totalAttended: number
  absencesCount: number
}

export interface AttendanceOverview {
  history: AttendanceHistoryItem[]
  stats: AttendanceStats
}

export interface AttendanceFineParent {
  id: string
  orgId: string
  orgName?: string
  academicYear?: string
  semester?: string
}

export interface AttendanceFineItem {
  id: string
  eventId: string
  eventName?: string
  eventDate?: unknown
  amount: number
  reason?: string
  isPending: boolean
  isPaid: boolean
  isWaived: boolean
  waivedReason?: string
}
