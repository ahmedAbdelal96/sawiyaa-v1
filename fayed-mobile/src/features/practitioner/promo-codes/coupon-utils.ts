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

export function normalizePractitionerPromoCodeInput(value: string) {
  return value.trim().toUpperCase();
}

export function sanitizePractitionerPromoCodeInput(value: string) {
  return normalizePractitionerPromoCodeInput(value).replace(/[^A-Z0-9_-]/g, "");
}

export function normalizePercentageInput(value: string) {
  return value.replace(/[^0-9.]/g, "");
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
      } else if (parsedDiscount > 20) {
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
      ["too high", "cannot exceed 20", "discount too high", "لا يمكن أن يتجاوز 20", "يتجاوز 20%"],
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
