import type {
  PractitionerLedgerBalanceBucket,
  PractitionerLedgerDirection,
  PractitionerLedgerEntryType,
  PractitionerSettlementStatus,
} from "./types";

function normalizeLocale(locale: string) {
  return locale.startsWith("ar") ? "ar-EG" : "en-US";
}

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
  const currencyCode = currency?.trim().toUpperCase();
  if (!currencyCode) {
    return fallbackText;
  }

  return new Intl.NumberFormat(normalizeLocale(locale), {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(safeNumber(amount));
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
  locale: string,
) {
  const labelsAr: Record<PractitionerSettlementStatus, string> = {
    DRAFT: "مسودة",
    READY: "جاهزة للصرف",
    PROCESSING: "بانتظار الصرف",
    PAID: "تم الصرف",
    FAILED: "تعذر صرفها",
    CANCELLED: "ملغاة",
  };

  const labelsEn: Record<PractitionerSettlementStatus, string> = {
    DRAFT: "Draft",
    READY: "Ready for payout",
    PROCESSING: "Waiting for payout",
    PAID: "Paid out",
    FAILED: "Payout failed",
    CANCELLED: "Cancelled",
  };

  return locale.startsWith("ar") ? labelsAr[status] : labelsEn[status];
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
  locale: string,
) {
  const labelsAr: Record<PractitionerLedgerEntryType, string> = {
    SESSION_GROSS: "أرباح جلسة",
    PLATFORM_COMMISSION: "عمولة المنصة",
    PRACTITIONER_EARNING: "أرباح جلسة",
    COUPON_PLATFORM_SHARE: "خصم كود ترويجي",
    COUPON_PRACTITIONER_SHARE: "خصم كود ترويجي",
    REFUND_PLATFORM_REVERSAL: "استرداد جلسة",
    REFUND_PRACTITIONER_REVERSAL: "استرداد جلسة",
    MANUAL_ADJUSTMENT: "تعديل مالي",
    SETTLEMENT_PAYOUT: "صرف إلى حسابك",
    SETTLEMENT_REVERSAL: "تعديل على تسوية",
  };

  const labelsEn: Record<PractitionerLedgerEntryType, string> = {
    SESSION_GROSS: "Session earnings",
    PLATFORM_COMMISSION: "Platform fee",
    PRACTITIONER_EARNING: "Practitioner earnings",
    COUPON_PLATFORM_SHARE: "Coupon discount",
    COUPON_PRACTITIONER_SHARE: "Coupon discount",
    REFUND_PLATFORM_REVERSAL: "Refund correction",
    REFUND_PRACTITIONER_REVERSAL: "Refund correction",
    MANUAL_ADJUSTMENT: "Balance adjustment",
    SETTLEMENT_PAYOUT: "Settlement payout",
    SETTLEMENT_REVERSAL: "Settlement correction",
  };

  return locale.startsWith("ar") ? labelsAr[entryType] : labelsEn[entryType];
}

export function ledgerDirectionLabel(
  direction: PractitionerLedgerDirection,
  locale: string,
) {
  return locale.startsWith("ar")
    ? direction === "CREDIT"
      ? "إضافة"
      : "خصم"
    : direction === "CREDIT"
      ? "Credit"
      : "Debit";
}

export function ledgerBucketLabel(
  bucket: PractitionerLedgerBalanceBucket,
  locale: string,
) {
  const labelsAr: Record<PractitionerLedgerBalanceBucket, string> = {
    AVAILABLE: "متاح",
    PENDING: "قيد التحصيل",
    RESERVED: "قيد الصرف",
  };

  const labelsEn: Record<PractitionerLedgerBalanceBucket, string> = {
    AVAILABLE: "Available",
    PENDING: "Pending collection",
    RESERVED: "In payout",
  };

  return locale.startsWith("ar") ? labelsAr[bucket] : labelsEn[bucket];
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
