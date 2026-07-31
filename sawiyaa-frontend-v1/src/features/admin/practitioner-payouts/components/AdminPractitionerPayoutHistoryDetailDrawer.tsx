"use client";

import { useLocale, useTranslations } from "next-intl";
import { Drawer, ModalBody, ModalHeader } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { Link } from "@/i18n/navigation";
import { formatAdminMoneyForLocale as formatMoney } from "@/features/admin/finance/lib/finance-formatters";
import { formatSettlementDateTime } from "@/features/admin/finance/lib/finance-formatters";
import type { AdminPractitionerManualPayout } from "../types/admin-practitioner-payouts.types";
import type { AdminPractitionerTransferProof } from "../api/admin-practitioner-transfers.api";
import { ExternalLink, FileText, CheckCircle2, AlertCircle } from "lucide-react";

type PayoutHistoryDetailDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  payout:
    | (AdminPractitionerManualPayout & {
        settlementId?: string | null;
        proof?: AdminPractitionerTransferProof | null;
        status?: string | null;
      })
    | null;
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text-primary dark:text-white/95">{value}</span>
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

  const formatRecordedAmount = (
    amount: string | null | undefined,
    currency: string | null | undefined,
  ) => {
    if (!amount || !currency) {
      return t("unavailable");
    }

    return formatMoney(locale, amount, currency);
  };

  const currencyLabel = payout?.currencyCode
    ? t(`currencies.${payout.currencyCode}` as Parameters<typeof t>[0])
    : t("unavailable");

  const practitionerLabel =
    payout?.practitionerName ?? payout?.practitionerId ?? t("history.detail.unknownPractitioner");

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side={locale === "ar" ? "left" : "right"}
      ariaLabel={t("history.detail.title")}
      className="w-[450px] sm:w-[600px]"
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
            <div className="min-w-0 space-y-1">
              <p className="truncate text-base font-semibold text-text-primary dark:text-white/95">
                {practitionerLabel}
              </p>
              <p className="truncate font-mono text-[10px] text-text-muted">
                {payout?.practitionerId ?? "-"}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {payout?.status ? (
                <span className="inline-flex items-center rounded-full bg-success-light/20 px-3 py-1 text-xs font-semibold text-success dark:bg-success/10 border border-success/15">
                  {t(`statuses.${payout.status}` as Parameters<typeof t>[0])}
                </span>
              ) : null}
              <Button variant="outline" size="sm" onClick={onClose}>
                {t("history.detail.close")}
              </Button>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-6">
          {!payout ? null : (
            <>
              {/* Summary card header replacing box-heavy header */}
              <div className="rounded-[24px] border border-border-light bg-surface-secondary/40 p-5 dark:border-white/8 dark:bg-white/[0.005]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {locale === "ar" ? "ملخص التحويل" : "Transfer Summary"}
                  </span>
                  
                  {payout.settlementId ? (
                    <Link
                      href={`/admin/settlements/${payout.settlementId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {locale === "ar" ? "فتح صفحة التسوية" : "Open Settlement"}
                    </Link>
                  ) : null}
                </div>

                <div className="space-y-1 border-t border-border-light pt-2 dark:border-white/8">
                  <DetailRow
                    label={t("history.detail.fields.amount")}
                    value={formatRecordedAmount(payout.amountPaid, payout.currencyCode)}
                  />
                  <DetailRow
                    label={t("history.detail.fields.currency")}
                    value={currencyLabel}
                  />
                  <DetailRow
                    label={t("history.detail.fields.paidAt")}
                    value={formatSettlementDateTime(locale, payout.paidAt)}
                  />
                  <DetailRow
                    label={t("history.detail.fields.recordedAt")}
                    value={formatSettlementDateTime(locale, payout.createdAt)}
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
                </div>
              </div>

              {/* Notes block */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {t("history.detail.notesTitle")}
                </h3>
                <div className="rounded-2xl border border-border-light bg-surface-secondary/25 px-4 py-3.5 text-sm leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.005]">
                  {payout.notes ?? t("history.detail.noNotes")}
                </div>
              </section>

              {/* Payment Proof Viewer */}
              {payout.proof ? (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {locale === "ar" ? "إثبات الدفع المرفق" : "Attached Payment Proof"}
                  </h3>
                  <div className="rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:border-white/8 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary dark:text-white/90 truncate">
                            {payout.proof.originalFileName ?? payout.proof.fileName}
                          </p>
                          <p className="text-xs text-text-muted">
                            {payout.proof.fileSizeBytes
                              ? `${(payout.proof.fileSizeBytes / 1024).toFixed(1)} KB`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <a
                        href={payout.proof.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover shadow-sm"
                      >
                        {locale === "ar" ? "تحميل الإثبات" : "Download Proof"}
                      </a>
                    </div>

                    {payout.proof.mimeType?.startsWith("image/") && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-border-light bg-white dark:bg-slate-900">
                        <img
                          src={payout.proof.downloadUrl}
                          alt="Payment Proof"
                          className="w-full max-h-60 object-contain hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {locale === "ar" ? "إثبات الدفع المرفق" : "Attached Payment Proof"}
                  </h3>
                  <div className="rounded-2xl border border-dashed border-border-light bg-surface-secondary/10 p-5 text-center text-sm text-text-muted dark:border-white/8">
                    {locale === "ar" ? "لا يوجد ملف إثبات دفع مرفق." : "No payment proof attachment exists."}
                  </div>
                </section>
              )}
            </>
          )}
        </ModalBody>
      </div>
    </Drawer>
  );
}
