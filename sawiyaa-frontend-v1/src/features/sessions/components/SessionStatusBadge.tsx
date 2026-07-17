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
  // The canonical status is the only lifecycle input. Missing status is
  // rendered conservatively rather than inferred from presentation fields.
  const displayStatus = status ?? "DRAFT";
  const tone = displayStatus === "IN_PROGRESS"
      ? "success"
      : displayStatus === "PENDING_PAYMENT" ||
          displayStatus === "PENDING_PRACTITIONER_CONFIRMATION" ||
          displayStatus === "AWAITING_COMPLETION_CONFIRMATION" ||
          displayStatus === "EXPIRED"
        ? "warning"
        : displayStatus === "CANCELLED" ||
            displayStatus === "PATIENT_NO_SHOW" ||
            displayStatus === "PRACTITIONER_NO_SHOW" ||
            displayStatus === "BOTH_NO_SHOW"
          ? "danger"
          : displayStatus === "UPCOMING" || displayStatus === "READY_TO_JOIN"
            ? "primary"
            : "neutral";

  const labelKey = `status.${displayStatus ?? "DRAFT"}`;

  return <AdminStatusBadge tone={tone}>{labelOverride ?? t(labelKey as Parameters<typeof t>[0])}</AdminStatusBadge>;
}
