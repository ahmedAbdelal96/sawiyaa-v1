import type { AdminRefundPolicyType } from "../types/admin-refund-policies.types";

export function formatAdminRefundPolicyDate(value: string | null, locale: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function getAdminRefundPolicyTypeLabel(policyType: AdminRefundPolicyType) {
  return policyType === "SESSION" ? "session" : "package";
}

export function getAdminRefundPolicyTitle(policyType: AdminRefundPolicyType) {
  return policyType === "SESSION" ? "Session refund policy" : "Package refund policy";
}

export function normalizeAdminRefundPolicyType(value: string): AdminRefundPolicyType | null {
  if (value === "session" || value === "SESSION") return "SESSION";
  if (value === "package" || value === "PACKAGE") return "PACKAGE";
  return null;
}

export function getAdminRefundPolicyPath(policyType: AdminRefundPolicyType) {
  return policyType.toLowerCase();
}
