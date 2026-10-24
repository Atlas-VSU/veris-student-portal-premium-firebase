import 'server-only'

import type { SessionUser } from '@/features/auth/types'
import { isOrganizationEligibleForStudent } from './eligibility'
import { getPremiumOrganizationsUseCase } from './usecases/get-premium-organizations.usecase'

export async function getEligibleOrganizationIdsService(
  student: SessionUser
): Promise<string[]> {
  const organizations = await getPremiumOrganizationsUseCase()

  return organizations
    .filter((organization) => isOrganizationEligibleForStudent(organization, student))
    .map((organization) => organization.id)
}

