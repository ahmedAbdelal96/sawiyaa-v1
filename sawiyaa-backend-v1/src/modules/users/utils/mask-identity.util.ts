/**
 * Users Module returns a lightweight identity summary for UI display,
 * but it should not expose full contact values unless a later dedicated profile module owns that decision.
 */
export function maskIdentityValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (value.includes('@')) {
    const [localPart, domain] = value.split('@');
    const visibleStart = localPart.slice(0, 2);
    return `${visibleStart}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
  }

  const lastDigits = value.slice(-2);
  return `${'*'.repeat(Math.max(value.length - 2, 4))}${lastDigits}`;
}
