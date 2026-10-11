import type { ActionResult } from '@/types'
import type { TermFilter } from '@/features/terms/types'

export type { ActionResult, TermFilter }

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'archived'

export interface Event {
  id: string
  name: string
  date: string
  location: string
  note?: string
  majorEvent: boolean
  fineTypeId: string
  orgId: string
  orgName?: string
  programId?: string
  facultyId?: string
  accessLevelEvent?: 1 | 2 | 3
  status: EventStatus
  attendees: number
  academicYear: string
  semester: string
  finesGenerated?: boolean
  manuallyCompleted?: boolean
  timeInStart?: string
  timeInEnd?: string
  timeOutStart?: string
  timeOutEnd?: string
  isDeleted: boolean
  createdAt?: string | null
}

export interface EventSummary {
  id: string
  name: string
  date: string
  location: string
  orgName?: string
  majorEvent: boolean
  status: EventStatus
}
