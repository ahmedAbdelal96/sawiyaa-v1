import type {
  PractitionerLedgerBalanceBucket,
  PractitionerLedgerDirection,
  PractitionerLedgerEntryType,
  PractitionerSettlementStatus,
} from "./types";
import {
  formatViewerDate,
  formatViewerDateTime,
} from "../../../lib/time-formatting";
import { formatMoney as formatCentralMoney, parseMoney } from "../../../lib/money";

function safeNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function shiftMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isLongHexLike(value: string) {
  return /^[0-9a-f]{24,}$/i.test(value.replace(/-/g, ""));
}

export function isLikelyInternalFinanceText(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) {
    return true;
  }

  if (/DEV_FINANCE_SEED/i.test(text)) {
    return true;
  }

  if (/^\s*(gc_|session_|payment_|settlement_)/i.test(text)) {
    return true;
  }

  if (isUuidLike(text) || isLongHexLike(text)) {
    return true;
  }

  if (/^DEV_/i.test(text) || /^SEED_/i.test(text)) {
    return true;
  }

  return false;
}

export function safeFinanceText(
  value: string | null | undefined,
  fallback: string,
) {
  if (isLikelyInternalFinanceText(value)) {
    return fallback;
  }

  return value!.trim();
}

export function formatMoney(
  amount: string | number,
  currency: string | null | undefined,
  locale: string,
  fallbackText = "-",
) {
  const normalizedAmount = typeof amount === "number" ? amount.toFixed(2) : amount.trim();
  const money = parseMoney(normalizedAmount, currency);
  if (!money) {
    return fallbackText;
  }

  return formatCentralMoney(money, locale);
}

export function formatSignedMoney(
  amount: string | number,
  currency: string | null | undefined,
  locale: string,
  fallbackText = "-",
) {
  const numeric = safeNumber(amount);
  const sign = numeric < 0 ? "-" : "+";
  const absolute = formatMoney(Math.abs(numeric), currency, locale, fallbackText);
  return `${sign}${absolute}`;
}

export function formatDateTime(value: string | null, locale: string) {
  return formatViewerDateTime(value, {
    locale,
    fallbackText: "-",
  });
}

export function formatDateShort(value: string | null, locale: string) {
  return formatViewerDate(value, {
    locale,
    fallbackText: "-",
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
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export type FinancePeriodPreset = "ALL" | "THIS_MONTH" | "LAST_3_MONTHS" | "LAST_12_MONTHS";

export function buildFinancePeriodRange(
  preset: FinancePeriodPreset,
  referenceDate = new Date(),
) {
  if (preset === "ALL") {
    return {};
  }

  const to = endOfDay(referenceDate);
  const from =
    preset === "THIS_MONTH"
      ? startOfMonth(referenceDate)
      : startOfMonth(shiftMonths(referenceDate, preset === "LAST_3_MONTHS" ? -2 : -11));

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
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

export function settlementStatusLabel(
  status: PractitionerSettlementStatus,
  translate: (key: string) => string,
) {
  return translate(settlementStatusTranslationKey(status));
}

export function settlementStatusTranslationKey(status: PractitionerSettlementStatus) {
  return `practitioner.finance.settlements.statuses.${status}`;
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

export function ledgerEntryTypeLabel(
  entryType: PractitionerLedgerEntryType,
  translate: (key: string) => string,
) {
  return translate(ledgerEntryTypeTranslationKey(entryType));
}

export function ledgerEntryTypeTranslationKey(entryType: PractitionerLedgerEntryType) {
  return `practitioner.finance.ledger.entryTypes.${entryType}`;
}

export function ledgerDirectionLabel(
  direction: PractitionerLedgerDirection,
  translate: (key: string) => string,
) {
  return translate(`practitioner.finance.ledger.directions.${direction}`);
}

export function ledgerBucketLabel(
  bucket: PractitionerLedgerBalanceBucket,
  translate: (key: string) => string,
) {
  return translate(ledgerBucketTranslationKey(bucket));
}

export function ledgerBucketTranslationKey(bucket: PractitionerLedgerBalanceBucket) {
  return `practitioner.finance.ledger.buckets.${bucket}`;
}

export function directionTone(direction: PractitionerLedgerDirection) {
  return direction === "CREDIT" ? ("success" as const) : ("error" as const);
}

export function periodPresetLabel(
  preset: FinancePeriodPreset,
  locale: string,
) {
  const labelsAr: Record<FinancePeriodPreset, string> = {
    ALL: "الكل",
    THIS_MONTH: "هذا الشهر",
    LAST_3_MONTHS: "آخر 3 أشهر",
    LAST_12_MONTHS: "آخر 12 شهرًا",
  };

  const labelsEn: Record<FinancePeriodPreset, string> = {
    ALL: "All",
    THIS_MONTH: "This month",
    LAST_3_MONTHS: "Last 3 months",
    LAST_12_MONTHS: "Last 12 months",
  };

  return locale.startsWith("ar") ? labelsAr[preset] : labelsEn[preset];
}
