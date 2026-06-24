const COUPON_ERROR_PATTERNS = [
  {
    key: "invalid",
    patterns: [
      "invalid coupon",
      "invalid promo",
      "promo code invalid",
      "coupon invalid",
      "is invalid",
      "invalid code",
      "coupon not found",
      "not found",
      "غير صحيح",
      "كود الخصم غير صحيح",
      "رمز الخصم غير صحيح",
    ],
  },
  {
    key: "expired",
    patterns: [
      "expired",
      "expiration",
      "انتهت صلاحية",
      "منتهية الصلاحية",
      "انتهت الصلاحية",
    ],
  },
  {
    key: "inactive",
    patterns: [
      "inactive",
      "disabled",
      "not currently available",
      "not active",
      "غير متاح",
      "غير مفعّل",
      "غير مفعلة",
    ],
  },
  {
    key: "pendingApproval",
    patterns: [
      "pending approval",
      "awaiting approval",
      "approval pending",
      "not active yet",
      "لم يتم تفعيله بعد",
      "بانتظار المراجعة",
    ],
  },
  {
    key: "notApplicable",
    patterns: [
      "not applicable",
      "does not apply",
      "don't apply",
      "doesn't apply",
      "another practitioner",
      "session only",
      "لا ينطبق",
      "لا يمكن استخدام",
    ],
  },
  {
    key: "totalLimit",
    patterns: [
      "usage limit",
      "total limit",
      "limit reached",
      "reached its usage limit",
      "maximum uses",
      "عدد مرات الاستخدام",
    ],
  },
  {
    key: "patientLimit",
    patterns: [
      "per-patient",
      "per patient",
      "patient limit",
      "already used by this patient",
      "لقد استخدمت هذا الكود",
    ],
  },
  {
    key: "alreadyUsed",
    patterns: [
      "already used",
      "already redeemed",
      "duplicate redemption",
      "already applied",
      "سبق استخدامه",
    ],
  },
] as const;

// Backend error code mapping for coupon validation
const BACKEND_ERROR_CODE_MAP: Record<string, CouponErrorKind> = {
  FINANCIAL_RULE_COUPON_NOT_FOUND: "invalid",
  FINANCIAL_RULE_INVALID_COUPON_SHARE_SPLIT: "invalid",
  FINANCIAL_RULE_COUPON_CODE_EXISTS: "invalid",
  FINANCIAL_RULE_COUPON_SLUG_EXISTS: "invalid",
  FINANCIAL_RULE_COUPON_NOT_ACTIVE: "inactive",
  FINANCIAL_RULE_COUPON_APPROVAL_REQUIRED: "pendingApproval",
  FINANCIAL_RULE_COUPON_NOT_STARTED: "inactive",
  FINANCIAL_RULE_COUPON_EXPIRED: "expired",
  FINANCIAL_RULE_COUPON_USAGE_LIMIT_REACHED: "totalLimit",
  FINANCIAL_RULE_COUPON_PER_PATIENT_LIMIT_REACHED: "patientLimit",
  FINANCIAL_RULE_COUPON_SCOPE_UNSUPPORTED: "notApplicable",
  FINANCIAL_RULE_COUPON_NOT_APPLICABLE: "notApplicable",
  FINANCIAL_RULE_INVALID_DATE_RANGE: "invalid",
  FINANCIAL_RULE_SESSION_NOT_FOUND: "notApplicable",
};

export type CouponErrorKind =
  | "invalid"
  | "expired"
  | "inactive"
  | "pendingApproval"
  | "notApplicable"
  | "totalLimit"
  | "patientLimit"
  | "alreadyUsed";

export function normalizePromoCodeInput(value: string) {
  return value.trim().toUpperCase();
}

/**
 * Classify coupon error from backend error code.
 * Prefers machine-readable error codes over message text for reliability.
 */
export function classifyCouponError(
  message: string | null | undefined,
  errorCode?: string | null,
): CouponErrorKind | null {
  // Prefer backend error code if available
  if (errorCode && errorCode in BACKEND_ERROR_CODE_MAP) {
    return BACKEND_ERROR_CODE_MAP[errorCode];
  }

  // Fallback to legacy text pattern matching for backward compatibility
  const normalized = message?.trim().toLowerCase();
  if (!normalized) return null;

  for (const entry of COUPON_ERROR_PATTERNS) {
    if (
      entry.patterns.some((pattern) =>
        normalized.includes(pattern.toLowerCase()),
      )
    ) {
      return entry.key;
    }
  }

  return null;
}
