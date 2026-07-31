import { useTranslations } from "next-intl";
import type { SettlementStatus } from "../types/admin-settlements.types";
import { SETTLEMENT_STATUS_STYLES } from "../lib/settlement-status";
export default function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  const t = useTranslations("admin-settlements");
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${SETTLEMENT_STATUS_STYLES[status] ?? "bg-surface-tertiary text-text-secondary"}`}>{t(`statuses.${status}` as Parameters<typeof t>[0])}</span>;
}
