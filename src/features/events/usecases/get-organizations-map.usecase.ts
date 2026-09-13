import { adminDb } from '@/lib/firebase/admin'

export interface OrganizationInfo {
  id: string
  name: string
  acronym?: string
  accessLevel?: 1 | 2 | 3
}

export async function getOrganizationsMapUseCase(): Promise<Map<string, OrganizationInfo>> {
  const map = new Map<string, OrganizationInfo>()
  try {
    const snapshot = await adminDb.collection('organizations').get()
    for (const doc of snapshot.docs) {
      const data = doc.data()
      if (data.isDeleted) continue
      map.set(doc.id, {
        id: doc.id,
        name: data.name || data.title || 'University Organization',
        acronym: data.acronym || data.code,
        accessLevel: data.accessLevel,
      })
    }
  } catch (err) {
    console.error('Failed to fetch organizations map in getOrganizationsMapUseCase:', err)
  }
  return map
}
