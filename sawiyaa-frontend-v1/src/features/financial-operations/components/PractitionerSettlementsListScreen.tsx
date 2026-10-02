"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
import { DataTable, buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam, parseTextParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import DateField from "@/components/form/input/DateField";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { PractitionerPageHeader, PractitionerFilterCard, PractitionerTableSection } from "@/components/shared/practitioner/PractitionerWorkspaceKit";
import { formatMoney } from "@/lib/finance-format";
import { formatPractitionerOrViewerDateTime } from "@/lib/time-formatting";
import { getPractitionerSettlementsErrorKey } from "../lib/financial-operations-errors";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import { usePractitionerSettlements } from "../hooks/use-financial-operations";
import type { PractitionerSettlementItem, PractitionerSettlementListParams, PractitionerSettlementStatus } from "../types/financial-operations.types";
import SessionCodeReference from "@/components/shared/SessionCodeReference";

const STATUS_FILTERS: Array<PractitionerSettlementStatus | "ALL"> = ["ALL", "UNDER_REVIEW", "APPROVED", "REJECTED", "CREDITED", "PAID_OUT"];

function money(locale: string, amount: string, currency: string) {
  return formatMoney(locale === "ar" ? "ar-EG" : "en-US", amount, currency);
}

function date(locale: string, value: string | null) {
  return value ? formatPractitionerOrViewerDateTime(value, null, { locale: locale === "ar" ? "ar-EG" : "en-US", fallbackText: "-" }) : "-";
}

export default function PractitionerSettlementsListScreen() {
  const t = useTranslations("practitioner-finance");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileQuery = usePractitionerProfile();
  const status = parseEnumParam<PractitionerSettlementStatus | "ALL">(searchParams.get("status"), STATUS_FILTERS, "ALL");
  const currency = parseTextParam(searchParams.get("currencyCode"), { maxLength: 8 });
  const createdFrom = parseTextParam(searchParams.get("createdFrom"), { maxLength: 32 });
  const createdTo = parseTextParam(searchParams.get("createdTo"), { maxLength: 32 });
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, { min: 1, max: 40 });
  const updateQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    router.push(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
  };
  const params = useMemo<PractitionerSettlementListParams>(() => ({ page, limit, status: status === "ALL" ? undefined : status, currencyCode: currency || undefined, createdFrom: createdFrom || undefined, createdTo: createdTo || undefined }), [createdFrom, createdTo, currency, limit, page, status]);
  const query = usePractitionerSettlements(params);
  const timeZone = profileQuery.data?.profile.timezone ?? null;
  const columns = useMemo<ColumnDef<PractitionerSettlementItem>[]>(() => [
    { id: "session", header: t("ui.session"), cell: (row) => <div><SessionCodeReference sessionId={row.sessionId ?? ""} sessionCode={row.sessionCode} copyable /><p className="text-xs text-text-muted">{row.sessionType ?? "-"}</p></div> },
    { id: "date", header: t("ui.date"), cell: (row) => date(locale, row.date) },
    { id: "amount", header: t("ui.addedToEarnings"), cell: (row) => <strong>{money(locale, row.amountAdded, row.currency)}</strong> },
    { id: "currency", header: t("ui.currency"), cell: (row) => row.currency },
    { id: "status", header: t("ui.settlementStatus"), cell: (row) => <span className="app-chip">{t(`settlements.statuses.${row.status}` as Parameters<typeof t>[0])}</span> },
    { id: "payoutStatus", header: t("ui.payoutStatus"), cell: (row) => <span className="app-chip">{t(`settlements.payoutStatuses.${row.payoutStatus}` as Parameters<typeof t>[0])}</span> },
  ], [locale, t]);
  return <div className="space-y-4">
    <PractitionerPageHeader eyebrow={t("settlements.eyebrow")} title={t("settlements.title")} description={t("settlements.note")} />
    <PractitionerFilterCard title={t("ui.historyFilters")}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select className="app-control w-full" value={status} onChange={(e) => updateQuery({ status: e.target.value === "ALL" ? null : e.target.value, page: 1 })}>{STATUS_FILTERS.map((value) => <option key={value} value={value}>{value === "ALL" ? t("ui.allStatuses") : t(`settlements.statuses.${value}` as Parameters<typeof t>[0])}</option>)}</select>
        <input className="app-control w-full" value={currency} onChange={(e) => updateQuery({ currencyCode: e.target.value || null, page: 1 })} placeholder="EGP / USD" />
        <DateField label={t("ui.fromDate")} value={createdFrom} onChange={(value) => updateQuery({ createdFrom: value || null, page: 1 })} />
        <DateField label={t("ui.toDate")} value={createdTo} onChange={(value) => updateQuery({ createdTo: value || null, page: 1 })} />
        <div className="md:col-span-2 xl:col-span-4 flex justify-end"><FilterClearButton disabled={!status && !currency && !createdFrom && !createdTo && page === 1} onClick={() => updateQuery({ status: null, currencyCode: null, createdFrom: null, createdTo: null, page: 1 })} /></div>
      </div>
    </PractitionerFilterCard>
    <PractitionerTableSection flushContent><DataTable data={query.data?.items ?? []} columns={columns} getRowId={(row) => row.sessionId ?? `${row.date}-${row.amountAdded}`} loading={query.isLoading} error={query.isError ? t(getPractitionerSettlementsErrorKey(query.error)) : null} errorState={{ title: t("settlements.states.error.heading"), description: t(getPractitionerSettlementsErrorKey(query.error)), action: { label: t("settlements.states.error.retry"), onClick: () => query.refetch() } }} emptyState={{ icon: <Layers className="h-5 w-5 text-primary" />, title: t("settlements.states.empty.heading"), description: t("settlements.states.empty.note") }} pagination={query.data ? { page: query.data.pagination.page, limit: query.data.pagination.limit, total: query.data.pagination.totalItems, totalPages: query.data.pagination.totalPages, hasPrevPage: page > 1, hasNextPage: page < query.data.pagination.totalPages } : undefined} onPageChange={(next) => updateQuery({ page: next })} onPageSizeChange={(next) => updateQuery({ limit: next, page: 1 })} pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS} ariaLabel={t("settlements.title")} caption={timeZone ? `${t("settlements.title")} · ${timeZone}` : t("settlements.title")} size="sm" /></PractitionerTableSection>
  </div>;
}
