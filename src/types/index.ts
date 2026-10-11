/**
 * Shared Type Definitions for VERIS Student Portal
 * Defines cross-feature types, standard result shapes, and base utility models.
 */

/**
 * Standard discriminated union return type for all Server Actions and Services.
 * Enforces safe error handling without throwing unhandled exceptions across server/client boundaries.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Common pagination cursor wrapper for paginated collections
 */
export interface PaginatedResult<T> {
  items: T[];
  lastDocId?: string | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Standard Firestore Timestamp representation for types bridging Client and Server
 */
export interface BaseTimestamp {
  seconds: number;
  nanoseconds: number;
}
