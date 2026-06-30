/**
 * Shared validators for LoopOS.
 *
 * Pure validation functions (no side-effects) used across all packages.
 * Will be backed by Zod schemas once implemented in Etapa 2.
 */

export function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

export function isValidMood(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
  return typeof value === 'number' && [1, 2, 3, 4, 5].includes(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
