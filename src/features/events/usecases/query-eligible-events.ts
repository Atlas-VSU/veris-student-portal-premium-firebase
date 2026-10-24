import type { Firestore } from 'firebase-admin/firestore'
import { mapWithConcurrency } from '../../../lib/map-with-concurrency'

export interface GetEventsInput {
  eligibleOrganizationIds: readonly string[]
  academicYear?: string
  semester?: string
}

export async function queryEligibleEvents(db: Pick<Firestore, 'collection'>, input: GetEventsInput) {
  const organizationIds = [...new Set(input.eligibleOrganizationIds)]
  const chunks: string[][] = []
  for (let index = 0; index < organizationIds.length; index += 30) {
    chunks.push(organizationIds.slice(index, index + 30))
  }

  const snapshots = await mapWithConcurrency(chunks, 5, async (chunk) => {
    let query = db.collection('events')
      .where('isDeleted', '==', false)
      .where('orgId', 'in', chunk)

    if (input.academicYear) {
      query = query.where('academicYear', '==', input.academicYear)
    }
    if (input.semester) {
      query = query.where('semester', '==', input.semester)
    }

    return query.get()
  })

  return snapshots.flatMap((snapshot) => snapshot.docs)
}
