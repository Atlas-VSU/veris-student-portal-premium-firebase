import type { StudentFee, FeeStatus } from './types'

// Fee domain business rules and balance calculation
export function calculateFeeBalance(amount: number, paidAmount: number): { balance: number; status: FeeStatus } {
  const balance = Math.max(0, amount - paidAmount)
  let status: FeeStatus = 'unpaid'

  if (balance === 0 && amount > 0) {
    status = 'paid'
  } else if (paidAmount > 0 && balance > 0) {
    status = 'partial'
  }

  return { balance, status }
}

export function isFeeOverdue(fee: StudentFee): boolean {
  if (!fee.dueDate) return false
  return fee.dueDate.toMillis() < Date.now() && fee.balance > 0
}
