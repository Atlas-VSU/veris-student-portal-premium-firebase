import type { UpdateProfileInput } from './types'

// Profile business rules and validation
export function validateProfileInput(input: UpdateProfileInput): { valid: boolean; error?: string } {
  if (input.yearLevel !== undefined && (input.yearLevel < 1 || input.yearLevel > 6)) {
    return { valid: false, error: 'Year level must be between 1 and 6.' }
  }
  return { valid: true }
}
