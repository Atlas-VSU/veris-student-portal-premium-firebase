import type { Term } from './types'
import type { TermFilter } from './types'
import { getActiveTermUseCase } from './usecases/get-active-term.usecase'
import { getAllTermsUseCase } from './usecases/get-all-terms.usecase'

export class ActiveTermUnavailableError extends Error {
  constructor() {
    super('No active academic term is currently configured.')
    this.name = 'ActiveTermUnavailableError'
  }
}

export function isTermActive(term: Term): boolean {
  return term.isActive && !term.isDeleted
}

export async function getActiveTermService(): Promise<Term | null> {
  return getActiveTermUseCase()
}

export async function getAllTermsService(): Promise<Term[]> {
  return getAllTermsUseCase()
}

export async function resolveTermFilterService(
  filter?: TermFilter
): Promise<TermFilter> {
  if (filter !== undefined) {
    return filter
  }

  const activeTerm = await getActiveTermService()
  if (!activeTerm) {
    throw new ActiveTermUnavailableError()
  }

  return {
    academicYear: activeTerm.AY,
    semester: activeTerm.semester,
  }
}
