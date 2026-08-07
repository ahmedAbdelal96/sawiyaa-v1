"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BadgeDollarSign, ClipboardList, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam, parseTextParam } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import DateField from "@/components/form/input/DateField";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAdminPaymentGatewayControlList } from "@/features/admin/payment-gateway-control/hooks/use-admin-payment-gateway-control";
import { useAdminIncomingPayments } from "../hooks/use-admin-payments";
import { ADMIN_PAYMENT_STATUS_STYLES } from "../lib/admin-payment-status";
import type { AdminIncomingPaymentItem, AdminIncomingPaymentsQuery, AdminPaymentRefundSummaryStatus } from "../types/admin-payments.types";
import type { PaymentStatus } from "@/features/payments/types/payments.types";
import AdminSessionReference from "@/components/shared/admin/AdminSessionReference";
import { cleanPersonName } from "@/lib/person-name-cleaner";

const paymentStatuses: Array<PaymentStatus | "ALL"> = ["ALL", "CREATED", "PENDING", "REQUIRES_ACTION", "AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED", "EXPIRED", "REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"];
const refundStatuses: Array<AdminPaymentRefundSummaryStatus | "ALL"> = ["ALL", "NONE", "PENDING", "REFUNDED", "PARTIALLY_REFUNDED", "FAILED"];

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale.startsWith("ar") ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short", hour12: !locale.startsWith("ar") });
}

function formatTableAmount(value: string, locale: string) {
  return new Intl.NumberFormat(locale.startsWith("ar") ? "ar-EG" : "en-US", { maximumFractionDigits: 2 }).format(Number(value));
}

function providerFallbackLabel(value: string) {
  return value.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function settlementStatusLabel(value: string, t: ReturnType<typeof useTranslations>) {
  const supported = ["DRAFT", "UNDER_REVIEW", "APPROVED", "CREDITED", "PAID_OUT", "REJECTED", "CANCELLED"];
  return supported.includes(value) ? t(`settlementStatuses.${value}` as Parameters<typeof t>[0]) : providerFallbackLabel(value);
}

function StatusBadge({ status, kind, t }: { status: string; kind: "payment" | "refund"; t: ReturnType<typeof useTranslations> }) {
  const className = kind === "payment" ? (ADMIN_PAYMENT_STATUS_STYLES[status as PaymentStatus] ?? "bg-surface-tertiary text-text-muted") : status === "PENDING" ? "bg-warning-50 text-warning-700" : status === "FAILED" ? "bg-error-50 text-error-700" : "bg-surface-tertiary text-text-secondary";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{t(`${kind === "payment" ? "paymentStatuses" : "refundSummaryStatuses"}.${status}` as Parameters<typeof t>[0])}</span>;
}

export default function AdminPaymentsLookupScreen() {
  const t = useTranslations("admin-finance-operations");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, { min: 1, max: 50 });
  const query = parseTextParam(searchParams.get("query"), { maxLength: 120 });
  const provider = parseTextParam(searchParams.get("provider"), { maxLength: 40 }) || "ALL";
  const status = parseEnumParam<PaymentStatus | "ALL">(searchParams.get("status"), paymentStatuses, "ALL");
  const refundStatus = parseEnumParam<AdminPaymentRefundSummaryStatus | "ALL">(searchParams.get("refundStatus"), refundStatuses, "ALL");
  const currency = parseEnumParam<"ALL" | "EGP" | "USD">(searchParams.get("currency"), ["ALL", "EGP", "USD"], "ALL");
  const createdFrom = parseTextParam(searchParams.get("createdFrom"), { maxLength: 32 });
  const createdTo = parseTextParam(searchParams.get("createdTo"), { maxLength: 32 });
  const sortBy = parseEnumParam<"createdAt" | "amountTotal">(searchParams.get("sortBy"), ["createdAt", "amountTotal"], "createdAt");
  const sortDirection = parseEnumParam<"asc" | "desc">(searchParams.get("sortDirection"), ["asc", "desc"], "desc");
  const params = useMemo<AdminIncomingPaymentsQuery>(() => ({ page, limit, query: query || undefined, provider: provider === "ALL" ? undefined : provider, status: status === "ALL" ? undefined : status, refundStatus: refundStatus === "ALL" ? undefined : refundStatus, currency: currency === "ALL" ? undefined : currency, createdFrom: createdFrom || undefined, createdTo: createdTo || undefined, sortBy, sortDirection }), [page, limit, query, provider, status, refundStatus, currency, createdFrom, createdTo, sortBy, sortDirection]);
  const payments = useAdminIncomingPayments(params);
  const gatewayProviders = useAdminPaymentGatewayControlList();
  const data = payments.data;
  const providers = useMemo(() => {
    const values = new Set<string>(gatewayProviders.data?.items.map(item => item.provider) ?? []);
    data?.items.forEach(item => values.add(item.provider));
    return ["ALL", ...Array.from(values).sort()];
  }, [data?.items, gatewayProviders.data?.items]);
  const update = (values: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), values);
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  };
  const columns = useMemo<ColumnDef<AdminIncomingPaymentItem>[]>(() => [
    {
      id: "customer",
      header: t("list.headers.customer"),
      accessor: (row) => row.customer ?? "",
      cell: (row) => {
        const rawCustomer = row.customer;
        const cleanName = cleanPersonName(rawCustomer);
        const displayName = cleanName || (rawCustomer && !rawCustomer.includes("-") ? rawCustomer : (locale.startsWith("ar") ? "المريض" : "Patient"));
        const rawId = rawCustomer && rawCustomer !== displayName ? rawCustomer : null;

        return (
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-text-primary dark:text-white">
              {displayName}
            </span>
            {rawId && (
              <span className="block font-mono text-[9px] text-text-muted/80 dark:text-slate-500" dir="ltr">
                ID: {rawId}
              </span>
            )}
          </div>
        );
      },
    },
    { id: "reference", header: t("list.headers.paymentReference"), accessor: row => row.paymentReference ?? "", cell: row => <span className="font-mono text-xs">{row.paymentReference ?? "—"}</span> },
    { id: "provider", header: t("list.headers.provider"), accessor: row => row.provider, cell: row => ["STRIPE", "PAYMOB"].includes(row.provider) ? t(`providers.${row.provider}` as Parameters<typeof t>[0]) : providerFallbackLabel(row.provider) },
    { id: "amount", header: t("list.headers.amount"), accessor: row => Number(row.amount), cell: row => <span className="font-semibold tabular-nums">{formatTableAmount(row.amount, locale)}</span> },
    { id: "currency", header: t("list.headers.currency"), accessor: row => row.currency, cell: row => <span className="font-mono text-xs">{row.currency}</span> },
    { id: "paymentStatus", header: t("list.headers.paymentStatus"), accessor: row => row.paymentStatus, cell: row => <StatusBadge status={row.paymentStatus} kind="payment" t={t} /> },
    { id: "refundStatus", header: t("list.headers.refundStatus"), accessor: row => row.refundStatus, cell: row => <StatusBadge status={row.refundStatus} kind="refund" t={t} /> },
    {
      id: "session",
      header: t("list.headers.session"),
      accessor: (row) => row.session?.sessionCode ?? "",
      cell: (row) =>
        row.session ? (
          <div className="inline-flex items-center gap-1 text-xs font-medium">
            <span className="text-[10px] font-semibold text-text-muted">
              {locale.startsWith("ar") ? "رمز الجلسة:" : "Code:"}
            </span>
            <AdminSessionReference
              sessionId={row.session.id}
              sessionCode={row.session.sessionCode}
              href={`/admin/sessions/runtime-inspection?sessionId=${row.session.id}`}
              variant="table"
              copyable
            />
          </div>
        ) : (
          <span className="text-text-muted text-xs">{t("relations.noRelatedSession")}</span>
        ),
      hideOnMobile: true,
    },
    { id: "settlement", header: t("list.headers.settlement"), accessor: row => row.settlement?.status ?? "", cell: row => row.settlement ? <Link className="text-primary underline-offset-2 hover:underline" href={`/admin/settlements/${row.settlement.id}` as never}>{settlementStatusLabel(row.settlement.status, t)}</Link> : <span className="text-text-muted">{row.paymentStatus === "CAPTURED" && row.session?.status === "COMPLETED" ? t("relations.awaitingSettlement") : t("relations.notCreatedYet")}</span>, hideOnMobile: true },
    { id: "paidAt", header: t("list.headers.paidAt"), accessor: row => row.paidAt ?? "", cell: row => formatDate(row.paidAt, locale), hideOnMobile: true },
    { id: "lastUpdated", header: t("list.headers.lastUpdated"), accessor: row => row.lastUpdated, cell: row => formatDate(row.lastUpdated, locale), hideOnMobile: true },
  ], [locale, t]);
  const hasFilters = Boolean(query) || provider !== "ALL" || status !== "ALL" || refundStatus !== "ALL" || currency !== "ALL" || Boolean(createdFrom) || Boolean(createdTo) || sortBy !== "createdAt" || sortDirection !== "desc";
  return <AdminOperationalListShell eyebrow={t("list.eyebrow")} title={t("list.title")} description={t("list.note")} actions={<Link href="/admin/admin-operations" className="inline-flex items-center gap-2 rounded-full border border-border-light px-4 py-2 text-xs font-semibold"><ClipboardList className="h-4 w-4" />{t("incomingPayments.eventLogAction")}</Link>} summaryCards={<AdminSummaryCard label={t("list.title")} value={data?.pagination.totalItems ?? "…"} tone="primary" />} filters={<div className="space-y-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label><span className="mb-2 block text-xs font-semibold text-text-muted">{t("filters.query")}</span><div className="relative"><Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><input className="app-control w-full px-11 py-3" value={query} onChange={e => update({ query: e.target.value || null, page: 1 })} placeholder={t("filters.queryPlaceholder")} /></div></label><label><span className="mb-2 block text-xs font-semibold text-text-muted">{t("filters.provider")}</span><select className="app-control w-full px-4 py-3" value={provider} onChange={e => update({ provider: e.target.value === "ALL" ? null : e.target.value, page: 1 })}>{providers.map(value => <option key={value} value={value}>{value === "ALL" ? t("filters.all") : ["STRIPE", "PAYMOB"].includes(value) ? t(`providers.${value}` as Parameters<typeof t>[0]) : providerFallbackLabel(value)}</option>)}</select></label><label><span className="mb-2 block text-xs font-semibold text-text-muted">{t("filters.paymentStatus")}</span><select className="app-control w-full px-4 py-3" value={status} onChange={e => update({ status: e.target.value === "ALL" ? null : e.target.value, page: 1 })}>{paymentStatuses.map(value => <option key={value} value={value}>{value === "ALL" ? t("filters.all") : t(`paymentStatuses.${value}` as Parameters<typeof t>[0])}</option>)}</select></label><label><span className="mb-2 block text-xs font-semibold text-text-muted">{t("filters.currency")}</span><select className="app-control w-full px-4 py-3" value={currency} onChange={e => update({ currency: e.target.value === "ALL" ? null : e.target.value, page: 1 })}><option value="ALL">{t("filters.all")}</option><option value="EGP">EGP</option><option value="USD">USD</option></select></label></div><div className="grid gap-3 md:grid-cols-3"><label><span className="mb-2 block text-xs font-semibold text-text-muted">{t("filters.refundStatus")}</span><select className="app-control w-full px-4 py-3" value={refundStatus} onChange={e => update({ refundStatus: e.target.value === "ALL" ? null : e.target.value, page: 1 })}>{refundStatuses.map(value => <option key={value} value={value}>{value === "ALL" ? t("filters.all") : t(`refundSummaryStatuses.${value}` as Parameters<typeof t>[0])}</option>)}</select></label><DateField label={t("filters.fromDate")} value={createdFrom} onChange={value => update({ createdFrom: value || null, page: 1 })} /><DateField label={t("filters.toDate")} value={createdTo} onChange={value => update({ createdTo: value || null, page: 1 })} /></div><div className="flex items-center justify-end gap-3"><label><span className="me-2 text-xs font-semibold text-text-muted">{t("filters.sort")}</span><select className="app-control px-3 py-2" value={`${sortBy}:${sortDirection}`} onChange={e => { const [nextSortBy, nextDirection] = e.target.value.split(":") as ["createdAt" | "amountTotal", "asc" | "desc"]; update({ sortBy: nextSortBy === "createdAt" ? null : nextSortBy, sortDirection: nextDirection === "desc" ? null : nextDirection, page: 1 }); }}><option value="createdAt:desc">{t("filters.sortNewest")}</option><option value="createdAt:asc">{t("filters.sortOldest")}</option><option value="amountTotal:desc">{t("filters.sortHighest")}</option><option value="amountTotal:asc">{t("filters.sortLowest")}</option></select></label><FilterClearButton disabled={!hasFilters} onClick={() => update({ query: null, provider: null, status: null, refundStatus: null, currency: null, createdFrom: null, createdTo: null, sortBy: null, sortDirection: null, page: 1 })} /></div></div>}>{<DataTable data={data?.items ?? []} columns={columns} getRowId={row => row.id} loading={payments.isLoading} error={payments.isError ? t("states.listError.note") : null} errorState={{ title: t("states.listError.heading"), description: t("states.listError.note"), action: { label: t("states.listError.retry"), onClick: () => payments.refetch() } }} onRowClick={row => router.push(`/admin/payments/${row.id}` as never)} rowActions={row => <ActionIconButton intent="view" label={t("list.openAction")} icon={<BadgeDollarSign className="h-4 w-4" />} onClick={() => router.push(`/admin/payments/${row.id}` as never)} />} pagination={data ? { page: data.pagination.page, limit: data.pagination.limit, total: data.pagination.totalItems, totalPages: data.pagination.totalPages, hasPrevPage: data.pagination.page > 1, hasNextPage: data.pagination.page < data.pagination.totalPages } : undefined} onPageChange={page => update({ page })} onPageSizeChange={limit => update({ limit, page: 1 })} pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS} emptyState={{ icon: <BadgeDollarSign className="h-5 w-5 text-primary" />, title: t("states.empty.heading"), description: t("states.empty.note") }} ariaLabel={t("list.title")} caption={t("list.title")} />}</AdminOperationalListShell>;
}
