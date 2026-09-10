import type { ActionResult } from '@/types'
import type { Timestamp } from 'firebase-admin/firestore'

export type { ActionResult }

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'archived'

export interface Event {
  id: string
  name: string
  date: Timestamp
  location: string
  note?: string
  majorEvent: boolean
  fineTypeId: string
  orgId: string
  programId?: string
  facultyId?: string
  accessLevelEvent?: 1 | 2 | 3
  status: EventStatus
  attendees: number
  academicYear: string
  semester: string
  finesGenerated?: boolean
  manuallyCompleted?: boolean
  timeInStart?: string // 'HH:MM'
  timeInEnd?: string
  timeOutStart?: string
  timeOutEnd?: string
  isDeleted: boolean
  createdAt?: Timestamp
}
