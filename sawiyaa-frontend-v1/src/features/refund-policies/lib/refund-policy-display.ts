export function pickLocalizedString(
  value: Record<string, unknown> | string | null | undefined,
  locale: string,
): string {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const record = value as Record<string, unknown>;
  const preferredLocale = locale.startsWith("ar") ? "ar" : "en";
  const fallback = record.en ?? record.ar ?? Object.values(record)[0];
  const selected = record[locale] ?? record[preferredLocale] ?? fallback;

  return typeof selected === "string" ? selected : "";
}

export function formatRefundPolicyDate(
  iso: string | null,
  locale: string,
): string {
  if (!iso) {
    return "";
  }

  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

