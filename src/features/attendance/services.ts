import type { AttendanceRecord, AttendanceStatus } from './types'

// Attendance domain orchestration
export function resolveAttendanceStatus(record: Partial<AttendanceRecord>): AttendanceStatus {
  return record.timeIn && record.timeOut ? 'present' : 'partially present'
}
