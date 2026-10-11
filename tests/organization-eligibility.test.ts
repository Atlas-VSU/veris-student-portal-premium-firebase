import assert from 'node:assert/strict'
import test from 'node:test'

import { isOrganizationEligibleForStudent } from '../src/features/organizations/eligibility.ts'
import type { SessionUser } from '../src/features/auth/types.ts'
import type { OrganizationAccessRecord } from '../src/features/organizations/types.ts'

const student: SessionUser = {
  uid: 'student-1',
  email: 'student@example.edu',
  role: 'user',
  programId: 'program-1',
  facultyId: 'faculty-1',
}

function organization(
  input: Partial<OrganizationAccessRecord> & Pick<OrganizationAccessRecord, 'accessLevel'>
): OrganizationAccessRecord {
  return {
    id: 'org-1',
    ...input,
  }
}

test('organization eligibility follows program, faculty, and university scope', () => {
  assert.equal(
    isOrganizationEligibleForStudent(
      organization({ accessLevel: 1, programId: 'program-1' }),
      student
    ),
    true
  )
  assert.equal(
    isOrganizationEligibleForStudent(
      organization({ accessLevel: 1, programId: 'program-2' }),
      student
    ),
    false
  )
  assert.equal(
    isOrganizationEligibleForStudent(
      organization({ accessLevel: 2, facultyId: 'faculty-1' }),
      student
    ),
    true
  )
  assert.equal(
    isOrganizationEligibleForStudent(
      organization({ accessLevel: 2, facultyId: 'faculty-2' }),
      student
    ),
    false
  )
  assert.equal(
    isOrganizationEligibleForStudent(organization({ accessLevel: 3 }), student),
    true
  )
})

test('scoped organizations fail closed when the student or organization scope is missing', () => {
  assert.equal(
    isOrganizationEligibleForStudent(organization({ accessLevel: 1 }), student),
    false
  )
  assert.equal(
    isOrganizationEligibleForStudent(organization({ accessLevel: 2 }), student),
    false
  )
})
