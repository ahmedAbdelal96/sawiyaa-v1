import { useTranslations } from "next-intl";
import { AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import type { SessionStatus } from "../types/sessions.types";

type Props = {
  status: SessionStatus;
  labelOverride?: string;
};

export default function SessionStatusBadge({ status, labelOverride }: Props) {
  const t = useTranslations("sessions");
  const tone =
    status === "READY_TO_JOIN" || status === "IN_PROGRESS"
      ? "success"
      : status === "PENDING_PAYMENT" || status === "PENDING_PRACTITIONER_RESPONSE" || status === "EXPIRED" || status === "REFUND_PENDING"
        ? "warning"
        : status === "CANCELLED" || status === "NO_SHOW"
          ? "danger"
          : status === "CONFIRMED" || status === "UPCOMING"
            ? "primary"
            : "neutral";

  return (
    <AdminStatusBadge tone={tone}>
      {labelOverride ?? t(`status.${status}` as Parameters<typeof t>[0])}
    </AdminStatusBadge>
  );
}
