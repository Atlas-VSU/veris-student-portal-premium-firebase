import 'server-only'

import { adminDb } from '@/lib/firebase/admin'
import type {
  OrganizationAccessLevel,
  OrganizationAccessRecord,
} from '../types'

function isAccessLevel(value: unknown): value is OrganizationAccessLevel {
  return value === 1 || value === 2 || value === 3
}

export async function getPremiumOrganizationsUseCase(): Promise<OrganizationAccessRecord[]> {
  const snapshot = await adminDb
    .collection('organizations')
    .where('subscribed', '==', true)
    .get()

  return snapshot.docs.flatMap((doc) => {
    const data = doc.data()

    if (data.isArchived === true || !isAccessLevel(data.accessLevel)) {
      return []
    }

    return [{
      id: doc.id,
      accessLevel: data.accessLevel,
      programId: typeof data.programId === 'string' ? data.programId : undefined,
      facultyId: typeof data.facultyId === 'string' ? data.facultyId : undefined,
    }]
  })
}

