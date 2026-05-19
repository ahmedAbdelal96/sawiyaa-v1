import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";

export function formatSettlementDateTime(
  locale: string,
  value: string | null | undefined,
) {
  if (!value) return "-";

  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

export function formatSettlementDate(
  locale: string,
  value: string | null | undefined,
) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatSettlementMoney(
  locale: string,
  value: string | number,
  currency: string | null | undefined,
) {
  return formatFinanceMoney(locale, value, currency, {
    fallbackText: locale === "ar" ? "العملة غير متاحة" : "Currency unavailable",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toDateTimeLocalInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
