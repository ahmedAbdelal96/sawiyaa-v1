import type { CreatePractitionerCouponRequest, UpdatePractitionerCouponRequest } from "./types";

const PRACTITIONER_PROMO_CODE_PATTERN = /^[A-Z0-9_-]+$/;

export type PractitionerPromoCodeErrorKind =
  | "duplicateCode"
  | "invalidCode"
  | "discountTooHigh"
  | "percentageOnly"
  | "invalidDateRange"
  | "usageLimitBelowCurrentUsage"
  | "notPractitioner"
  | "notFound"
  | "generic";

export interface PractitionerPromoCodeFormValues {
  code: string;
  discountValue: string;
  usageLimitTotal: string;
  usageLimitPerPatient: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export type PractitionerPromoCodeDateField = "startsAt" | "endsAt";

export function normalizePractitionerPromoCodeInput(value: string) {
  return value.trim().toUpperCase();
}

export function sanitizePractitionerPromoCodeInput(value: string) {
  return normalizePractitionerPromoCodeInput(value).replace(/[^A-Z0-9_-]/g, "");
}

const MAX_COUPON_PERCENT = 20;

export function normalizePercentageInput(value: string): string {
  if (value.startsWith("-")) return "";
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return "";
  const parts = cleaned.split(".");
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? "." + parts.slice(1).join("") : "";
  const numericValue = Number(integerPart + decimalPart);
  if (!Number.isFinite(numericValue)) return "";
  // Normalize trailing .0
  if (decimalPart === ".0") return integerPart;
  return integerPart + decimalPart;
}

export function isValidPractitionerPromoCode(code: string) {
  return PRACTITIONER_PROMO_CODE_PATTERN.test(code);
}

export function parseOptionalPositiveInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export function parseOptionalDateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return trimmed;
}

export function parsePractitionerPromoCodeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function serializePractitionerPromoCodeDate(
  date: Date,
  field: PractitionerPromoCodeDateField,
) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const time = field === "startsAt"
    ? "00:00:00.000"
    : "23:59:59.999";
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffsetMinutes / 60)).padStart(2, "0");
  const offsetRemainder = String(absoluteOffsetMinutes % 60).padStart(2, "0");

  return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${time}${offsetSign}${offsetHours}:${offsetRemainder}`;
}

export function validatePractitionerPromoCodeForm(
  values: PractitionerPromoCodeFormValues,
  options?: {
    discountLocked?: boolean;
  },
) {
  const errors: Partial<Record<keyof PractitionerPromoCodeFormValues, string>> = {};
  const normalizedCode = normalizePractitionerPromoCodeInput(values.code);
  const discountValue = normalizePercentageInput(values.discountValue).trim();
  const usageLimitTotal = parseOptionalPositiveInteger(values.usageLimitTotal);
  const usageLimitPerPatient = parseOptionalPositiveInteger(values.usageLimitPerPatient);
  const startsAt = parseOptionalDateValue(values.startsAt);
  const endsAt = parseOptionalDateValue(values.endsAt);

  if (!normalizedCode) {
    errors.code = "required";
  } else if (!isValidPractitionerPromoCode(normalizedCode)) {
    errors.code = "invalid";
  }

  if (!options?.discountLocked) {
    if (!discountValue) {
      errors.discountValue = "required";
    } else {
      const parsedDiscount = Number(discountValue);
      if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0) {
        errors.discountValue = "invalid";
      } else if (parsedDiscount > MAX_COUPON_PERCENT) {
        errors.discountValue = "tooHigh";
      }
    }
  }

  if (values.usageLimitTotal.trim() && usageLimitTotal === null) {
    errors.usageLimitTotal = "invalid";
  }

  if (values.usageLimitPerPatient.trim() && usageLimitPerPatient === null) {
    errors.usageLimitPerPatient = "invalid";
  }

  if (values.startsAt.trim() && startsAt === null) {
    errors.startsAt = "invalid";
  }

  if (values.endsAt.trim() && endsAt === null) {
    errors.endsAt = "invalid";
  }

  if (startsAt && endsAt) {
    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);
    if (endDate.getTime() <= startDate.getTime()) {
      errors.endsAt = "invalidRange";
    }
  }

  if (options?.discountLocked) {
    errors.discountValue = "locked";
  }

  return errors;
}

export function buildCreatePractitionerCouponRequest(
  values: PractitionerPromoCodeFormValues,
): CreatePractitionerCouponRequest {
  const code = sanitizePractitionerPromoCodeInput(values.code);
  const discountValue = normalizePercentageInput(values.discountValue).trim();
  const usageLimitTotal = parseOptionalPositiveInteger(values.usageLimitTotal);
  const usageLimitPerPatient = parseOptionalPositiveInteger(values.usageLimitPerPatient);
  const startsAt = parseOptionalDateValue(values.startsAt);
  const endsAt = parseOptionalDateValue(values.endsAt);

  const payload: CreatePractitionerCouponRequest = {
    code,
    discountType: "PERCENTAGE",
    discountValue,
    isActive: values.isActive,
  };

  if (usageLimitTotal !== undefined && usageLimitTotal !== null) {
    payload.usageLimitTotal = usageLimitTotal;
  }

  if (usageLimitPerPatient !== undefined && usageLimitPerPatient !== null) {
    payload.usageLimitPerPatient = usageLimitPerPatient;
  }

  if (startsAt) {
    payload.startsAt = startsAt;
  }

  if (endsAt) {
    payload.endsAt = endsAt;
  }

  return payload;
}

export function buildUpdatePractitionerCouponRequest(
  values: PractitionerPromoCodeFormValues,
  options?: {
    skipDiscountValue?: boolean;
  },
): UpdatePractitionerCouponRequest {
  const discountValue = normalizePercentageInput(values.discountValue).trim();
  const usageLimitTotal = parseOptionalPositiveInteger(values.usageLimitTotal);
  const usageLimitPerPatient = parseOptionalPositiveInteger(values.usageLimitPerPatient);
  const startsAt = parseOptionalDateValue(values.startsAt);
  const endsAt = parseOptionalDateValue(values.endsAt);

  const payload: UpdatePractitionerCouponRequest = {
    isActive: values.isActive,
  };

  if (discountValue && !options?.skipDiscountValue) {
    payload.discountValue = discountValue;
  }

  if (usageLimitTotal !== undefined && usageLimitTotal !== null) {
    payload.usageLimitTotal = usageLimitTotal;
  }

  if (usageLimitPerPatient !== undefined && usageLimitPerPatient !== null) {
    payload.usageLimitPerPatient = usageLimitPerPatient;
  }

  if (startsAt) {
    payload.startsAt = startsAt;
  }

  if (endsAt) {
    payload.endsAt = endsAt;
  }

  return payload;
}

export function classifyPractitionerPromoCodeError(
  message: string | null | undefined,
): PractitionerPromoCodeErrorKind | null {
  const normalized = message?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const entries: Array<[PractitionerPromoCodeErrorKind, string[]]> = [
    [
      "duplicateCode",
      [
        "already exists",
        "slug exists",
        "duplicate",
        "code exists",
        "coupon code already",
        "موجود بالفعل",
        "مسجل مسبقاً",
        "مسجل مسبقًا",
      ],
    ],
    [
      "invalidCode",
      [
        "invalid coupon",
        "coupon code invalid",
        "code invalid",
        "unsafe characters",
        "كود الخصم غير صحيح",
        "غير صالح",
      ],
    ],
    [
      "discountTooHigh",
      ["too high", "cannot exceed 25", "discount too high", "لا يمكن أن يتجاوز 25", "يتجاوز 25%"],
    ],
    [
      "percentageOnly",
      ["percentage only", "fixed amount not allowed", "نسبة مئوية فقط"],
    ],
    [
      "invalidDateRange",
      [
        "invalid date range",
        "end date",
        "before start",
        "date range",
        "نطاق تاريخ",
        "بعد تاريخ البداية",
      ],
    ],
    [
      "usageLimitBelowCurrentUsage",
      ["below current usage", "usage limit below", "أقل من عدد الاستخدامات"],
    ],
    [
      "notPractitioner",
      ["profile not found", "not a practitioner", "للحسابات المهنية"],
    ],
    ["notFound", ["not found", "coupon not found", "غير موجود", "تعذر العثور"]],
  ];

  for (const [kind, patterns] of entries) {
    if (patterns.some((pattern) => normalized.includes(pattern))) {
      return kind;
    }
  }

  return "generic";
}
