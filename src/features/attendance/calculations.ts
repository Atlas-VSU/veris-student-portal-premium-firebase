import type { AttendanceHistoryItem, AttendanceStats, TermFilter } from './types'

export function matchesTerm(
  filter: TermFilter | undefined,
  academicYear: string | undefined,
  semester: string | undefined
): boolean {
  if (filter?.academicYear && academicYear !== filter.academicYear) {
    return false
  }

  if (filter?.semester && semester !== filter.semester) {
    return false
  }

  return true
}

export function calculateAttendanceStats(
  history: AttendanceHistoryItem[]
): AttendanceStats {
  const presentCount = history.filter((item) => item.status === 'present').length
  const partialCount = history.filter((item) => item.status === 'partially present').length
  const absences = history.filter((item) => item.status === 'absent')

  return {
    presentCount,
    partialCount,
    totalAttended: presentCount,
    absencesCount: absences.length,
    pendingAppealsCount: absences.filter((item) => item.isPendingAppeal).length,
  }
}
