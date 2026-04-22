export function resolveRange(input: { from?: string; to?: string }) {
  const to = input.to ? new Date(input.to) : new Date();
  const from = input.from
    ? new Date(input.from)
    : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

  return { from, to };
}

export function isValidRange(from: Date, to: Date) {
  return !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to;
}

export function toUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildDailyBuckets(from: Date, to: Date): string[] {
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

  const result: string[] = [];
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
    result.push(toUtcDateKey(cursor));
  }
  return result;
}

