import type { Term } from './types'

export function isTermActive(term: Term): boolean {
  return term.isActive && !term.isDeleted
}
