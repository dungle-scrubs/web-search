/** Result-count bounds shared by every provider. */

export const MAX_RESULTS = 20;
const DEFAULT_RESULTS = 10;

/** Clamp a requested count into [1, MAX_RESULTS], defaulting non-integers. */
export function boundedCount(count: number): number {
  if (!Number.isInteger(count)) {
    return DEFAULT_RESULTS;
  }
  return Math.max(1, Math.min(count, MAX_RESULTS));
}
