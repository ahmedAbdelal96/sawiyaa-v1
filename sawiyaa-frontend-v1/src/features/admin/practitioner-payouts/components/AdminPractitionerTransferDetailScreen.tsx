"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  RefreshCw,
  Sparkles,
  UserCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/button/Button";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import { cleanPersonName, formatPersonDisplayName, shortId } from "@/lib/person-name-cleaner";
import { useAdminPractitionerTransferDetail } from "../hooks/use-admin-practitioner-payouts";

export default function AdminPractitionerTransferDetailScreen({
  transferId,
}: {
  transferId: string;
}) {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");
  const [copiedRef, setCopiedRef] = useState(false);

  const transferQuery = useAdminPractitionerTransferDetail(transferId);
  const transfer = transferQuery.data;

  const practitionerName = transfer
    ? formatPersonDisplayName(
        transfer.practitionerDisplayName,
        transfer.practitionerId,
        isAr ? "الممارس" : "Practitioner"
      )
    : "-";

  const recorderName = transfer
    ? cleanPersonName(transfer.processedByDisplayName) ||
      (transfer.processedByDisplayName && !transfer.processedByDisplayName.includes("-")
        ? transfer.processedByDisplayName
        : isAr
        ? "المحاسب"
        : "Accountant")
    : "-";

  const copyRef = async () => {
    if (!transfer?.externalReference) return;
    await navigator.clipboard.writeText(transfer.externalReference);
    setCopiedRef(true);
    toast.success(isAr ? "تم نسخ مرجع التحويل" : "Transfer reference copied");
    setTimeout(() => setCopiedRef(false), 1600);
  };

  if (transferQuery.isLoading) {
    return (
      <div className="space-y-6">
        <ListStateSkeleton />
      </div>
    );
  }

  if (transferQuery.isError || !transfer) {
    return (
      <StateCard
        icon={<Sparkles className="h-6 w-6 text-primary" />}
        title={isAr ? "لم نتمكن من تحميل تفاصيل التحويل" : "Unable to load transfer details"}
        note={isAr ? "حدث خطأ أثناء جلب بيانات تحويل المستحقات. يرجى المحاولة مرة أخرى." : "An error occurred while fetching transfer record."}
        action={{
          label: isAr ? "إعادة المحاولة" : "Try again",
          onClick: () => transferQuery.refetch(),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/practitioner-payouts/history"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className={`h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
            {t("history.backToList")}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white sm:text-3xl">
              {isAr ? "تفاصيل تحويل المستحقات" : "Payout Transfer Details"}
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 me-1" />
              {transfer.status ? t(`statuses.${transfer.status}` as Parameters<typeof t>[0]) : (isAr ? "تم التحويل" : "Completed")}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {isAr ? "سجل التحويل الخارجي المعتمد لمستحقات الممارس" : "Approved external transfer record for practitioner"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => transferQuery.refetch()}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${transferQuery.isFetching ? "animate-spin" : ""}`} />
            {isAr ? "تحديث" : "Refresh"}
          </Button>
          <Link
            href={`/admin/practitioner-payouts/${transfer.practitionerId}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-white px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary/30 dark:bg-surface-secondary dark:text-white"
          >
            <Wallet className="h-3.5 w-3.5 text-primary" />
            {isAr ? "فتح رصيد الممارس" : "Practitioner Wallet"}
          </Link>
        </div>
      </div>

      {/* Hero Financial Amount Card */}
      <div className="rounded-[28px] border border-border-light bg-white p-6 shadow-theme-xs dark:border-white/8 dark:bg-surface-secondary">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {isAr ? "المبلغ المحول المعتمد" : "Total Transferred Amount"}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-text-primary dark:text-white sm:text-4xl">
                {formatSettlementMoney(locale, transfer.amountPaid, transfer.currency)}
              </span>
              <span className="rounded-md bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                {transfer.currency}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-border-light bg-surface-tertiary/40 px-4 py-2.5 text-xs dark:border-white/8">
              <span className="block text-[10px] text-text-muted">{isAr ? "طريقة التحويل" : "Transfer Method"}</span>
              <span className="font-bold text-text-primary dark:text-white">
                {t(`paymentMethods.${transfer.payoutMethod}` as Parameters<typeof t>[0])}
              </span>
            </div>

            {transfer.externalReference && (
              <div className="rounded-2xl border border-border-light bg-surface-tertiary/40 px-4 py-2.5 text-xs dark:border-white/8">
                <span className="block text-[10px] text-text-muted">{isAr ? "مرجع التحويل الخارجي" : "External Ref"}</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-primary" dir="ltr">
                  <span>{shortId(transfer.externalReference, 14, 4)}</span>
                  <button type="button" onClick={copyRef} className="hover:opacity-75">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Audit Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Details Breakdown */}
        <div className="app-panel space-y-6 rounded-[28px] p-6 lg:col-span-2">
          <h2 className="text-base font-bold text-text-primary dark:text-white border-b border-border-light pb-3 dark:border-white/8">
            {isAr ? "بيانات التحويل والمراجعة" : "Transfer Audit & Details"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border-light bg-surface-primary p-4 dark:border-white/8 dark:bg-white/[0.02]">
              <span className="text-xs text-text-muted block mb-1">{isAr ? "المستفيد (الممارس)" : "Beneficiary Practitioner"}</span>
              <Link
                href={`/admin/practitioner-payouts/${transfer.practitionerId}`}
                className="font-bold text-sm text-text-primary hover:text-primary transition-colors dark:text-white inline-flex items-center gap-1"
              >
                {practitionerName}
                <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
              </Link>
              <span className="block font-mono text-[10px] text-text-muted mt-1" dir="ltr">
                ID: {shortId(transfer.practitionerId, 12, 4)}
              </span>
            </div>

            <div className="rounded-2xl border border-border-light bg-surface-primary p-4 dark:border-white/8 dark:bg-white/[0.02]">
              <span className="text-xs text-text-muted block mb-1">{isAr ? "قام بتنفيذ التحويل" : "Executed By"}</span>
              <span className="font-bold text-sm text-text-primary dark:text-white">
                {recorderName}
              </span>
              <span className="block text-[10px] text-text-muted mt-1">
                {formatSettlementDateTime(locale, transfer.createdAt)}
              </span>
            </div>

            <div className="rounded-2xl border border-border-light bg-surface-primary p-4 dark:border-white/8 dark:bg-white/[0.02]">
              <span className="text-xs text-text-muted block mb-1">{isAr ? "تاريخ التحويل الفعلي" : "Actual Transfer Date"}</span>
              <span className="font-semibold text-sm text-text-primary dark:text-white">
                {formatSettlementDateTime(locale, transfer.payoutDate)}
              </span>
            </div>

            <div className="rounded-2xl border border-border-light bg-surface-primary p-4 dark:border-white/8 dark:bg-white/[0.02]">
              <span className="text-xs text-text-muted block mb-1">{isAr ? "مرجع التسوية المرتبطة" : "Linked Settlement"}</span>
              {transfer.settlementId ? (
                <Link
                  href={`/admin/settlements/${transfer.settlementId}`}
                  className="font-mono text-xs font-bold text-primary underline hover:opacity-80"
                  dir="ltr"
                >
                  {shortId(transfer.settlementId, 12, 4)}
                </Link>
              ) : (
                <span className="text-xs text-text-muted">—</span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 border-t border-border-light pt-4 dark:border-white/8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {t("history.detail.notesTitle")}
            </h3>
            <div className="rounded-2xl border border-border-light bg-surface-tertiary/20 p-4 text-xs leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.005]">
              {transfer.notes || (isAr ? "لا توجد ملاحظات إضافية مسجلة لهذه العملية." : "No additional notes recorded for this transfer.")}
            </div>
          </div>
        </div>

        {/* Right Column: Payment Proof Attachment */}
        <div className="app-panel space-y-4 rounded-[28px] p-6">
          <h2 className="text-base font-bold text-text-primary dark:text-white border-b border-border-light pb-3 dark:border-white/8">
            {isAr ? "إثبات الدفع المرفق" : "Payment Proof Attachment"}
          </h2>

          {transfer.proof ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-primary p-3 dark:border-white/8">
                <FileText className="h-6 w-6 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-primary dark:text-white truncate">
                    {transfer.proof.originalFileName || transfer.proof.fileName}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {transfer.proof.fileSizeBytes
                      ? `${(transfer.proof.fileSizeBytes / 1024).toFixed(1)} KB`
                      : ""}
                  </p>
                </div>
                <a
                  href={transfer.proof.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover shadow-sm"
                >
                  {isAr ? "تحميل" : "Download"}
                </a>
              </div>

              {transfer.proof.mimeType?.startsWith("image/") && (
                <div className="overflow-hidden rounded-2xl border border-border-light bg-white dark:bg-slate-900 p-2">
                  <img
                    src={transfer.proof.downloadUrl}
                    alt="Payment Proof"
                    className="w-full max-h-72 object-contain rounded-xl hover:scale-105 transition-transform duration-200"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border-light bg-surface-tertiary/10 p-6 text-center text-xs text-text-muted dark:border-white/8">
              {isAr ? "لا يوجد ملف إثبات دفع مرفق مع هذا التحويل." : "No payment proof attachment was uploaded."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
