"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft, CheckCircle2, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import FinancialPageHeader from "@/components/shared/admin/FinancialPageHeader";
import Button from "@/components/ui/button/Button";
import { ConfirmModal, FormModal } from "@/components/ui/modal";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { PermissionKey } from "@/lib/auth/permissions";
import { toAppError } from "@/lib/api/errors";
import { useAddAdminSettlementAdjustment, useAdminSettlement, useApproveAdminSettlement, usePayoutAdminSettlement, useRejectAdminSettlement } from "../hooks/use-admin-settlements";
import type { RecordPractitionerPayoutRequest, SettlementAdjustmentType } from "../types/admin-settlements.types";
import SettlementStatusBadge from "./SettlementStatusBadge";
import AdminSessionReference from "@/components/shared/admin/AdminSessionReference";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-light/40 py-1.5 last:border-0 dark:border-white/5">
      <span className="text-[11px] text-text-muted uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-text-primary dark:text-white/95">{value}</span>
    </div>
  );
}

const AUDIT_LABELS: Record<string, { ar: string; en: string }> = {
  SETTLEMENT_CREATED: { ar: "تم إنشاء التسوية", en: "Settlement Created" },
  SETTLEMENT_APPROVED: { ar: "تم اعتماد مستحق المختص", en: "Practitioner Amount Approved" },
  SETTLEMENT_CREDITED: { ar: "تمت إضافة المبلغ إلى المحفظة", en: "Amount Credited to Wallet" },
  SETTLEMENT_PAYOUT_EXECUTED: { ar: "تم تسجيل التحويل الخارجي", en: "External Transfer Recorded" },
  SETTLEMENT_REJECTED: { ar: "تم رفض التسوية", en: "Settlement Rejected" },
};
function auditLabel(action: string, locale: string) { return AUDIT_LABELS[action]?.[locale === "ar" ? "ar" : "en"] ?? action; }

export default function AdminSettlementDetailScreen({ id }: { id: string }) {
  const t = useTranslations("admin-settlements");
  const locale = useLocale();
  const router = useRouter();
  const query = useAdminSettlement(id);
  const item = query.data?.item;
  const permissionQuery = useCurrentUserPermissions(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [type, setType] = useState<SettlementAdjustmentType>("PLATFORM_FEE");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [approveRate, setApproveRate] = useState("");
  const [approvedCredit, setApprovedCredit] = useState("");
  const [creditOverrideReason, setCreditOverrideReason] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<RecordPractitionerPayoutRequest["payoutMethod"]>("MANUAL_BANK_TRANSFER");
  const [transferFee, setTransferFee] = useState("0");
  const [feeBearer, setFeeBearer] = useState<"PLATFORM_EXPENSE" | "DEDUCT_FROM_PRACTITIONER">("PLATFORM_EXPENSE");
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutDate, setPayoutDate] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const adjustmentMutation = useAddAdminSettlementAdjustment();
  const approveMutation = useApproveAdminSettlement();
  const rejectMutation = useRejectAdminSettlement();
  const payoutMutation = usePayoutAdminSettlement();

  if (query.isLoading) return <SurfaceCard variant="section"><div className="h-64 animate-pulse rounded-2xl bg-surface-tertiary" /></SurfaceCard>;
  if (query.isError || !item) return <SurfaceCard variant="section"><p className="text-text-secondary">{t("states.error")}</p><Button className="mt-4" variant="outline" onClick={() => query.refetch()}>{t("actions.retry")}</Button></SurfaceCard>;

  const financial = item.financial;
  const permissions = permissionQuery.data?.permissions ?? [];
  const isCrossCurrency = financial.originalCurrency !== financial.walletCurrency;
  const walletCurrency = item.walletCurrencyCode;
  const currencyIntegrityBroken = walletCurrency.trim().toUpperCase() !== financial.walletCurrency.trim().toUpperCase() || item.payoutRecords.some((payout) => [payout.currency, payout.payoutCurrency, payout.transferFeeCurrency].filter(Boolean).some((currency) => currency!.trim().toUpperCase() !== walletCurrency.trim().toUpperCase()));
  const canAdjust = !currencyIntegrityBroken && permissions.includes(PermissionKey.FINANCIAL_SETTLEMENT_ADJUST) && item.status === "UNDER_REVIEW";
  const canApprove = !currencyIntegrityBroken && permissions.includes(PermissionKey.FINANCIAL_SETTLEMENT_APPROVE) && item.status === "UNDER_REVIEW";
  const canReject = !currencyIntegrityBroken && permissions.includes(PermissionKey.FINANCIAL_SETTLEMENT_REVIEW) && item.status === "UNDER_REVIEW";
  const canPayout = !currencyIntegrityBroken && permissions.includes(PermissionKey.FINANCIAL_PAYOUT_EXECUTE) && item.status === "CREDITED";
  const remainingPayout = canPayout ? Math.max(0, Number(item.finalWalletCredit ?? 0) - Number(item.amountPaidTotal ?? 0)) : 0;
  const calculatedCredit = (() => {
    const entitlement = Number(financial.grossPractitionerAmount ?? 0);
    const adjustments = Number(financial.adjustmentsTotal ?? 0);
    const rate = Number(approveRate);
    if (!isCrossCurrency) return (entitlement - adjustments).toFixed(2);
    if (!Number.isFinite(rate) || rate <= 0) return "";
    const converted = financial.originalCurrency === "USD" ? entitlement * rate : entitlement / rate;
    return (converted - adjustments).toFixed(2);
  })();
  const effectiveCredit = approvedCredit || calculatedCredit;
  const creditDifference = effectiveCredit && calculatedCredit ? (Number(effectiveCredit) - Number(calculatedCredit)).toFixed(2) : "0.00";
  const materialCreditDifference = Math.abs(Number(creditDifference)) > 0.01;
  const fee = Math.max(0, Number(transferFee) || 0);
  const netReceived = feeBearer === "DEDUCT_FROM_PRACTITIONER" ? Math.max(0, remainingPayout - fee) : remainingPayout;
  const platformOutflow = feeBearer === "PLATFORM_EXPENSE" ? remainingPayout + fee : remainingPayout;
  const approvalSubmitLabel = t("actions.confirmApproveWithCurrency", { amount: formatSettlementMoney(locale, effectiveCredit || "0", walletCurrency) });
  const handleFinancialActionError = async (error: unknown) => {
    await query.refetch();
    const code = toAppError(error).code;
    const integrityCodes = ["PRACTITIONER_WALLET_CURRENCY_MISMATCH", "LED_GER_WALLET_CURRENCY_MISMATCH", "PAYOUT_WALLET_CURRENCY_MISMATCH"];
    toast.error(integrityCodes.includes(code ?? "") ? t("integrity.walletCurrencyMismatch") : t("states.actionError"));
  };

  const submitAdjustment = async () => { if (!canAdjust || !amount || !reason.trim()) return; try { await adjustmentMutation.mutateAsync({ id, payload: { type, amount, reason } }); setAdjustOpen(false); setAmount(""); setReason(""); toast.success(t("feedback.adjustmentAdded")); } catch (error) { await handleFinancialActionError(error); } };
  const approve = async () => { if (!canApprove || (isCrossCurrency && !approveRate.trim()) || !effectiveCredit || (materialCreditDifference && !creditOverrideReason.trim())) return; try { await approveMutation.mutateAsync({ id, payload: { ...(isCrossCurrency ? { exchangeRate: approveRate.trim() } : {}), approvedWalletCreditAmount: effectiveCredit, walletCreditOverrideReason: materialCreditDifference ? creditOverrideReason.trim() : undefined } }); setApproveOpen(false); toast.success(t("feedback.approved")); } catch (error) { await handleFinancialActionError(error); } };
  const reject = async () => { if (!canReject || !reason.trim()) return; try { await rejectMutation.mutateAsync({ id, payload: reason }); setRejectOpen(false); setReason(""); toast.success(t("feedback.rejected")); } catch (error) { await handleFinancialActionError(error); } };
  const recordTransfer = async () => { if (!canPayout || !remainingPayout || !payoutReference.trim() || !payoutDate || fee < 0 || (fee > 0 && !feeBearer)) return; try { await payoutMutation.mutateAsync({ id, payload: { settlementId: id, amountPaid: remainingPayout.toFixed(2), payoutMethod, payoutDate, transferredAt: new Date(payoutDate).toISOString(), externalReference: payoutReference.trim(), notes: payoutNotes.trim() || undefined, transferFeeAmount: fee.toFixed(2), transferFeeTreatment: fee > 0 ? feeBearer : undefined } }); setPayoutOpen(false); setPayoutReference(""); setPayoutDate(""); setPayoutNotes(""); setTransferFee("0"); toast.success(t("feedback.transferRecorded")); } catch (error) { await handleFinancialActionError(error); } };

  return <div className="space-y-4">
    <FinancialPageHeader eyebrow={t("detail.eyebrow")} title={t("detail.title")} description={item.practitioner.name ?? "-"} actions={<div className="flex flex-wrap gap-2"><SettlementStatusBadge status={item.status} />{canPayout && remainingPayout > 0 ? <Button size="sm" onClick={() => { setTransferFee("0"); setPayoutOpen(true); }}>{t("actions.recordTransfer")}</Button> : null}<Button variant="outline" size="sm" startIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push("/admin/settlements")}>{t("actions.back")}</Button></div>} />
    {currencyIntegrityBroken ? <SurfaceCard variant="section" className="border-red-200 bg-red-50"><p className="text-sm leading-6 text-red-900">{t("integrity.walletCurrencyMismatch")}</p><Button className="mt-3" variant="outline" size="sm" onClick={() => query.refetch()}>{t("integrity.refresh")}</Button></SurfaceCard> : null}
    
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Column 1: Session Details */}
      <SurfaceCard variant="section" className="flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-bold text-text-primary dark:text-white/95 border-b border-border-light/60 pb-2 mb-3">
            {t("detail.session")}
          </h2>
          <div className="space-y-1">
            <Row label={t("fields.patient")} value={item.patient?.displayName ?? item.session?.patientName ?? "-"} />
            <Row label={t("fields.practitioner")} value={item.practitioner.name ?? "-"} />
            <div className="flex items-center justify-between gap-4 border-b border-border-light/40 py-1.5 text-xs last:border-0 dark:border-white/5">
              <span className="text-[11px] text-text-muted uppercase tracking-wider">{t("fields.sessionId")}</span>
              <AdminSessionReference sessionId={item.session?.id} sessionCode={item.session?.sessionCode} href={item.session?.id ? `/admin/sessions/runtime-inspection?sessionId=${item.session.id}` : undefined} variant="detail" copyable />
            </div>
            <Row label={t("fields.sessionDate")} value={item.session?.date ? formatSettlementDateTime(locale, item.session.date) : "-"} />
            <Row label={t("fields.sessionStatus")} value={item.session?.status ?? "-"} />
            <Row label={t("fields.sessionType")} value={item.session?.type ?? "-"} />
          </div>
        </div>
      </SurfaceCard>

      {/* Column 2: Financial calculations */}
      <SurfaceCard variant="section" className="flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-bold text-text-primary dark:text-white/95 border-b border-border-light/60 pb-2 mb-3">
            {t("detail.financial")}
          </h2>
          <div className="space-y-1">
            <Row label={t("fields.originalPayment")} value={formatSettlementMoney(locale, financial.originalAmount ?? "0", financial.originalCurrency)} />
            <Row label={t("fields.gross")} value={formatSettlementMoney(locale, financial.grossPractitionerAmount ?? "0", financial.originalCurrency)} />
            <Row label={t("fields.adjustments")} value={formatSettlementMoney(locale, financial.adjustmentsTotal ?? "0", walletCurrency)} />
            
            <div className="flex items-center justify-between gap-4 bg-primary/5 rounded-xl px-3 py-2.5 mt-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">{t("fields.finalCredit")}</span>
              <span className="text-sm font-extrabold text-primary tabular-nums">
                {formatSettlementMoney(locale, financial.finalWalletCredit ?? "0", walletCurrency)}
              </span>
            </div>
          </div>
        </div>

        {isCrossCurrency ? (
          <div className="mt-2.5 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2">
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">{t("detail.conversion")}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="block text-[10px] text-text-muted">{t("fields.exchangeRate")}</span>
                <span className="font-semibold text-text-primary dark:text-white/90">
                  {financial.exchangeRate && financial.exchangeRate !== "1" ? financial.exchangeRate : t("modals.notApplied")}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-text-muted">{t("fields.converted")}</span>
                <span className="font-semibold text-text-primary dark:text-white/90">
                  {formatSettlementMoney(locale, financial.convertedAmount ?? "0", walletCurrency)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </SurfaceCard>

      {/* Column 3: Decisions & Actions */}
      <SurfaceCard variant="section" className="flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-bold text-text-primary dark:text-white/95 border-b border-border-light/60 pb-2 mb-3">
            {t("detail.decision")}
          </h2>
          
          <div className="mb-4">
            <span className="text-xs text-text-muted block mb-1.5">{t("table.status")}</span>
            <SettlementStatusBadge status={item.status} />
          </div>

          {canApprove || canReject ? (
            <div className="grid gap-2">
              {canApprove ? (
                <Button size="sm" startIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => { setApproveRate(""); setApprovedCredit(""); setCreditOverrideReason(""); setApproveOpen(true); }}>{t("actions.approve")}</Button>
              ) : null}
              {canReject ? (
                <Button size="sm" variant="outline" startIcon={<XCircle className="h-4 w-4" />} onClick={() => setRejectOpen(true)}>{t("actions.reject")}</Button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl bg-surface-tertiary p-2.5 text-xs text-text-secondary leading-relaxed">
              {t("detail.readOnly")}
            </div>
          )}
        </div>

        {canAdjust ? (
          <div className="mt-4 pt-3 border-t border-border-light/60 flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">{t("detail.adjustments")}</span>
            <Button size="sm" variant="outline" startIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdjustOpen(true)}>{t("actions.addAdjustment")}</Button>
          </div>
        ) : null}
      </SurfaceCard>
    </div>

    {/* Tier 2: Detailed History and Audit Logs */}
    {(item.adjustments.length > 0 || item.payoutRecords.length > 0 || item.auditEvents.length > 0) ? (
      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        {/* Left column: History Events */}
        {(item.adjustments.length > 0 || item.payoutRecords.length > 0) ? (
          <div className="space-y-4">
            {item.adjustments.length > 0 ? (
              <SurfaceCard variant="section">
                <h2 className="text-sm font-bold text-text-primary dark:text-white/95 border-b border-border-light/60 pb-2 mb-3">
                  {t("detail.adjustments")}
                </h2>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {item.adjustments.map((adjustment) => (
                    <div key={adjustment.id} className="rounded-xl border border-border-light bg-surface-primary/40 p-2.5 text-xs">
                      <div className="flex justify-between gap-3 font-semibold mb-1">
                        <span>{t(`adjustmentTypes.${adjustment.type}` as Parameters<typeof t>[0])}</span>
                        <span className="tabular-nums text-text-primary dark:text-white/95">{formatSettlementMoney(locale, adjustment.amount ?? "0", adjustment.currency)}</span>
                      </div>
                      <p className="text-text-secondary leading-relaxed">{adjustment.reason}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            ) : null}

            {item.payoutRecords.length > 0 ? (
              <SurfaceCard variant="section">
                <h2 className="text-sm font-bold text-text-primary dark:text-white/95 border-b border-border-light/60 pb-2 mb-3">
                  {t("detail.externalTransfer")}
                </h2>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {item.payoutRecords.map((payout) => (
                    <div key={payout.id} className="rounded-xl border border-border-light bg-surface-primary/40 p-2.5 space-y-1">
                      <Row label={t("payout.walletDebit")} value={formatSettlementMoney(locale, payout.amountPaid ?? "0", payout.currency)} />
                      <Row label={t("payout.transferFee")} value={formatSettlementMoney(locale, payout.transferFeeAmount ?? "0", payout.transferFeeCurrency ?? payout.currency)} />
                      <Row label={t("payout.feeBearer")} value={payout.feeBearer === "DEDUCT_FROM_PRACTITIONER" ? t("payout.practitioner") : t("payout.platform")} />
                      <Row label={t("payout.netReceived")} value={formatSettlementMoney(locale, payout.netAmountReceived ?? payout.amountPaid ?? "0", payout.currency)} />
                      <Row label={t("payout.platformOutflow")} value={formatSettlementMoney(locale, payout.totalPlatformOutflow ?? payout.amountPaid ?? "0", payout.currency)} />
                      <Row label={t("modals.externalReference")} value={payout.externalPayoutRef ?? "-"} />
                      <Row label={t("modals.transferDate")} value={formatSettlementDateTime(locale, payout.effectiveAt)} />
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            ) : null}
          </div>
        ) : null}

        {/* Right column: Audit Log Timeline */}
        {item.auditEvents.length > 0 ? (
          <SurfaceCard variant="section">
            <h2 className="text-sm font-bold text-text-primary dark:text-white/95 border-b border-border-light/60 pb-2 mb-3">
              {t("detail.audit")}
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {item.auditEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-border-light/60 bg-surface-primary/20 p-2.5 text-xs flex justify-between items-start gap-4">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-text-primary dark:text-white/90">{auditLabel(event.action, locale)}</p>
                    <p className="text-[10px] text-text-muted">{event.actorUser?.displayName ?? t("system")}</p>
                  </div>
                  <span className="text-[10px] text-text-muted tabular-nums whitespace-nowrap">{formatSettlementDateTime(locale, event.occurredAt)}</span>
                </div>
              ))}
            </div>
          </SurfaceCard>
        ) : null}
      </div>
    ) : null}
    <FormModal isOpen={adjustOpen} onClose={() => setAdjustOpen(false)} title={t("modals.adjustmentTitle")} description={t("modals.adjustmentDescription")} submitLabel={t("actions.saveAdjustment")} cancelLabel={t("actions.cancel")} onSubmit={submitAdjustment} loading={adjustmentMutation.isPending} submitDisabled={!amount || !reason.trim()}><div className="space-y-4"><select aria-label={t("modals.adjustmentType")} className="app-control w-full" value={type} onChange={(e) => setType(e.target.value as SettlementAdjustmentType)}>{["PLATFORM_FEE", "ADMINISTRATIVE_FEE", "TAX", "MANUAL_CORRECTION"].map((value) => <option key={value} value={value}>{t(`adjustmentTypes.${value}` as Parameters<typeof t>[0])}</option>)}</select><input aria-label={t("modals.amount")} className="app-control w-full" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("modals.amount")} /><textarea aria-label={t("modals.reason")} className="app-control min-h-28 w-full" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("modals.reason")} /></div></FormModal>
    <FormModal isOpen={approveOpen} onClose={() => setApproveOpen(false)} title={t("modals.approveTitle")} description={t("modals.approveDescription")} submitLabel={approvalSubmitLabel} cancelLabel={t("actions.cancel")} onSubmit={approve} loading={approveMutation.isPending} submitDisabled={!effectiveCredit || (isCrossCurrency && !approveRate) || (materialCreditDifference && !creditOverrideReason.trim())}><div className="space-y-4"><div className="rounded-2xl border border-border-light bg-surface-secondary/60 p-4"><Row label={t("fields.patientPayment")} value={formatSettlementMoney(locale, financial.originalAmount ?? "0", financial.originalCurrency)} /><Row label={t("fields.practitionerEntitlement")} value={formatSettlementMoney(locale, financial.grossPractitionerAmount ?? "0", financial.originalCurrency)} /><Row label={t("fields.entitlementCurrency")} value={financial.originalCurrency} /><Row label={t("fields.walletCurrency")} value={walletCurrency} /></div>{isCrossCurrency ? <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4"><label className="block text-sm font-medium">{t("fields.exchangeRate")}</label><div className="mt-2 flex items-center gap-2"><span dir="ltr">1 USD =</span><input aria-label={t("fields.exchangeRate")} className="app-control min-w-0 flex-1" inputMode="decimal" value={approveRate} onChange={(e) => { setApproveRate(e.target.value); if (!approvedCredit) setApprovedCredit(""); }} placeholder="50.00" /><span dir="ltr">EGP</span></div><p className="mt-2 text-sm text-text-secondary">{financial.originalCurrency === "USD" ? `$${financial.grossPractitionerAmount ?? "0"} × EGP ${approveRate || "X"} = EGP ${calculatedCredit || "-"}` : `EGP ${financial.grossPractitionerAmount ?? "0"} ÷ ${approveRate || "X"} = $${calculatedCredit || "-"}`}</p></div> : <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t("modals.noConversion")}</p>}<label className="block"><span className="mb-2 block text-sm font-medium">{t("fields.calculatedWalletCredit")} ({walletCurrency})</span><input readOnly className="app-control w-full bg-surface-tertiary" value={calculatedCredit} /></label><label className="block"><span className="mb-2 block text-sm font-medium">{t("fields.approvedWalletCredit")} ({walletCurrency})</span><input aria-label={t("fields.approvedWalletCredit")} className="app-control w-full" inputMode="decimal" value={approvedCredit || calculatedCredit} onChange={(e) => setApprovedCredit(e.target.value)} /></label><Row label={t("fields.difference")} value={formatSettlementMoney(locale, creditDifference, walletCurrency)} />{materialCreditDifference ? <textarea aria-label={t("fields.walletCreditOverrideReason")} className="app-control min-h-20 w-full" value={creditOverrideReason} onChange={(e) => setCreditOverrideReason(e.target.value)} placeholder={t("fields.walletCreditOverrideReason")} /> : null}<p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{t("modals.noExternalTransfer")}</p></div></FormModal>
    <FormModal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} title={t("modals.rejectTitle")} description={t("modals.rejectDescription")} submitLabel={t("actions.confirmReject")} cancelLabel={t("actions.cancel")} onSubmit={reject} loading={rejectMutation.isPending} submitDisabled={!reason.trim()} destructive><textarea aria-label={t("modals.rejectionReason")} className="app-control min-h-32 w-full" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("modals.rejectionReason")} /></FormModal>
    <FormModal isOpen={payoutOpen} onClose={() => setPayoutOpen(false)} title={t("modals.payoutTitle")} description={t("modals.payoutDescription")} submitLabel={t("actions.recordTransfer")} cancelLabel={t("actions.cancel")} onSubmit={recordTransfer} loading={payoutMutation.isPending} submitDisabled={!payoutReference.trim() || !payoutDate || (fee > 0 && !feeBearer)}><div className="space-y-4"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">{t("modals.payoutWarning")}</div><div className="rounded-2xl border border-border-light bg-surface-secondary/60 p-4"><Row label={t("payout.walletCurrency")} value={walletCurrency} /><Row label={t("payout.walletDebit")} value={formatSettlementMoney(locale, remainingPayout.toFixed(2), walletCurrency)} /></div><label className="block"><span className="mb-2 block text-sm font-medium">{t("payout.transferFee")}</span><input aria-label={t("payout.transferFee")} className="app-control w-full" inputMode="decimal" min="0" value={transferFee} onChange={(e) => setTransferFee(e.target.value)} /></label><fieldset><legend className="mb-2 text-sm font-medium">{t("payout.feeBearer")}</legend><div className="grid gap-2 sm:grid-cols-2"><label className="rounded-xl border border-border-light p-3"><input type="radio" checked={feeBearer === "DEDUCT_FROM_PRACTITIONER"} onChange={() => setFeeBearer("DEDUCT_FROM_PRACTITIONER")} /> <span className="ms-2">{t("payout.practitioner")}</span></label><label className="rounded-xl border border-border-light p-3"><input type="radio" checked={feeBearer === "PLATFORM_EXPENSE"} onChange={() => setFeeBearer("PLATFORM_EXPENSE")} /> <span className="ms-2">{t("payout.platform")}</span></label></div></fieldset><div className="rounded-2xl border border-primary/20 bg-primary/5 p-4"><Row label={t("payout.netReceived")} value={formatSettlementMoney(locale, netReceived.toFixed(2), walletCurrency)} /><Row label={t("payout.platformOutflow")} value={formatSettlementMoney(locale, platformOutflow.toFixed(2), walletCurrency)} /></div><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-medium">{t("modals.externalReference")}</span><input aria-label={t("modals.externalReference")} className="app-control w-full" value={payoutReference} onChange={(e) => setPayoutReference(e.target.value)} /></label><label className="block"><span className="mb-2 block text-sm font-medium">{t("modals.transferDate")}</span><input aria-label={t("modals.transferDate")} className="app-control w-full" type="datetime-local" value={payoutDate} onChange={(e) => setPayoutDate(e.target.value)} /></label></div><label className="block"><span className="mb-2 block text-sm font-medium">{t("modals.paymentMethod")}</span><select className="app-control w-full" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as RecordPractitionerPayoutRequest["payoutMethod"])}><option value="MANUAL_BANK_TRANSFER">Manual bank transfer</option><option value="WALLET_TRANSFER">Wallet transfer</option><option value="CASH">Cash</option><option value="OTHER">Other</option></select></label><textarea aria-label={t("modals.notes")} className="app-control min-h-20 w-full" value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} placeholder={t("modals.notes")} /></div></FormModal>
  </div>;
}
