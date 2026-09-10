import type { ActionResult } from '@/types'
import type { Timestamp } from 'firebase-admin/firestore'

export type { ActionResult }

export type AcademicSemester = '1st' | '2nd'

export interface Term {
  id: string
  AY: string
  semester: AcademicSemester
  isActive: boolean
  isDeleted: boolean
  metadata?: {
    createdAt: Timestamp
    updatedAt: Timestamp
  }
}
