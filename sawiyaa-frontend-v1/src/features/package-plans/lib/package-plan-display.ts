export function formatPercent(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount}%` : value;
}

export function formatDurationLabel(durationMinutes: number) {
  return `${durationMinutes} min`;
}
