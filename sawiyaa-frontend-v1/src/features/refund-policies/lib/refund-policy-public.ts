import type { RefundPolicyType } from "../types/refund-policies.types";

export function formatRefundPolicyDate(value: string | null, locale: string) {
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

export function getRefundPolicyPath(policyType: RefundPolicyType) {
  return policyType.toLowerCase();
}

export function getRefundPolicyTitle(policyType: RefundPolicyType) {
  return policyType === "SESSION" ? "Session refund policy" : "Package refund policy";
}

export function normalizeRefundPolicyType(value: string): RefundPolicyType | null {
  const normalized = value.trim().toUpperCase();
  return normalized === "SESSION" || normalized === "PACKAGE"
    ? (normalized as RefundPolicyType)
    : null;
}
