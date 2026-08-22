export function maskPayoutIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length <= 4 ? '••••' : `••••${normalized.slice(-4)}`;
}

export function maskPayoutEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const [local, domain] = value.trim().split('@');
  if (!domain) return maskPayoutIdentifier(value);
  return `${local.slice(0, 1)}***@${domain}`;
}
