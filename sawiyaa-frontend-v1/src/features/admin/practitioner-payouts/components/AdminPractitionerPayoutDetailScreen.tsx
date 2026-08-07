"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Copy,
  DollarSign,
  FileCheck2,
  History,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  Wallet,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import AdminSessionReference from "@/components/shared/admin/AdminSessionReference";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import { cleanPersonName, formatPersonDisplayName, shortId } from "@/lib/person-name-cleaner";
import { useAdminPractitionerWalletDetail } from "../hooks/use-admin-practitioner-payouts";
import type { AdminPractitionerWalletLedgerEntryItem, AdminPractitionerWalletSettlementItem, AdminPractitionerWalletTransferItem } from "../types/admin-practitioner-payouts.types";

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

type TabType = "ledger" | "settlements" | "transfers";

export default function AdminPractitionerPayoutDetailScreen({
  walletOrPractitionerId,
}: {
  walletOrPractitionerId: string;
}) {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("ledger");
  const [filterQuery, setFilterQuery] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  const detailQuery = useAdminPractitionerWalletDetail(walletOrPractitionerId, true);
  const data = detailQuery.data;

  const practitionerName = useMemo(() => {
    if (!data) return "-";
    return formatPersonDisplayName(
      data.practitioner.name,
      data.practitioner.reference,
      isAr ? "الممارس" : "Practitioner"
    );
  }, [data, isAr]);

  const currency = data?.wallet.currencyCode ?? "USD";

  const copyPractitionerId = async () => {
    if (!data?.practitioner.id) return;
    await navigator.clipboard.writeText(data.practitioner.id);
    setCopiedId(true);
    toast.success(isAr ? "تم نسخ الرقم التعريفي للممارس" : "Practitioner ID copied");
    setTimeout(() => setCopiedId(false), 1600);
  };

  const filteredLedgerEntries = useMemo(() => {
    if (!data?.recentLedgerEntries) return [];
    if (!filterQuery.trim()) return data.recentLedgerEntries;
    const q = filterQuery.toLowerCase();
    return data.recentLedgerEntries.filter(
      (entry) =>
        entry.type.toLowerCase().includes(q) ||
        (entry.sessionCode && entry.sessionCode.toLowerCase().includes(q)) ||
        (entry.settlementId && entry.settlementId.toLowerCase().includes(q)) ||
        entry.amount.includes(q)
    );
  }, [data?.recentLedgerEntries, filterQuery]);

  const ledgerColumns = useMemo<ColumnDef<AdminPractitionerWalletLedgerEntryItem>[]>(() => [
    {
      id: "type",
      header: isAr ? "نوع الحركة" : "Type",
      cell: (row) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-xs text-text-primary dark:text-white">
            {labelForEntry(row.type, t)}
          </span>
          {row.sessionId ? (
            <div className="flex items-center gap-1 text-[11px] text-text-muted">
              <span>{isAr ? "الجلسة:" : "Session:"}</span>
              <AdminSessionReference
                sessionId={row.sessionId}
                sessionCode={row.sessionCode}
                href={`/admin/sessions/runtime-inspection?sessionId=${row.sessionId}`}
                variant="inline"
                copyable
              />
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "amount",
      header: isAr ? "المبلغ" : "Amount",
      cell: (row) => (
        <span
          className={`font-mono text-xs font-bold ${
            row.direction === "CREDIT" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
          }`}
        >
          {row.direction === "CREDIT" ? "+" : "-"} {formatSettlementMoney(locale, row.amount, row.currencyCode)}
        </span>
      ),
    },
    {
      id: "effectiveAt",
      header: isAr ? "التاريخ والوقت" : "Date & Time",
      cell: (row) => (
        <span className="text-xs text-text-secondary">
          {formatSettlementDateTime(locale, row.effectiveAt)}
        </span>
      ),
    },
    {
      id: "settlement",
      header: isAr ? "التسوية المرتبطة" : "Linked Settlement",
      cell: (row) =>
        row.settlementId ? (
          <Link
            href={`/admin/settlements/${row.settlementId}`}
            className="font-mono text-xs text-primary underline-offset-2 hover:underline"
            dir="ltr"
          >
            {shortId(row.settlementId, 8, 4)}
          </Link>
        ) : (
          <span className="text-text-muted text-xs">—</span>
        ),
    },
  ], [isAr, locale, t]);

  const settlementsColumns = useMemo<ColumnDef<AdminPractitionerWalletSettlementItem>[]>(() => [
    {
      id: "reference",
      header: isAr ? "مرجع التسوية" : "Settlement Ref",
      cell: (row) => (
        <Link
          href={`/admin/settlements/${row.id}`}
          className="font-mono text-xs font-bold text-primary underline-offset-2 hover:underline"
          dir="ltr"
        >
          {shortId(row.settlementReference || row.id, 12, 4)}
        </Link>
      ),
    },
    {
      id: "session",
      header: isAr ? "الجلسة" : "Session",
      cell: (row) =>
        row.sessionId ? (
          <AdminSessionReference
            sessionId={row.sessionId}
            sessionCode={row.sessionCode}
            href={`/admin/sessions/runtime-inspection?sessionId=${row.sessionId}`}
            variant="table"
            copyable
          />
        ) : (
          <span className="text-text-muted text-xs">—</span>
        ),
    },
    {
      id: "amount",
      header: isAr ? "المبلغ المضاف" : "Amount Credited",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
          {formatSettlementMoney(locale, row.amountCredited, row.currencyCode)}
        </span>
      ),
    },
    {
      id: "status",
      header: isAr ? "الحالة" : "Status",
      cell: (row) => (
        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          {labelForSettlementStatus(row.status, t)}
        </span>
      ),
    },
    {
      id: "approvedAt",
      header: isAr ? "تاريخ الاعتماد" : "Approved At",
      cell: (row) => (
        <span className="text-xs text-text-secondary">
          {row.approvedAt ? formatSettlementDateTime(locale, row.approvedAt) : "—"}
        </span>
      ),
    },
  ], [isAr, locale, t]);

  const transfersColumns = useMemo<ColumnDef<AdminPractitionerWalletTransferItem>[]>(() => [
    {
      id: "reference",
      header: isAr ? "مرجع التحويل" : "Transfer Ref",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-text-primary dark:text-white" dir="ltr">
          {shortId(row.transferReference, 14, 4)}
        </span>
      ),
    },
    {
      id: "amount",
      header: isAr ? "المبلغ المحول" : "Amount Transferred",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-400">
          {formatSettlementMoney(locale, row.amount, row.currencyCode)}
        </span>
      ),
    },
    {
      id: "executedBy",
      header: isAr ? "نفذه" : "Executed By",
      cell: (row) => {
        const name = cleanPersonName(row.executedBy) || (isAr ? "المحاسب" : "Accountant");
        return <span className="text-xs font-medium text-text-primary dark:text-white">{name}</span>;
      },
    },
    {
      id: "transferredAt",
      header: isAr ? "تاريخ التحويل" : "Transferred At",
      cell: (row) => (
        <span className="text-xs text-text-secondary">
          {formatSettlementDateTime(locale, row.transferredAt)}
        </span>
      ),
    },
  ], [isAr, locale]);

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <ListStateSkeleton />
      </div>
    );
  }

  if (detailQuery.isError || !data) {
    return (
      <StateCard
        icon={<Sparkles className="h-6 w-6 text-primary" />}
        title={isAr ? "لم نتمكن من تحميل بيانات ممارس الرصيد" : "Unable to load practitioner balance details"}
        note={isAr ? "حدث خطأ أثناء جلب سجل رصيد الممارس. يرجى المحاولة مرة أخرى." : "An error occurred while fetching practitioner balance record."}
        action={{
          label: isAr ? "إعادة المحاولة" : "Try again",
          onClick: () => detailQuery.refetch(),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/practitioner-payouts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className={`h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
            {t("detail.backToList")}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white sm:text-3xl">
              {practitionerName}
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20">
              {currency}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
            {data.practitioner.email && <span>{data.practitioner.email}</span>}
            {data.practitioner.reference && (
              <span className="font-mono" dir="ltr">
                Ref: {shortId(data.practitioner.reference, 14, 4)}
              </span>
            )}
            <button
              type="button"
              onClick={copyPractitionerId}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <Copy className="h-3 w-3" />
              {copiedId ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ الـ ID" : "Copy ID")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => detailQuery.refetch()}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${detailQuery.isFetching ? "animate-spin" : ""}`} />
            {isAr ? "تحديث" : "Refresh"}
          </Button>
          <Link
            href={`/admin/practitioner-payouts/history?practitionerId=${data.practitioner.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-white px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary/30 dark:bg-surface-secondary dark:text-white"
          >
            <History className="h-3.5 w-3.5 text-primary" />
            {isAr ? "سجل الدفعات الخارجة" : "Payout History"}
          </Link>
        </div>
      </div>

      {/* Notice card */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs leading-6 text-text-secondary dark:border-primary/30 dark:bg-primary/10 dark:text-slate-200">
        <p className="font-medium text-text-primary dark:text-white">
          💡 {t("balanceView.drawer.notice")}
        </p>
      </div>

      {/* Hero Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminSummaryCard
          label={t("balanceView.drawer.available")}
          value={formatSettlementMoney(locale, data.wallet.availableBalance, currency)}
          tone="primary"
          icon={<Wallet className="h-5 w-5 text-primary" />}
        />
        <AdminSummaryCard
          label={t("balanceView.drawer.credited")}
          value={formatSettlementMoney(locale, data.wallet.totalCredited, currency)}
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        />
        <AdminSummaryCard
          label={t("balanceView.drawer.transferred")}
          value={formatSettlementMoney(locale, data.wallet.totalExternallyTransferred, currency)}
          tone="neutral"
          icon={<ArrowUpRight className="h-5 w-5 text-slate-500" />}
        />
      </div>

      {/* Activity Timeline & Tabbed History Section */}
      <div className="app-panel space-y-6 rounded-[28px] p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-light pb-4 dark:border-white/8">
          <div>
            <h2 className="text-lg font-bold text-text-primary dark:text-white">
              {isAr ? "سجل الحركات المالية والتسويات" : "Financial Ledger & Activity Record"}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {isAr
                ? "تتبع كافة الإيداعات، اقتطاعات الباقات، التسويات، والتحويلات المسجلة لهذا الممارس."
                : "Track all earnings, package releases, settlements, and external transfers for this practitioner."}
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === "ledger"
                  ? "bg-primary text-white shadow-2xs"
                  : "border border-border-light bg-surface-tertiary text-text-secondary hover:text-text-primary dark:bg-white/5 dark:text-slate-300"
              }`}
            >
              {isAr ? "حركات الرصيد (Ledger)" : "Ledger Entries"} ({data.recentLedgerEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settlements")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === "settlements"
                  ? "bg-primary text-white shadow-2xs"
                  : "border border-border-light bg-surface-tertiary text-text-secondary hover:text-text-primary dark:bg-white/5 dark:text-slate-300"
              }`}
            >
              {isAr ? "التسويات المرتبطة" : "Settlements"} ({data.recentSettlements.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("transfers")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === "transfers"
                  ? "bg-primary text-white shadow-2xs"
                  : "border border-border-light bg-surface-tertiary text-text-secondary hover:text-text-primary dark:bg-white/5 dark:text-slate-300"
              }`}
            >
              {isAr ? "التحويلات الخارجة" : "Payout Transfers"} ({data.recentTransfers.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Ledger Entries */}
        {activeTab === "ledger" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={isAr ? "بحث بالرمز أو نوع الحركة..." : "Search by code or type..."}
                  className="app-control w-full py-2 ps-9 pe-3 text-xs"
                />
              </div>
              <span className="text-xs text-text-muted">
                {isAr ? "إجمالي الحركات:" : "Total Entries:"} {filteredLedgerEntries.length}
              </span>
            </div>

            <DataTable
              data={filteredLedgerEntries}
              columns={ledgerColumns}
              getRowId={(row) => row.id}
              emptyState={{
                icon: <FileCheck2 className="h-5 w-5 text-primary" />,
                title: isAr ? "لا توجد حركات رصيد مسجلة" : "No ledger entries recorded",
                description: isAr ? "سيتم تسجيل إيداعات الأرباح والاقتطاعات هنا فور اعتمادها." : "Earnings and adjustments will appear here.",
              }}
              ariaLabel={isAr ? "حركات الرصيد" : "Ledger entries"}
            />
          </div>
        )}

        {/* Tab 2: Linked Settlements */}
        {activeTab === "settlements" && (
          <DataTable
            data={data.recentSettlements}
            columns={settlementsColumns}
            getRowId={(row) => row.id}
            emptyState={{
              icon: <BadgeDollarSign className="h-5 w-5 text-primary" />,
              title: isAr ? "لا توجد تسويات جارية بعد" : "No settlements available",
              description: isAr ? "ستظهر التسويات المعتمدة لهذا الممارس هنا." : "Approved settlements will appear here.",
            }}
            ariaLabel={isAr ? "التسويات المرتبطة" : "Linked settlements"}
          />
        )}

        {/* Tab 3: Payout Transfers */}
        {activeTab === "transfers" && (
          <DataTable
            data={data.recentTransfers}
            columns={transfersColumns}
            getRowId={(row) => row.id}
            emptyState={{
              icon: <History className="h-5 w-5 text-primary" />,
              title: isAr ? "لا توجد تحويلات خارجة بعد" : "No payout transfers recorded",
              description: isAr ? "ستظهر سجلات الدفعات الخارجية المسجلة هنا." : "External payout records will appear here.",
            }}
            ariaLabel={isAr ? "التحويلات الخارجة" : "Payout transfers"}
          />
        )}
      </div>
    </div>
  );
}
