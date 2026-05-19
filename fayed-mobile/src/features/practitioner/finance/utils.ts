import type {
  PractitionerLedgerEntryType,
  PractitionerSettlementStatus,
} from "./types";

function normalizeLocale(locale: string) {
  return locale.startsWith("ar") ? "ar-EG" : "en-US";
}

export function formatMoney(
  amount: string,
  currency: string | null | undefined,
  locale: string,
  fallbackText = "-",
) {
  const numeric = Number(amount || "0");
  const currencyCode = currency?.trim().toUpperCase();
  if (!currencyCode) {
    return fallbackText;
  }
  return new Intl.NumberFormat(normalizeLocale(locale), {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateShort(value: string | null, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function shortId(value: string | null, length = 8) {
  if (!value) return "-";
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

export function monthYearLabel(
  year: number,
  month: number,
  locale: string,
) {
  const date = new Date(year, Math.max(month - 1, 0), 1);
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

export function settlementStatusTone(status: PractitionerSettlementStatus) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "READY":
    case "PROCESSING":
      return "warning" as const;
    case "FAILED":
    case "CANCELLED":
      return "error" as const;
    default:
      return "info" as const;
  }
}

export function ledgerTypeTone(entryType: PractitionerLedgerEntryType) {
  switch (entryType) {
    case "PRACTITIONER_EARNING":
      return "success" as const;
    case "SETTLEMENT_PAYOUT":
    case "SETTLEMENT_REVERSAL":
      return "info" as const;
    case "REFUND_PRACTITIONER_REVERSAL":
    case "REFUND_PLATFORM_REVERSAL":
      return "warning" as const;
    case "MANUAL_ADJUSTMENT":
      return "warning" as const;
    default:
      return "default" as const;
  }
}

export function directionTone(direction: "CREDIT" | "DEBIT") {
  return direction === "CREDIT" ? ("success" as const) : ("error" as const);
}
