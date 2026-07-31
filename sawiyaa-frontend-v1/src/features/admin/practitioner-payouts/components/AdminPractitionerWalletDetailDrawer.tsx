"use client";

import { useLocale, useTranslations } from "next-intl";
import { Drawer, ModalBody, ModalHeader } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { Link } from "@/i18n/navigation";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import { useAdminPractitionerWalletDetail } from "../hooks/use-admin-practitioner-payouts";
import type { AdminPractitionerWalletListItem } from "../types/admin-practitioner-payouts.types";
import AdminSessionReference from "@/components/shared/admin/AdminSessionReference";

function labelForEntry(type: string, t: ReturnType<typeof useTranslations>) {
  if (type === "PRACTITIONER_EARNING") return t("balanceView.drawer.sessionEarning");
  if (type === "SETTLEMENT_PAYOUT") return t("balanceView.drawer.settlementPayout");
  if (type === "REFUND_RECOVERY") return t("balanceView.drawer.financialRecovery");
  if (type === "MANUAL_ADJUSTMENT") return t("balanceView.drawer.manualAdjustment");
  return t("balanceView.drawer.recorded");
}

function labelForSettlementStatus(status: string, t: ReturnType<typeof useTranslations>) {
  const supported = ["CREDITED", "PAID_OUT", "REJECTED", "UNDER_REVIEW"];
  return supported.includes(status) ? t(`statuses.${status}` as Parameters<typeof t>[0]) : t("balanceView.drawer.recorded");
}

export default function AdminPractitionerWalletDetailDrawer({ wallet, open, onClose }: { wallet: AdminPractitionerWalletListItem | null; open: boolean; onClose: () => void }) {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();
  const detail = useAdminPractitionerWalletDetail(wallet?.walletId, open);
  const item = detail.data;
  const currency = item?.wallet.currencyCode ?? wallet?.currencyCode ?? "USD";
  return <Drawer isOpen={open} onClose={onClose} side={locale === "ar" ? "left" : "right"} ariaLabel={t("balanceView.drawer.title")} className="w-full max-w-2xl" inset showHandle={false}>
    <div className="flex h-full flex-col">
      <ModalHeader title={t("balanceView.drawer.title")} description={item?.practitioner.name ?? wallet?.practitionerName ?? "-"} eyebrow={t("balanceView.drawer.eyebrow")} />
      <ModalBody className="space-y-5">
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-7 text-text-secondary">{t("balanceView.drawer.notice")}</div>
        {detail.isLoading ? <p className="text-sm text-text-muted">…</p> : detail.isError || !item ? <p className="text-sm text-text-secondary">{t("balanceView.error")}</p> : <>
          <section className="space-y-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-text-primary dark:text-white/95">{item.practitioner.name ?? "-"}</p><p className="text-xs text-text-muted">{item.practitioner.email ?? item.practitioner.reference ?? "-"}</p></div><span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-semibold">{currency}</span></div><div className="grid gap-3 sm:grid-cols-3"><AdminSummaryCard label={t("balanceView.drawer.available")} value={formatSettlementMoney(locale, item.wallet.availableBalance, currency)} tone="primary" /><AdminSummaryCard label={t("balanceView.drawer.credited")} value={formatSettlementMoney(locale, item.wallet.totalCredited, currency)} tone="success" /><AdminSummaryCard label={t("balanceView.drawer.transferred")} value={formatSettlementMoney(locale, item.wallet.totalExternallyTransferred, currency)} tone="neutral" /></div><p className="text-xs text-text-muted">{t("balanceView.drawer.lastActivity")}: {item.wallet.latestActivityAt ? formatSettlementDateTime(locale, item.wallet.latestActivityAt) : "-"}</p></section>
          <section className="space-y-3"><h3 className="text-sm font-semibold">{t("balanceView.drawer.walletActivity")}</h3>{item.recentLedgerEntries.length ? <div className="space-y-2">{item.recentLedgerEntries.map(entry => <div key={entry.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border-light bg-surface-primary px-4 py-3"><div className="min-w-0"><p className="text-sm font-medium">{labelForEntry(entry.type, t)}</p><p className="text-xs text-text-muted">{formatSettlementDateTime(locale, entry.effectiveAt)} · {entry.sessionId ? <AdminSessionReference sessionId={entry.sessionId} sessionCode={entry.sessionCode} href={`/admin/sessions/runtime-inspection?sessionId=${entry.sessionId}`} variant="inline" copyable /> : (locale === "ar" ? "غير مرتبط بجلسة" : "Not linked to a Session")}</p></div><div className="text-end"><p className={`font-semibold tabular-nums ${entry.direction === "CREDIT" ? "text-success-700" : "text-error-700"}`}>{entry.direction === "CREDIT" ? t("balanceView.drawer.credit") : t("balanceView.drawer.debit")} {formatSettlementMoney(locale, entry.amount, entry.currencyCode)}</p>{entry.settlementId ? <Link className="text-xs text-primary underline" href={`/admin/settlements/${entry.settlementId}`}>{t("balanceView.drawer.openSettlement")}</Link> : null}</div></div>)}</div> : <p className="text-sm text-text-muted">{t("balanceView.drawer.noActivity")}</p>}</section>
          <section className="space-y-3"><h3 className="text-sm font-semibold">{t("balanceView.drawer.relatedSettlements")}</h3>{item.recentSettlements.length ? <div className="space-y-2">{item.recentSettlements.map(settlement => <div key={settlement.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border-light px-4 py-3"><div><p className="font-medium">{settlement.settlementReference} · {settlement.sessionId ? <AdminSessionReference sessionId={settlement.sessionId} sessionCode={settlement.sessionCode} href={`/admin/sessions/runtime-inspection?sessionId=${settlement.sessionId}`} variant="inline" copyable /> : (locale === "ar" ? "غير مرتبط بجلسة" : "Not linked to a Session")}</p><p className="text-xs text-text-muted">{labelForSettlementStatus(settlement.status, t)} · {settlement.approvedAt ? formatSettlementDateTime(locale, settlement.approvedAt) : "-"}</p></div><div className="text-end"><p className="font-semibold tabular-nums">{formatSettlementMoney(locale, settlement.amountCredited, settlement.currencyCode)}</p><Link className="text-xs text-primary underline" href={`/admin/settlements/${settlement.id}`}>{t("balanceView.drawer.openSettlement")}</Link></div></div>)}</div> : <p className="text-sm text-text-muted">{t("balanceView.drawer.noSettlements")}</p>}</section>
          <section className="space-y-3"><h3 className="text-sm font-semibold">{t("balanceView.drawer.externalTransfers")}</h3>{item.recentTransfers.length ? <div className="space-y-2">{item.recentTransfers.map(transfer => <div key={transfer.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border-light px-4 py-3"><div><p className="font-medium">{transfer.transferReference}</p><p className="text-xs text-text-muted">{formatSettlementDateTime(locale, transfer.transferredAt)} · {transfer.executedBy ?? "-"}</p></div><div className="text-end"><p className="font-semibold tabular-nums">{formatSettlementMoney(locale, transfer.amount, transfer.currencyCode)}</p><Link className="text-xs text-primary underline" href={`/admin/practitioner-payouts/history?practitionerId=${item.practitioner.id}`}>{t("balanceView.drawer.viewTransfer")}</Link></div></div>)}</div> : <p className="text-sm text-text-muted">{t("balanceView.drawer.noTransfers")}</p>}</section>
        </>}
        <Button variant="outline" onClick={onClose}>{t("balanceView.drawer.close")}</Button>
      </ModalBody>
    </div>
  </Drawer>;
}
