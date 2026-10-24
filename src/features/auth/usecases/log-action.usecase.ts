import { adminDb } from '@/lib/firebase/admin'
import type { LogEntry } from '../types'

export async function logAction(entry: LogEntry): Promise<void> {
  // A failed log write must never surface as a user-facing error
  try {
    await adminDb.collection('audit_logs').add({
      ...entry,
      timestamp: Date.now(),
    })
  } catch {
    // logging failure is not a user concern
  }
}
