import { formatViewerDateTime } from "@/lib/time-formatting";

export function formatDateTime(value: string | null | undefined, locale: string) {
  return formatViewerDateTime(value, { locale: locale === "ar" ? "ar-SA" : "en-US", fallbackText: "-" });
}

export function mapCareStatus(status: string, locale: string) {
  if (locale.startsWith("ar")) {
    if (status === "PENDING") return "قيد الانتظار";
    if (status === "APPROVED") return "مقبول";
    if (status === "REJECTED") return "مرفوض";
    if (status === "EXPIRED") return "منتهي";
    if (status === "REVOKED") return "ملغى";
    return "ملغى";
  }

  if (status === "PENDING") return "Pending";
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  if (status === "EXPIRED") return "Expired";
  if (status === "REVOKED") return "Revoked";
  return "Cancelled";
}
