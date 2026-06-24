import type { AdminRefundPolicyClause, AdminRefundPolicyType } from "../types/admin-refund-policies.types";

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

export function getAdminRefundPolicyPath(policyType: AdminRefundPolicyType) {
  return policyType.toLowerCase();
}

export function getClauseDisplayTitle(
  clause: AdminRefundPolicyClause,
  locale: "ar" | "en",
) {
  return locale === "ar" ? clause.titleAr || clause.titleEn || "" : clause.titleEn || clause.titleAr || "";
}
