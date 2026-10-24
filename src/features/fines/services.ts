import type { FineStatus } from './types'

export function calculateFineBalance(
  accumulated: number,
  paid: number,
  waived = 0
): { balance: number; status: FineStatus } {
  const balance = Math.max(0, accumulated - paid - waived)
  let status: FineStatus = 'unpaid'

  if (balance === 0 && accumulated > 0) {
    status = waived > 0 && paid === 0 ? 'waived' : 'paid'
  } else if (paid > 0 && balance > 0) {
    status = 'partial'
  }

  return { balance, status }
}
