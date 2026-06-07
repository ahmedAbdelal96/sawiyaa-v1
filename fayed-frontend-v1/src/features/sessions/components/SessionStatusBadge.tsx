import { useTranslations } from "next-intl";
import { AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import type { SessionPresentationStatus, SessionStatus } from "../types/sessions.types";

type Props = {
  status?: SessionStatus;
  presentationStatus?: SessionPresentationStatus;
  labelOverride?: string;
};

export default function SessionStatusBadge({
  status,
  presentationStatus,
  labelOverride,
}: Props) {
  const t = useTranslations("sessions");
  const displayStatus = presentationStatus ?? status;
  const tone = presentationStatus
    ? displayStatus === "JOINABLE" || displayStatus === "IN_PROGRESS"
      ? "success"
      : displayStatus === "UPCOMING" || displayStatus === "UNAVAILABLE"
        ? "warning"
      : displayStatus === "CANCELLED" || displayStatus === "ENDED"
          ? "danger"
          : "neutral"
    : status === "IN_PROGRESS"
      ? "success"
      : status === "PENDING_PAYMENT" ||
          status === "PENDING_PRACTITIONER_RESPONSE" ||
          status === "EXPIRED" ||
          status === "REFUND_PENDING"
        ? "warning"
        : status === "CANCELLED" || status === "NO_SHOW"
          ? "danger"
          : status === "CONFIRMED" || status === "UPCOMING"
            ? "primary"
            : "neutral";

  const labelKey = presentationStatus
    ? `presentationStatus.${displayStatus ?? "UNAVAILABLE"}`
    : `status.${displayStatus ?? "DRAFT"}`;

  return <AdminStatusBadge tone={tone}>{labelOverride ?? t(labelKey as Parameters<typeof t>[0])}</AdminStatusBadge>;
}
