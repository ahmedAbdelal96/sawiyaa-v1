"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Search, WalletCards } from "lucide-react";
import { DataTable, buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam, parseTextParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import { formatPersonDisplayName, shortId } from "@/lib/person-name-cleaner";
import { useAdminPractitionerWallets } from "../hooks/use-admin-practitioner-payouts";
import type { AdminPractitionerWalletListItem, ListAdminPractitionerWalletsParams } from "../types/admin-practitioner-payouts.types";
import { Link } from "@/i18n/navigation";

const currencies = ["ALL", "EGP", "USD"] as const;
const sortValues = ["latestActivity:desc", "balance:desc", "balance:asc", "name:asc"] as const;
type SortValue = (typeof sortValues)[number];

function activityLabel(type: string | null, t: ReturnType<typeof useTranslations>) {
  if (type === "PRACTITIONER_EARNING") return t("balanceView.drawer.sessionEarning");
  if (type === "SETTLEMENT_PAYOUT") return t("balanceView.drawer.settlementPayout");
  return type ? t("balanceView.drawer.recorded") : "-";
}

export default function AdminPractitionerPayoutsListScreen() {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, { min: 1, max: 100 });
  const search = parseTextParam(searchParams.get("search"), { maxLength: 120 });
  const currency = parseEnumParam<(typeof currencies)[number]>(searchParams.get("currency"), currencies, "ALL");
  const sort = parseEnumParam<SortValue>(searchParams.get("sort"), sortValues, "latestActivity:desc");
  const [sortBy, sortDirection] = sort.split(":") as ["latestActivity" | "balance" | "name", "asc" | "desc"];
  const params = useMemo<ListAdminPractitionerWalletsParams>(() => ({ page, limit, search: search || undefined, currencyCode: currency === "ALL" ? undefined : currency, sortBy, sortDirection }), [currency, limit, page, search, sortBy, sortDirection]);
  const wallets = useAdminPractitionerWallets(params);
  const data = wallets.data;
  const update = (values: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), values);
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  };
  const hasReference = Boolean(data?.items.some(item => item.practitionerReference));
  const columns = useMemo<ColumnDef<AdminPractitionerWalletListItem>[]>(() => {
    const result: ColumnDef<AdminPractitionerWalletListItem>[] = [
      {
        id: "practitioner",
        header: t("balanceView.columns.practitioner"),
        cell: row => {
          const isAr = locale.startsWith("ar");
          const name = formatPersonDisplayName(row.practitionerName, row.practitionerReference, isAr ? "الممارس" : "Practitioner");
          const email = row.practitionerEmail && !row.practitionerEmail.includes(row.practitionerReference ?? "") ? row.practitionerEmail : null;
          return (
            <div className="space-y-0.5 min-w-0">
              <p className="font-bold text-xs text-text-primary dark:text-white/95 truncate">{name}</p>
              {email && <p className="text-[11px] text-text-muted truncate">{email}</p>}
            </div>
          );
        },
      },
    ];
    if (hasReference) {
      result.push({
        id: "code",
        header: t("balanceView.columns.code"),
        cell: row => (
          <span className="font-mono text-xs font-semibold text-primary dark:text-primary-light" dir="ltr">
            {shortId(row.practitionerReference, 14, 4)}
          </span>
        ),
      });
    }
    result.push(
      { id: "currency", header: t("balanceView.columns.currency"), cell: row => <span className="font-mono text-xs">{row.currencyCode}</span> },
      { id: "available", header: t("balanceView.columns.available"), cell: row => <span className="font-semibold tabular-nums">{Number(row.availableBalance).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 2 })}</span> },
      { id: "credited", header: t("balanceView.columns.credited"), cell: row => <span className="tabular-nums">{Number(row.totalCredited).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 2 })}</span> },
      { id: "transferred", header: t("balanceView.columns.transferred"), cell: row => <span className="tabular-nums">{Number(row.totalExternallyTransferred).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 2 })}</span> },
      { id: "activity", header: t("balanceView.columns.activity"), cell: row => <div><p className="text-sm">{activityLabel(row.latestActivityType, t)}</p><p className="text-xs text-text-muted">{row.latestActivityAt ? formatSettlementDateTime(locale, row.latestActivityAt) : "-"}</p></div> },
      { id: "updated", header: t("balanceView.columns.updated"), cell: row => formatSettlementDateTime(locale, row.updatedAt) },
      {
        id: "actions",
        header: t("balanceView.columns.actions"),
        cell: (row) => (
          <Link
            href={`/admin/practitioner-payouts/${row.walletId}`}
            className="app-btn-primary text-xs px-3 py-1"
          >
            {t("balanceView.viewDetails")}
          </Link>
        ),
      },
    );
    return result;
  }, [hasReference, locale, t]);
  const hasFilters = Boolean(search) || currency !== "ALL" || sort !== "latestActivity:desc";
  return (
    <>
      <AdminOperationalListShell
        headerVariant="financial"
        eyebrow={t("balanceView.eyebrow")}
        title={t("balanceView.title")}
        description={t("balanceView.description")}
        summaryCards={<AdminSummaryCard label={t("balanceView.title")} value={data?.pagination.totalItems ?? "…"} tone="primary" icon={<WalletCards className="h-4 w-4" />} />}
        filters={
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="mb-1 block text-[11px] font-bold text-text-muted">{t("balanceView.searchLabel")}</span>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input className="app-control w-full px-8.5 py-1.5" value={search} onChange={(event) => update({ search: event.target.value || null, page: 1 })} placeholder={t("balanceView.searchPlaceholder")} />
              </div>
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-bold text-text-muted">{t("balanceView.currency")}</span>
              <select className="app-control w-full px-3 py-1.5" value={currency} onChange={(event) => update({ currency: event.target.value === "ALL" ? null : event.target.value, page: 1 })}>
                <option value="ALL">{t("balanceView.allCurrencies")}</option>
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-bold text-text-muted">{t("balanceView.sort")}</span>
              <select className="app-control w-full px-3 py-1.5" value={sort} onChange={(event) => update({ sort: event.target.value === "latestActivity:desc" ? null : event.target.value, page: 1 })}>
                <option value="latestActivity:desc">{t("balanceView.sortLatest")}</option>
                <option value="balance:desc">{t("balanceView.sortHighest")}</option>
                <option value="balance:asc">{t("balanceView.sortLowest")}</option>
                <option value="name:asc">{t("balanceView.sortName")}</option>
              </select>
            </label>
            <div className="flex items-end">
              <button type="button" disabled={!hasFilters} className="rounded-xl border border-border-light px-3 py-1.5 text-xs font-semibold disabled:opacity-50" onClick={() => update({ search: null, currency: null, sort: null, page: 1 })}>
                {locale === "ar" ? "مسح الفلاتر" : "Clear filters"}
              </button>
            </div>
          </div>
        }
      >
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.walletId}
          loading={wallets.isLoading}
          error={wallets.isError ? t("balanceView.error") : null}
          pagination={data ? { page: data.pagination.page, limit: data.pagination.limit, total: data.pagination.totalItems, totalPages: data.pagination.totalPages, hasPrevPage: page > 1, hasNextPage: page < data.pagination.totalPages } : undefined}
          onPageChange={(next) => update({ page: next })}
          onPageSizeChange={(next) => update({ limit: next, page: 1 })}
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
          onRowClick={(row) => router.push(`/admin/practitioner-payouts/${row.walletId}` as never)}
          emptyState={{ title: t("balanceView.emptyTitle"), description: t("balanceView.emptyDescription") }}
          ariaLabel={t("balanceView.title")}
        />
      </AdminOperationalListShell>
    </>
  );
}
