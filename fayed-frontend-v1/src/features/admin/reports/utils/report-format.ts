export function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

export function formatMoney(locale: string, value: string, currencyCode?: string | null) {
  const parsed = Number(value || "0");
  if (currencyCode) {
    return new Intl.NumberFormat(normalizeLocale(locale), {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsed);
  }
  return new Intl.NumberFormat(normalizeLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function formatCompactNumber(locale: string, value: string) {
  const parsed = Number(value || "0");
  return new Intl.NumberFormat(normalizeLocale(locale)).format(parsed);
}

export function formatDateLabel(locale: string, value: string) {
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(locale: string, value: string) {
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

