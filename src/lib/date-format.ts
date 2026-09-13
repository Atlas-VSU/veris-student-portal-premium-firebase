/**
 * Helper to safely extract a Javascript Date object from various timestamp representations
 * (Firestore Timestamp, serialized { _seconds, _nanoseconds } / { seconds, nanoseconds },
 * ISO date string, or Unix epoch number).
 */
export function toSafeDate(val: unknown): Date | null {
  if (!val) return null

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val
  }

  // Firestore Timestamp instance (toDate method)
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (val as { toDate: () => Date }).toDate()
      return isNaN(d.getTime()) ? null : d
    } catch {
      return null
    }
  }

  // Serialized Firestore Timestamp object
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>
    const seconds = (obj._seconds ?? obj.seconds) as number | undefined
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000)
    }
  }

  if (typeof val === 'number') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }

  if (typeof val === 'string') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }

  return null
}

/**
 * Serializes any timestamp/Date into an ISO-8601 string (or null).
 * Guarantees safe transfer across Next.js Server Action / RSC boundaries.
 */
export function toIsoString(val: unknown): string | null {
  const d = toSafeDate(val)
  return d ? d.toISOString() : null
}

/**
 * Format date as "MMM DD, YYYY" (e.g. "Oct 14, 2025")
 */
export function formatDate(val: unknown): string {
  const d = toSafeDate(val)
  if (!d) return '—'

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format time as "hh:mm A" (e.g. "08:30 AM")
 */
export function formatTime(val: unknown): string {
  const d = toSafeDate(val)
  if (!d) return '—'

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format combined date and time as "MMM DD, YYYY • hh:mm A"
 */
export function formatDateTime(val: unknown): string {
  const d = toSafeDate(val)
  if (!d) return '—'

  const datePart = formatDate(d)
  const timePart = formatTime(d)
  return `${datePart} • ${timePart}`
}
