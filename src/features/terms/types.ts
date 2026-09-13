import type { ActionResult } from '@/types'

export type { ActionResult }

export type AcademicSemester = '1st' | '2nd'

export interface Term {
  id: string
  AY: string
  semester: AcademicSemester
  isActive: boolean
  isDeleted: boolean
  metadata?: {
    createdAt?: string | null
    updatedAt?: string | null
  }
}

export interface TermFilter {
  academicYear?: string
  semester?: AcademicSemester | string
}
