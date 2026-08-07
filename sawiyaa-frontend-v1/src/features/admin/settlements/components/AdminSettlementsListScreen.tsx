"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { ClipboardList, Eye, Search } from "lucide-react";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import { DataTable, buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam, parseTextParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import { useAdminSettlements } from "../hooks/use-admin-settlements";
import type { ListAdminSettlementsParams, SettlementListItem, SettlementStatus } from "../types/admin-settlements.types";
import SettlementStatusBadge from "./SettlementStatusBadge";
import DateField from "@/components/form/input/DateField";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdminSessionReference from "@/components/shared/admin/AdminSessionReference";

const queueStatuses = ["UNDER_REVIEW", "CREDITED", "PAID_OUT", "REJECTED", "ALL"] as const;
type QueueStatus = (typeof queueStatuses)[number];
const sortValues = ["createdAt:desc", "createdAt:asc", "amount:desc", "amount:asc", "practitionerName:asc"] as const;
type SortValue = (typeof sortValues)[number];

export default function AdminSettlementsListScreen() {
  const t = useTranslations("admin-settlements");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, { min: 1, max: 100 });
  const status = parseEnumParam<QueueStatus>(searchParams.get("status"), queueStatuses, "UNDER_REVIEW");
  const query = parseTextParam(searchParams.get("query"), { maxLength: 120 });
  const currency = parseEnumParam<"ALL" | "EGP" | "USD">(searchParams.get("currency"), ["ALL", "EGP", "USD"], "ALL");
  const createdFrom = parseTextParam(searchParams.get("createdFrom"), { maxLength: 32 });
  const createdTo = parseTextParam(searchParams.get("createdTo"), { maxLength: 32 });
  const sortValue = parseEnumParam<SortValue>(searchParams.get("sort"), sortValues, "createdAt:desc");
  const [sortBy, sortDirection] = sortValue.split(":") as ["createdAt" | "amount" | "practitionerName", "asc" | "desc"];
  const params = useMemo<ListAdminSettlementsParams>(() => ({ page, limit, query: query || undefined, status: status === "ALL" ? undefined : status as SettlementStatus, currency: currency === "ALL" ? undefined : currency, createdFrom: createdFrom || undefined, createdTo: createdTo || undefined, sortBy, sortDirection }), [createdFrom, createdTo, currency, limit, page, query, sortBy, sortDirection, status]);
  const settlements = useAdminSettlements(params);
  const data = settlements.data;
  const update = (values: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), values);
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  };
  const columns = useMemo<ColumnDef<SettlementListItem>[]>(() => [
    { id: "sessionCode", header: t("table.sessionCode"), cell: row => <div><AdminSessionReference sessionId={row.session?.id} sessionCode={row.session?.sessionCode} href={row.session?.id ? `/admin/sessions/runtime-inspection?sessionId=${row.session.id}` : undefined} variant="table" copyable /><p className="text-xs text-text-muted">{row.session?.type ?? "-"}</p></div> },
    { id: "practitioner", header: t("table.practitioner"), cell: row => <div><p className="font-semibold text-text-primary dark:text-white/95">{row.practitioner.name ?? "-"}</p><p className="text-xs text-text-muted">{row.practitioner.country ?? "-"}</p></div> },
    { id: "patient", header: t("table.patient"), cell: row => row.session?.patientName ?? "-" },
    { id: "sessionEndedAt", header: t("table.sessionEndedAt"), cell: row => row.session?.date ? formatSettlementDateTime(locale, row.session.date) : "-" },
    { id: "customerPayment", header: t("table.customerPayment"), cell: row => <div className="tabular-nums"><span>{formatSettlementMoney(locale, row.originalAmount ?? "0", row.originalCurrency)}</span>{row.originalCurrency !== row.walletCurrencyCode ? <span className="ms-2 text-[10px] text-text-muted" title={`${row.originalCurrency} → ${row.walletCurrencyCode}`}>{row.originalCurrency} → {row.walletCurrencyCode}</span> : null}</div> },
    { id: "practitionerAmount", header: t("table.practitionerAmount"), cell: row => <strong className="tabular-nums">{formatSettlementMoney(locale, row.finalWalletCredit ?? "0", row.walletCurrencyCode)}</strong> },
    { id: "status", header: t("table.status"), cell: row => <SettlementStatusBadge status={row.status} /> },
    { id: "updatedAt", header: t("table.lastUpdated"), cell: row => formatSettlementDateTime(locale, row.updatedAt) },
  ], [locale, t]);
  const hasFilters = Boolean(query) || currency !== "ALL" || Boolean(createdFrom) || Boolean(createdTo) || sortValue !== "createdAt:desc";
  const tabs = <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("tabs.label")}>{queueStatuses.map(value => <button key={value} type="button" role="tab" aria-selected={status === value} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${status === value ? "border-primary bg-primary text-white" : "border-border-light bg-surface-primary text-text-secondary hover:border-primary/40"}`} onClick={() => update({ status: value === "ALL" ? null : value, page: 1 })}>{t(`tabs.${value}` as Parameters<typeof t>[0])}</button>)}</div>;
  const filters = <div className="space-y-3"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label><span className="mb-2 block text-xs font-semibold text-text-muted">{t("filters.search")}</span><div className="relative"><Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><input className="app-control w-full px-11 py-3" value={query} onChange={e => update({ query: e.target.value || null, page: 1 })} placeholder={t("filters.searchPlaceholder")} /></div></label><label><span className="mb-2 block text-xs font-semibold text-text-muted">{t("filters.currency")}</span><select className="app-control w-full px-4 py-3" value={currency} onChange={e => update({ currency: e.target.value === "ALL" ? null : e.target.value, page: 1 })}><option value="ALL">{t("filters.allCurrencies")}</option><option value="EGP">EGP</option><option value="USD">USD</option></select></label><DateField label={t("filters.fromDate")} value={createdFrom} onChange={value => update({ createdFrom: value || null, page: 1 })} /><DateField label={t("filters.toDate")} value={createdTo} onChange={value => update({ createdTo: value || null, page: 1 })} /></div><div className="flex items-center justify-end gap-3"><label><span className="me-2 text-xs font-semibold text-text-muted">{t("filters.sort")}</span><select className="app-control px-3 py-2" value={sortValue} onChange={e => update({ sort: e.target.value === "createdAt:desc" ? null : e.target.value, page: 1 })}>{sortValues.map(value => <option key={value} value={value}>{t(`filters.sortOptions.${value.replace(":", "_")}` as Parameters<typeof t>[0])}</option>)}</select></label><FilterClearButton disabled={!hasFilters} onClick={() => update({ query: null, currency: null, createdFrom: null, createdTo: null, sort: null, page: 1 })} /></div></div>;
  const emptyKey = status === "UNDER_REVIEW" ? "emptyNeedsReview" : status === "CREDITED" ? "emptyCredited" : status === "PAID_OUT" ? "emptyTransferred" : status === "REJECTED" ? "emptyRejected" : "emptyAll";
  return <AdminOperationalListShell headerVariant="financial" eyebrow={t("eyebrow")} title={t("title")} description={t("description")} filters={<div className="space-y-4">{tabs}{filters}</div>}><DataTable data={data?.items ?? []} columns={columns} getRowId={row => row.id} getRowClassName={row => row.status === "UNDER_REVIEW" ? "bg-warning-50/40 dark:bg-warning-900/10" : ""} loading={settlements.isLoading} error={settlements.isError ? t("states.error") : null} rowActionsHeader={t("table.actions")} rowActions={row => <Button size="sm" variant={row.status === "UNDER_REVIEW" ? "primary" : "outline"} startIcon={<Eye className="h-4 w-4" />} onClick={() => router.push(`/admin/settlements/${row.id}`)}>{row.status === "UNDER_REVIEW" ? t("actions.reviewSettlement") : t("actions.viewDetails")}</Button>} pagination={data ? { page: data.pagination.page, limit: data.pagination.limit, total: data.pagination.totalItems, totalPages: data.pagination.totalPages, hasPrevPage: page > 1, hasNextPage: page < data.pagination.totalPages } : undefined} onPageChange={nextPage => update({ page: nextPage })} onPageSizeChange={nextLimit => update({ limit: nextLimit, page: 1 })} pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS} emptyState={{ icon: <ClipboardList className="h-5 w-5 text-primary" />, title: t(`states.${emptyKey}.title` as Parameters<typeof t>[0]), description: t(`states.${emptyKey}.description` as Parameters<typeof t>[0]) }} ariaLabel={t("title")} /></AdminOperationalListShell>;
}
