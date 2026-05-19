import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";

export function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

export function formatMoney(locale: string, value: string, currencyCode?: string | null) {
  return formatFinanceMoney(normalizeLocale(locale), value, currencyCode);
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
