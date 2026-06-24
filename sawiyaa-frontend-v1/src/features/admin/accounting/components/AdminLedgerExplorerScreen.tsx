"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BookOpenText, Download } from "lucide-react";
import {
  DataTable,
  buildUpdatedSearchParams,
  parsePositiveIntParam,
  parseTextParam,
  type ColumnDef,
} from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import Button from "@/components/ui/button/Button";
import { parseDownloadFilename, triggerBlobDownload } from "@/lib/downloads/file-download";
import type { LedgerExplorerQuery, LedgerExplorerRow } from "../types/admin-accounting.types";
import {
  useAdminLedgerAccountOptions,
  useAdminLedgerEntries,
  useDownloadAdminLedgerEntriesCsv,
} from "../hooks/use-admin-accounting";

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatDateTime(locale: string, value: string) {
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(locale: string, value: string, currencyCode: string) {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || "0"));
}

function shortId(value: string) {
  return value.length <= 16 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

const SOURCE_TYPE_OPTIONS = ["PAYMENT_CAPTURED", "REFUND_SUCCEEDED", "PRACTITIONER_PAYOUT"] as const;

export default function AdminLedgerExplorerScreen() {
  const t = useTranslations("admin-accounting");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const query = parseTextParam(searchParams.get("query"), { maxLength: 120 });
  const practitionerId = parseTextParam(searchParams.get("practitionerId"), { maxLength: 64 });
  const currencyCode = parseTextParam(searchParams.get("currencyCode"), { maxLength: 3 });
  const ledgerAccountId = parseTextParam(searchParams.get("ledgerAccountId"), { maxLength: 64 });
  const journalEntryId = parseTextParam(searchParams.get("journalEntryId"), { maxLength: 64 });
  const from = parseTextParam(searchParams.get("from"), { maxLength: 40 });
  const to = parseTextParam(searchParams.get("to"), { maxLength: 40 });
  const sourceTypeRaw = searchParams.get("sourceType");
  const sourceType = SOURCE_TYPE_OPTIONS.includes(
    sourceTypeRaw as (typeof SOURCE_TYPE_OPTIONS)[number],
  )
    ? (sourceTypeRaw as (typeof SOURCE_TYPE_OPTIONS)[number])
    : undefined;

  const params = useMemo<LedgerExplorerQuery>(
    () => ({
      page,
      limit,
      query: query || undefined,
      practitionerId: practitionerId || undefined,
      currencyCode: currencyCode || undefined,
      ledgerAccountId: ledgerAccountId || undefined,
      journalEntryId: journalEntryId || undefined,
      from: from || undefined,
      to: to || undefined,
      sourceType,
    }),
    [currencyCode, from, journalEntryId, ledgerAccountId, limit, page, practitionerId, query, sourceType, to],
  );

  const ledgerQuery = useAdminLedgerEntries(params);
  const accountOptionsQuery = useAdminLedgerAccountOptions(currencyCode || undefined);
  const ledgerData = ledgerQuery.data;
  const accountOptions = accountOptionsQuery.data?.items ?? [];
  const ledgerExportMutation = useDownloadAdminLedgerEntriesCsv();

  const hasFilters = Boolean(
    query ||
      practitionerId ||
      currencyCode ||
      ledgerAccountId ||
      journalEntryId ||
      from ||
      to ||
      sourceType,
  );

  const updateQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const handleExportLedger = async () => {
    const exported = await ledgerExportMutation.mutateAsync(params);
    const fileName = parseDownloadFilename(
      exported.fileNameHeader,
      "admin-ledger-export.csv",
    );
    triggerBlobDownload(exported.blob, fileName);
  };

  const columns = useMemo<ColumnDef<LedgerExplorerRow>[]>(
    () => [
      {
        id: "occurredAt",
        header: t("ledger.columns.occurredAt"),
        accessor: (row) => new Date(row.occurredAt).getTime(),
        cell: (row) => (
          <div>
            <p className="text-sm font-medium text-text-primary dark:text-white/95">
              {formatDateTime(locale, row.occurredAt)}
            </p>
            <p className="mt-1 font-mono text-xs text-text-muted">
              {t("ledger.columns.entryId", { value: shortId(row.journalEntryId) })}
            </p>
          </div>
        ),
      },
      {
        id: "account",
        header: t("ledger.columns.account"),
        accessor: (row) => `${row.ledgerAccountCode} ${row.ledgerAccountName}`,
        cell: (row) => (
          <div>
            <p className="font-semibold text-text-primary dark:text-white/95">{row.ledgerAccountName}</p>
            <p className="mt-1 font-mono text-xs text-text-muted">{row.ledgerAccountCode}</p>
          </div>
        ),
      },
      {
        id: "source",
        header: t("ledger.columns.source"),
        accessor: (row) => row.sourceType,
        cell: (row) => (
          <div>
            <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-text-brand dark:bg-primary/15 dark:text-primary-light">
              {t(`common.sourceType.${row.sourceType}`)}
            </span>
            <p className="mt-1 font-mono text-xs text-text-muted">{shortId(row.sourceId)}</p>
          </div>
        ),
      },
      {
        id: "direction",
        header: t("ledger.columns.direction"),
        accessor: (row) => row.direction,
        cell: (row) => (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              row.direction === "DEBIT"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                : "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
            }`}
          >
            {t(`common.direction.${row.direction}`)}
          </span>
        ),
      },
      {
        id: "amount",
        header: t("ledger.columns.amount"),
        accessor: (row) => Number(row.amount),
        cell: (row) => formatMoney(locale, row.amount, row.currencyCode),
      },
      {
        id: "reference",
        header: t("ledger.columns.reference"),
        accessor: (row) => row.referenceId ?? row.memo ?? "",
        cell: (row) => (
          <div>
            <p className="text-sm text-text-secondary">{row.referenceType ?? "-"}</p>
            <p className="mt-1 font-mono text-xs text-text-muted">
              {row.referenceId ? shortId(row.referenceId) : "-"}
            </p>
          </div>
        ),
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[30px] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {t("ledger.eyebrow")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95 sm:text-3xl">
              {t("ledger.title")}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">{t("ledger.note")}</p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {ledgerData
              ? t("ledger.count", { value: ledgerData.pagination.totalItems })
              : t("ledger.countLoading")}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("ledger.filters.query")}
            </span>
            <input
              type="text"
              value={query}
              className="app-control w-full py-3"
              placeholder={t("ledger.filters.queryPlaceholder")}
              onChange={(event) => updateQuery({ query: event.target.value || null, page: 1 })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("ledger.filters.account")}
            </span>
            <select
              className="app-control w-full py-3"
              value={ledgerAccountId}
              onChange={(event) => updateQuery({ ledgerAccountId: event.target.value || null, page: 1 })}
            >
              <option value="">{t("ledger.filters.all")}</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {`${account.code} - ${account.name}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("ledger.filters.sourceType")}
            </span>
            <select
              className="app-control w-full py-3"
              value={sourceType ?? ""}
              onChange={(event) => updateQuery({ sourceType: event.target.value || null, page: 1 })}
            >
              <option value="">{t("ledger.filters.all")}</option>
              {SOURCE_TYPE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`common.sourceType.${value}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("ledger.filters.practitionerId")}
            </span>
            <input
              type="text"
              value={practitionerId}
              className="app-control w-full py-3"
              placeholder={t("ledger.filters.practitionerPlaceholder")}
              onChange={(event) => updateQuery({ practitionerId: event.target.value || null, page: 1 })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("ledger.filters.currency")}
            </span>
            <input
              type="text"
              value={currencyCode}
              className="app-control w-full py-3 uppercase"
              placeholder={t("ledger.filters.currencyPlaceholder")}
              onChange={(event) => updateQuery({ currencyCode: event.target.value || null, page: 1 })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("ledger.filters.from")}
            </span>
            <input
              type="date"
              value={from ? from.slice(0, 10) : ""}
              className="app-control w-full py-3"
              onChange={(event) => updateQuery({ from: event.target.value || null, page: 1 })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("ledger.filters.to")}
            </span>
            <input
              type="date"
              value={to ? to.slice(0, 10) : ""}
              className="app-control w-full py-3"
              onChange={(event) => updateQuery({ to: event.target.value || null, page: 1 })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("ledger.filters.journalEntryId")}
            </span>
            <input
              type="text"
              value={journalEntryId}
              className="app-control w-full py-3"
              placeholder={t("ledger.filters.journalEntryPlaceholder")}
              onChange={(event) => updateQuery({ journalEntryId: event.target.value || null, page: 1 })}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            startIcon={<Download className="h-4 w-4" />}
            onClick={handleExportLedger}
            disabled={ledgerExportMutation.isPending}
          >
            {ledgerExportMutation.isPending
              ? t("ledger.actions.exporting")
              : t("ledger.actions.exportCsv")}
          </Button>
          <FilterClearButton
            disabled={!hasFilters}
            onClick={() =>
              updateQuery({
                query: null,
                practitionerId: null,
                currencyCode: null,
                ledgerAccountId: null,
                journalEntryId: null,
                sourceType: null,
                from: null,
                to: null,
                page: 1,
              })
            }
          />
        </div>
      </section>

      <DataTable
        data={ledgerData?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={ledgerQuery.isLoading}
        error={ledgerQuery.isError ? t("ledger.states.error") : null}
        emptyState={{
          icon: <BookOpenText className="h-5 w-5 text-primary" />,
          title: t("ledger.states.emptyTitle"),
          description: t("ledger.states.emptyNote"),
        }}
        onRowClick={(row) => router.push(`/admin/finance/ledger/${row.journalEntryId}` as never)}
        pagination={
          ledgerData
            ? {
                page: ledgerData.pagination.page,
                limit: ledgerData.pagination.limit,
                total: ledgerData.pagination.totalItems,
                totalPages: ledgerData.pagination.totalPages,
                hasPrevPage: ledgerData.pagination.page > 1,
                hasNextPage: ledgerData.pagination.page < ledgerData.pagination.totalPages,
              }
            : undefined
        }
        onPageChange={(nextPage) => updateQuery({ page: nextPage })}
        onPageSizeChange={(nextLimit) => updateQuery({ page: 1, limit: nextLimit })}
        pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
        ariaLabel={t("ledger.title")}
        caption={t("ledger.title")}
      />
    </div>
  );
}
