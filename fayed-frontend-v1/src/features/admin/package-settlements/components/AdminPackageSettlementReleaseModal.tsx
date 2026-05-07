"use client";

import { useLocale, useTranslations } from "next-intl";
import { ConfirmModal } from "@/components/ui/modal";
import { formatSettlementMoney } from "@/features/admin/settlements/lib/settlement-formatters";
import type { AdminPackageSettlementDetail } from "../types/admin-package-settlements.types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  settlement: AdminPackageSettlementDetail | null;
  loading?: boolean;
  onConfirm: () => void;
};

function ReleaseInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-border-light bg-surface-secondary/70 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className="text-right text-sm font-semibold text-text-primary dark:text-white/95">
        {value}
      </span>
    </div>
  );
}

export default function AdminPackageSettlementReleaseModal({
  isOpen,
  onClose,
  settlement,
  loading = false,
  onConfirm,
}: Props) {
  const t = useTranslations("admin-package-settlements");
  const locale = useLocale();

  if (!settlement) {
    return null;
  }

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={t("modal.title")}
      description={t("modal.description")}
      eyebrow={t("modal.eyebrow")}
      confirmLabel={t("modal.confirm")}
      cancelLabel={t("modal.cancel")}
      confirmVariant="primary"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-[22px] border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-text-secondary dark:border-primary/20 dark:bg-primary/10 dark:text-primary-light">
          {t("modal.note")}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ReleaseInfoRow
            label={t("modal.fields.practitioner")}
            value={settlement.practitionerDisplayName ?? settlement.practitionerSlug ?? settlement.practitionerId}
          />
          <ReleaseInfoRow
            label={t("modal.fields.amount")}
            value={formatSettlementMoney(
              locale,
              settlement.releasablePractitionerAmount,
              settlement.currency,
            )}
          />
          <ReleaseInfoRow label={t("modal.fields.currency")} value={settlement.currency} />
          <ReleaseInfoRow
            label={t("modal.fields.sessions")}
            value={t("modal.fields.sessionsValue", {
              completed: settlement.completedSessionsCount,
              total: settlement.sessionCount,
            })}
          />
        </div>
      </div>
    </ConfirmModal>
  );
}
