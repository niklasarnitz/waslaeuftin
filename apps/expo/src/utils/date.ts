/**
 * Normalizes a date to local midnight (00:00:00.000).
 * This ensures that queries sent to tRPC on the same day share the exact same Date representation
 * in their query keys, guaranteeing cache hits.
 */
export function normalizeToStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
