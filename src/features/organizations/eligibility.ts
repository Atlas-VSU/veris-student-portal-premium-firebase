import type { SessionUser } from '@/features/auth/types'
import type { OrganizationAccessRecord } from './types'

export function isOrganizationEligibleForStudent(
  organization: OrganizationAccessRecord,
  student: SessionUser
): boolean {
  if (organization.accessLevel === 3) {
    return true
  }

  if (organization.accessLevel === 2) {
    return Boolean(
      organization.facultyId &&
      student.facultyId &&
      organization.facultyId === student.facultyId
    )
  }

  return Boolean(
    organization.programId &&
    student.programId &&
    organization.programId === student.programId
  )
}

