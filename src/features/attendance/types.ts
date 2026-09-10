import type { ActionResult } from '@/types'
import type { Timestamp } from 'firebase-admin/firestore'

export type { ActionResult }

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
