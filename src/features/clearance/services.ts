import type { BlockingItem, ClearanceState } from './types'

// Clearance state machine resolution
export function evaluateClearanceState(blockingItems: Record<string, BlockingItem>): ClearanceState {
  const items = Object.values(blockingItems || {})
  const hasUnpaidRequired = items.some(
    (item) => (item.status === 'unpaid' || item.balance > 0) && item.isRequiredForClearance
  )

  if (!hasUnpaidRequired) {
    return 'cleared'
  }

  const hasPendingReview = items.some(
    (item) => (item.status === 'unpaid' || item.balance > 0) && item.isRequiredForClearance && item.pendingReview
  )

  return hasPendingReview ? 'pending' : 'not_cleared'
}
