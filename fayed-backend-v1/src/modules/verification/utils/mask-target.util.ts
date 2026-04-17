/**
 * OTP responses may reveal that a code was sent, but they should not expose the full destination.
 */
export function maskTarget(target: string): string {
  if (target.includes('@')) {
    const [localPart, domain] = target.split('@');
    const visibleStart = localPart.slice(0, 2);
    return `${visibleStart}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
  }

  const lastDigits = target.slice(-2);
  return `${'*'.repeat(Math.max(target.length - 2, 4))}${lastDigits}`;
}
