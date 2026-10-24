import type { AcademicSemester, TermFilter } from './types'

type TermFilterValidationResult =
  | { ok: true; data: TermFilter | undefined }
  | { ok: false; error: string }

function isAcademicSemester(value: unknown): value is AcademicSemester {
  return value === '1st' || value === '2nd'
}

export function validateTermFilter(input: unknown): TermFilterValidationResult {
  if (input === undefined) {
    return { ok: true, data: undefined }
  }

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'Invalid academic term selection.' }
  }

  const filter = input as Record<string, unknown>
  const academicYear = filter.academicYear
  const semester = filter.semester

  if (academicYear === undefined && semester === undefined) {
    return { ok: true, data: {} }
  }

  if (
    typeof academicYear !== 'string' ||
    !/^\d{4}-\d{4}$/.test(academicYear) ||
    !isAcademicSemester(semester)
  ) {
    return { ok: false, error: 'Invalid academic term selection.' }
  }

  return {
    ok: true,
    data: { academicYear, semester },
  }
}

