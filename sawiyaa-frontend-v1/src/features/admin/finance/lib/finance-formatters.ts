import { normalizeCurrencyCode } from "@/lib/finance-format";
import type { FinanceMoneyFormatOptions } from "@/lib/finance-format";

/** Compact amount format used by Admin financial screens only. */
export function formatAdminMoney(
  amount: string | number,
  currencyCode: string | null | undefined,
  _locale: string,
) {
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  const currency = normalizeCurrencyCode(currencyCode);

  if (!Number.isFinite(numeric) || !currency) {
    return typeof amount === "string" ? amount : String(amount);
  }

  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numeric);

  return currency === "USD"
    ? `$${formattedAmount}`
    : `${currency} ${formattedAmount}`;
}

export function formatAdminMoneyForLocale(
  locale: string,
  amount: string | number,
  currencyCode: string | null | undefined,
  _options?: FinanceMoneyFormatOptions,
) {
  return formatAdminMoney(amount, currencyCode, locale);
}

export function formatSettlementDateTime(locale: string, value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

export function formatSettlementMoney(
  locale: string,
  value: string | null,
  currency: string | null,
) {
  if (value === null || value === undefined || !currency) {
    return "-";
  }

  return formatAdminMoney(value, currency, locale);
}

export function toDateTimeLocalInputValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-")
    .concat("T")
    .concat([pad(date.getHours()), pad(date.getMinutes())].join(":"));
}
