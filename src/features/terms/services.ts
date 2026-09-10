import type { Term } from './types'

// Terms orchestration and business rules
export function isTermActive(term: Term): boolean {
  return term.isActive && !term.isDeleted
}
