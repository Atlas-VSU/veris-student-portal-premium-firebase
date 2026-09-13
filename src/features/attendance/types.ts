import type { ActionResult } from '@/types'
import type { Timestamp } from 'firebase-admin/firestore'
import type { TermFilter } from '@/features/terms/types'

export type { ActionResult, TermFilter }

export type AttendanceStatus = 'partially present' | 'present'

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
  timeIn?: Timestamp
  timeOut?: Timestamp
  status: AttendanceStatus
  remark?: string
  orgId: string
}

export interface AttendanceHistoryItem {
  id: string
  eventId: string
  eventName: string
  eventDate?: Timestamp
  location?: string
  majorEvent: boolean
  timeIn?: Timestamp
  timeOut?: Timestamp
  status: AttendanceStatus
  remark?: string
}

export interface AttendanceStats {
  presentCount: number
  partialCount: number
  totalAttended: number
  absencesCount: number
}
