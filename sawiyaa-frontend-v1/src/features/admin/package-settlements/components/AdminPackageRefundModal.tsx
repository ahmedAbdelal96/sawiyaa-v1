"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ConfirmModal } from "@/components/ui/modal";
import { formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import type { PackageRefundPreview } from "../types/admin-package-settlements.types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  preview: PackageRefundPreview | null;
  loading?: boolean;
  onConfirm: (input: { finalAmount?: number; reason: string; evidenceReference?: string }) => void;
};

export default function AdminPackageRefundModal({
  isOpen,
  onClose,
  preview,
  loading = false,
  onConfirm,
}: Props) {
  const t = useTranslations("admin-package-settlements");
  const locale = useLocale();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmount(preview?.suggestedRefundAmount ?? "");
      setReason("");
      setEvidenceReference("");
    }
  }, [isOpen, preview?.suggestedRefundAmount]);

  if (!preview) return null;
  const submit = () => {
    const parsed = amount.trim() === "" ? undefined : Number(amount);
    if ((parsed !== undefined && !Number.isFinite(parsed)) || !reason.trim()) return;
    onConfirm({ finalAmount: parsed, reason: reason.trim(), evidenceReference: evidenceReference.trim() || undefined });
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={t("refund.title")}
      description={t("refund.description")}
      eyebrow={t("refund.eyebrow")}
      confirmLabel={t("refund.confirm")}
      cancelLabel={t("refund.cancel")}
      loading={loading}
      onConfirm={submit}
      onCancel={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
          {preview.manualReviewRequired ? t("refund.manualReview") : t("refund.calculation")}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label={t("refund.fields.packagePaid")} value={formatSettlementMoney(locale, preview.packageNetPaid, preview.currency)} />
          <Info label={t("refund.fields.used")} value={String(preview.usedSessions)} />
          <Info label={t("refund.fields.usedValue")} value={preview.usedStandaloneValue ? formatSettlementMoney(locale, preview.usedStandaloneValue, preview.currency) : "—"} />
          <Info label={t("refund.fields.suggested")} value={preview.suggestedRefundAmount ? formatSettlementMoney(locale, preview.suggestedRefundAmount, preview.currency) : t("refund.manualAmount")} />
          <Info label={t("refund.fields.maximum")} value={formatSettlementMoney(locale, preview.maxFinalRefundAmount, preview.currency)} />
          <Info label={t("refund.fields.future")} value={String(preview.futureSessionsAffected)} />
        </div>
        <label className="block text-sm font-medium text-text-secondary">
          {t("refund.fields.finalAmount")}
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="mt-2 w-full rounded-2xl border border-border-light bg-transparent px-4 py-3 text-sm text-text-primary outline-none focus:border-primary dark:border-white/10 dark:text-white" placeholder={preview.suggestedRefundAmount ?? "0.00"} />
        </label>
        {preview.manualReviewRequired ? (
          <label className="block text-sm font-medium text-text-secondary">
            {t("refund.fields.evidence")}
            <input value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} className="mt-2 w-full rounded-2xl border border-border-light bg-transparent px-4 py-3 text-sm text-text-primary outline-none focus:border-primary dark:border-white/10 dark:text-white" />
          </label>
        ) : null}
        <label className="block text-sm font-medium text-text-secondary">
          {t("refund.fields.reason")}
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-border-light bg-transparent px-4 py-3 text-sm text-text-primary outline-none focus:border-primary dark:border-white/10 dark:text-white" />
        </label>
      </div>
    </ConfirmModal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 rounded-[18px] border border-border-light bg-surface-secondary/70 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]"><span className="text-xs font-medium text-text-muted">{label}</span><span className="text-right text-sm font-semibold text-text-primary dark:text-white/95">{value}</span></div>;
}
