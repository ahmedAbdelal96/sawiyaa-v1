"use client";

import { useLocale, useTranslations } from "next-intl";
import { Drawer, ModalBody, ModalHeader } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/settlements/lib/settlement-formatters";
import type { AdminPractitionerManualPayout } from "../types/admin-practitioner-payouts.types";

type PayoutHistoryDetailDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  payout: AdminPractitionerManualPayout | null;
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/95">{value}</p>
    </div>
  );
}

export default function AdminPractitionerPayoutHistoryDetailDrawer({
  isOpen,
  onClose,
  payout,
}: PayoutHistoryDetailDrawerProps) {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();

  const practitionerLabel =
    payout?.practitionerName ?? payout?.practitionerId ?? t("history.detail.unknownPractitioner");

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side={locale === "ar" ? "left" : "right"}
      ariaLabel={t("history.detail.title")}
      className="w-[420px] sm:w-[560px]"
      inset
      showHandle={false}
    >
      <div className="flex h-full flex-col">
        <ModalHeader
          eyebrow={t("history.detail.eyebrow")}
          title={t("history.detail.title")}
          description={t("history.detail.description")}
        >
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-text-primary dark:text-white/95">
                {practitionerLabel}
              </p>
              <p className="mt-1 truncate text-xs text-text-muted">
                {payout?.practitionerId ?? "-"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              {t("history.detail.close")}
            </Button>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-5">
          {!payout ? null : (
            <>
              <section className="grid gap-3 sm:grid-cols-2">
                <DetailRow
                  label={t("history.detail.fields.amount")}
                  value={formatSettlementMoney(locale, payout.amountPaid, payout.currencyCode)}
                />
                <DetailRow
                  label={t("history.detail.fields.currency")}
                  value={t(`currencies.${payout.currencyCode}` as Parameters<typeof t>[0])}
                />
                <DetailRow
                  label={t("history.detail.fields.paidAt")}
                  value={formatSettlementDateTime(locale, payout.paidAt)}
                />
                <DetailRow
                  label={t("history.detail.fields.paymentMethod")}
                  value={t(`paymentMethods.${payout.payoutMethod}` as Parameters<typeof t>[0])}
                />
                <DetailRow
                  label={t("history.detail.fields.reference")}
                  value={payout.transferReference ?? "-"}
                />
                <DetailRow
                  label={t("history.detail.fields.recordedBy")}
                  value={payout.recordedByDisplayName ?? payout.recordedByUserId ?? "-"}
                />
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {t("history.detail.notesTitle")}
                </h3>
                <div className="rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-4 text-sm leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
                  {payout.notes ?? t("history.detail.noNotes")}
                </div>
              </section>
            </>
          )}
        </ModalBody>
      </div>
    </Drawer>
  );
}
