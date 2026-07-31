export function getSessionCodeDisplay(
  sessionCode: string | null | undefined,
  unavailableLabel: string,
): string {
  const value = sessionCode?.trim();
  return value || unavailableLabel;
}
