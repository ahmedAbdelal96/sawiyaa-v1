"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CircleDashed } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parsePositiveIntParam, parseTextParam } from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  useAdminAccountingReconciliationItems,
  useAdminAccountingReconciliationOverview,
  useUpdateAdminAccountingReconciliationReview,
} from "../hooks/use-admin-accounting";
import type {
  ReconciliationAnomalyCode,
  ReconciliationItem,
  ReconciliationQuery,
  ReconciliationReviewStatus,
  ReconciliationSourceType,
} from "../types/admin-accounting.types";

const REVIEW_STATUSES: ReconciliationReviewStatus[] = [
  "PENDING_REVIEW",
  "MATCHED",
  "MISMATCH",
  "MISSING_PROOF",
  "REQUIRES_ADJUSTMENT",
  "RESOLVED",
];

const SOURCE_TYPES: ReconciliationSourceType[] = [
  "PAYMENT_CAPTURED",
  "REFUND_SUCCEEDED",
  "PRACTITIONER_PAYOUT",
];

const ANOMALY_CODES: ReconciliationAnomalyCode[] = [
  "MISSING_JOURNAL_ENTRY",
  "MISSING_PAYOUT_PROOF",
  "AMOUNT_MISMATCH",
  "MISSING_VAT_SNAPSHOT",
  "MISSING_GATEWAY_FEE_SNAPSHOT",
  "MISSING_CANCELLATION_CONTEXT",
  "MISSING_TRANSFER_FEE_SNAPSHOT",
];

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatMoney(locale: string, value: string, currencyCode: string) {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || "0"));
}

function formatDateTime(locale: string, value: string) {
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.length <= 16 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function StatusChip({
  status,
  label,
}: {
  status: ReconciliationReviewStatus;
  label: string;
}) {
  const className =
    status === "MATCHED"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      : status === "RESOLVED"
        ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
        : status === "PENDING_REVIEW"
          ? "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300"
          : status === "MISSING_PROOF"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

export default function AdminAccountingReconciliationScreen() {
  const t = useTranslations("admin-accounting");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const from = parseTextParam(searchParams.get("from"), { maxLength: 40 });
  const to = parseTextParam(searchParams.get("to"), { maxLength: 40 });
  const sourceType = parseTextParam(searchParams.get("sourceType"), { maxLength: 60 }) as
    | ReconciliationSourceType
    | null;
  const status = parseTextParam(searchParams.get("status"), { maxLength: 60 }) as
    | ReconciliationReviewStatus
    | null;
  const anomalyCode = parseTextParam(searchParams.get("anomalyCode"), { maxLength: 80 }) as
    | ReconciliationAnomalyCode
    | null;
  const practitionerId = parseTextParam(searchParams.get("practitionerId"), { maxLength: 64 });
  const currencyCode = parseTextParam(searchParams.get("currencyCode"), { maxLength: 3 });
  const query = parseTextParam(searchParams.get("query"), { maxLength: 120 });

  const params: ReconciliationQuery = useMemo(
    () => ({
      page,
      limit,
      from: from || undefined,
      to: to || undefined,
      sourceType: sourceType || undefined,
      status: status || undefined,
      anomalyCode: anomalyCode || undefined,
      practitionerId: practitionerId || undefined,
      currencyCode: currencyCode || undefined,
      query: query || undefined,
    }),
    [anomalyCode, currencyCode, from, limit, page, practitionerId, query, sourceType, status, to],
  );

  const overviewQuery = useAdminAccountingReconciliationOverview(params);
  const itemsQuery = useAdminAccountingReconciliationItems(params);
  const updateReviewMutation = useUpdateAdminAccountingReconciliationReview(params);

  const [selectedItem, setSelectedItem] = useState<ReconciliationItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReconciliationReviewStatus>("PENDING_REVIEW");
  const [reviewNote, setReviewNote] = useState("");

  const updateQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const openReviewEditor = (item: ReconciliationItem) => {
    setSelectedItem(item);
    setReviewStatus(item.reviewStatus ?? item.effectiveStatus);
    setReviewNote(item.reviewNote ?? "");
  };

  const columns = useMemo<ColumnDef<ReconciliationItem>[]>(
    () => [
      {
        id: "source",
        header: t("reconciliation.table.source"),
        cell: (row) => (
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t(`common.sourceType.${row.sourceType}`)}
            </p>
            <p className="mt-1 font-mono text-xs text-text-muted">{shortId(row.sourceId)}</p>
          </div>
        ),
      },
      {
        id: "status",
        header: t("reconciliation.table.status"),
        cell: (row) => (
          <StatusChip
            status={row.effectiveStatus}
            label={t(`reconciliation.status.${row.effectiveStatus.toLowerCase()}`)}
          />
        ),
      },
      {
        id: "amounts",
        header: t("reconciliation.table.amount"),
        cell: (row) => (
          <div className="text-xs text-text-secondary">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {formatMoney(locale, row.operationalAmount, row.currencyCode)}
            </p>
            <p className="mt-1">
              {t("reconciliation.table.journalAmount")}:{" "}
              {row.journalAmount
                ? formatMoney(locale, row.journalAmount, row.currencyCode)
                : t("reconciliation.common.notAvailable")}
            </p>
          </div>
        ),
      },
      {
        id: "anomalies",
        header: t("reconciliation.table.anomalies"),
        cell: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.anomalies.length === 0 ? (
              <span className="text-xs text-text-muted">{t("reconciliation.common.none")}</span>
            ) : (
              row.anomalies.map((anomaly) => (
                <span
                  key={anomaly.code}
                  className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                >
                  {t(`reconciliation.anomaly.${anomaly.code.toLowerCase()}`)}
                </span>
              ))
            )}
          </div>
        ),
      },
      {
        id: "occurredAt",
        header: t("reconciliation.table.occurredAt"),
        cell: (row) => (
          <span className="text-sm text-text-secondary">{formatDateTime(locale, row.occurredAt)}</span>
        ),
        hideBelow: "lg",
      },
    ],
    [locale, t],
  );

  const overview = overviewQuery.data;
  const items = itemsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[30px] p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {t("reconciliation.eyebrow")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95 sm:text-3xl">
              {t("reconciliation.title")}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">{t("reconciliation.note")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => router.push("/admin/finance/ledger")}>
            {t("dashboard.actions.openLedger")}
          </Button>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          <article className="rounded-[22px] border border-border-light bg-white px-5 py-4 text-sm text-text-secondary shadow-sm dark:border-white/8 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("reconciliation.help.purposeTitle")}
            </p>
            <p className="mt-2 leading-6">{t("reconciliation.help.purposeNote")}</p>
          </article>
          <article className="rounded-[22px] border border-border-light bg-white px-5 py-4 text-sm text-text-secondary shadow-sm dark:border-white/8 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("reconciliation.help.howTitle")}
            </p>
            <ol className="mt-2 space-y-1.5 leading-6">
              <li>{t("reconciliation.help.steps.openRow")}</li>
              <li>{t("reconciliation.help.steps.pickStatus")}</li>
              <li>{t("reconciliation.help.steps.addNote")}</li>
              <li>{t("reconciliation.help.steps.openJournal")}</li>
            </ol>
          </article>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("reconciliation.filters.from")}
            </span>
            <input
              type="date"
              className="app-control w-full py-3"
              value={from?.slice(0, 10) ?? ""}
              onChange={(event) => updateQuery({ from: event.target.value || null, page: 1 })}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("reconciliation.filters.to")}
            </span>
            <input
              type="date"
              className="app-control w-full py-3"
              value={to?.slice(0, 10) ?? ""}
              onChange={(event) => updateQuery({ to: event.target.value || null, page: 1 })}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("reconciliation.filters.sourceType")}
            </span>
            <select
              value={sourceType ?? ""}
              className="app-control w-full py-3"
              onChange={(event) => updateQuery({ sourceType: event.target.value || null, page: 1 })}
            >
              <option value="">{t("reconciliation.filters.all")}</option>
              {SOURCE_TYPES.map((item) => (
                <option key={item} value={item}>
                  {t(`common.sourceType.${item}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("reconciliation.filters.status")}
            </span>
            <select
              value={status ?? ""}
              className="app-control w-full py-3"
              onChange={(event) => updateQuery({ status: event.target.value || null, page: 1 })}
            >
              <option value="">{t("reconciliation.filters.all")}</option>
              {REVIEW_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {t(`reconciliation.status.${item.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("reconciliation.filters.anomaly")}
            </span>
            <select
              value={anomalyCode ?? ""}
              className="app-control w-full py-3"
              onChange={(event) => updateQuery({ anomalyCode: event.target.value || null, page: 1 })}
            >
              <option value="">{t("reconciliation.filters.all")}</option>
              {ANOMALY_CODES.map((item) => (
                <option key={item} value={item}>
                  {t(`reconciliation.anomaly.${item.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("reconciliation.filters.currency")}
            </span>
            <input
              type="text"
              className="app-control w-full py-3 uppercase"
              value={currencyCode ?? ""}
              placeholder="EGP / USD"
              onChange={(event) => updateQuery({ currencyCode: event.target.value || null, page: 1 })}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("reconciliation.filters.query")}
            </span>
            <input
              type="text"
              className="app-control w-full py-3"
              value={query ?? ""}
              placeholder={t("reconciliation.filters.queryPlaceholder")}
              onChange={(event) => updateQuery({ query: event.target.value || null, page: 1 })}
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="app-panel rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t("reconciliation.kpi.total")}</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95">{overview?.totals.totalItems ?? 0}</p>
        </article>
        <article className="app-panel rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t("reconciliation.kpi.mismatch")}</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600 dark:text-rose-300">{overview?.totals.mismatch ?? 0}</p>
        </article>
        <article className="app-panel rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t("reconciliation.kpi.missingProof")}</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-300">{overview?.totals.missingProof ?? 0}</p>
        </article>
        <article className="app-panel rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t("reconciliation.kpi.resolved")}</p>
          <p className="mt-2 text-2xl font-semibold text-sky-700 dark:text-sky-300">{overview?.totals.resolved ?? 0}</p>
        </article>
      </section>

      {selectedItem ? (
        <section className="app-panel rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t("reconciliation.review.eyebrow")}</p>
              <h2 className="mt-1 text-lg font-semibold text-text-primary dark:text-white/95">
                {t("reconciliation.review.title", { id: shortId(selectedItem.sourceId) })}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedItem.journalEntryId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/finance/ledger/${selectedItem.journalEntryId}`)}
                >
                  {t("reconciliation.review.openJournal")}
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                {t("reconciliation.review.close")}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("reconciliation.review.fields.source")}
              </p>
              <p className="mt-1 font-semibold text-text-primary dark:text-white/95">
                {t(`common.sourceType.${selectedItem.sourceType}`)}
              </p>
              <p className="mt-1 font-mono text-xs text-text-muted">{selectedItem.sourceId}</p>
            </div>
            <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("reconciliation.review.fields.status")}
              </p>
              <div className="mt-2">
                <StatusChip
                  status={selectedItem.effectiveStatus}
                  label={t(`reconciliation.status.${selectedItem.effectiveStatus.toLowerCase()}`)}
                />
              </div>
            </div>
            <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("reconciliation.review.fields.operationalAmount")}
              </p>
              <p className="mt-1 font-semibold text-text-primary dark:text-white/95">
                {formatMoney(locale, selectedItem.operationalAmount, selectedItem.currencyCode)}
              </p>
              <p className="mt-1 text-xs text-text-muted">{selectedItem.currencyCode}</p>
            </div>
            <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("reconciliation.review.fields.journalAmount")}
              </p>
              <p className="mt-1 font-semibold text-text-primary dark:text-white/95">
                {selectedItem.journalAmount
                  ? formatMoney(locale, selectedItem.journalAmount, selectedItem.currencyCode)
                  : t("reconciliation.common.notAvailable")}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {t("reconciliation.review.fields.occurredAt")}: {formatDateTime(locale, selectedItem.occurredAt)}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm dark:border-white/8 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("reconciliation.review.fields.anomalies")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedItem.anomalies.length === 0 ? (
                <span className="text-sm text-text-muted">{t("reconciliation.common.none")}</span>
              ) : (
                selectedItem.anomalies.map((anomaly) => (
                  <span
                    key={anomaly.code}
                    className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                  >
                    {t(`reconciliation.anomaly.${anomaly.code.toLowerCase()}`)}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
            <select
              value={reviewStatus}
              onChange={(event) => setReviewStatus(event.target.value as ReconciliationReviewStatus)}
              className="app-control w-full py-3"
            >
              {REVIEW_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {t(`reconciliation.status.${item.toLowerCase()}`)}
                </option>
              ))}
            </select>
            <input
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              maxLength={1000}
              className="app-control w-full py-3"
              placeholder={t("reconciliation.review.notePlaceholder")}
            />
            <Button
              type="button"
              size="sm"
              disabled={updateReviewMutation.isPending}
              onClick={async () => {
                await updateReviewMutation.mutateAsync({
                  sourceType: selectedItem.sourceType,
                  sourceId: selectedItem.sourceId,
                  payload: {
                    status: reviewStatus,
                    note: reviewNote || undefined,
                  },
                });
                setSelectedItem(null);
              }}
            >
              {t("reconciliation.review.save")}
            </Button>
          </div>
        </section>
      ) : null}

      <article className="app-panel rounded-3xl p-5">
        <p className="mb-3 text-sm text-text-secondary">
          {t("reconciliation.table.tip")}
        </p>
        <DataTable
          data={items}
          columns={columns}
          getRowId={(row) => `${row.sourceType}-${row.sourceId}`}
          loading={itemsQuery.isLoading || overviewQuery.isLoading}
          error={itemsQuery.isError ? t("reconciliation.states.error") : null}
          onRowClick={(row) => openReviewEditor(row)}
          rowActionsHeader={t("reconciliation.table.action")}
          rowActions={(row) => (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => openReviewEditor(row)}>
                {t("reconciliation.actions.review")}
              </Button>
              {row.journalEntryId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(`/admin/finance/ledger/${row.journalEntryId}`)}
                >
                  {t("reconciliation.actions.journal")}
                </Button>
              ) : null}
            </div>
          )}
          pagination={
            itemsQuery.data
              ? {
                  page: itemsQuery.data.pagination.page,
                  limit: itemsQuery.data.pagination.limit,
                  total: itemsQuery.data.pagination.totalItems,
                  totalPages: itemsQuery.data.pagination.totalPages,
                  hasPrevPage: itemsQuery.data.pagination.page > 1,
                  hasNextPage:
                    itemsQuery.data.pagination.page <
                    itemsQuery.data.pagination.totalPages,
                }
              : undefined
          }
          onPageChange={(nextPage) => updateQuery({ page: nextPage })}
          onPageSizeChange={(nextLimit) => updateQuery({ limit: nextLimit, page: 1 })}
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
          emptyState={{
            icon: <CircleDashed className="h-5 w-5 text-primary" />,
            title: t("reconciliation.states.emptyTitle"),
            description: t("reconciliation.states.emptyNote"),
          }}
          ariaLabel={t("reconciliation.title")}
          caption={t("reconciliation.title")}
        />
      </article>

      {overview?.anomalies?.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {overview.anomalies.slice(0, 4).map((item) => (
            <article key={item.code} className="app-panel rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t(`reconciliation.anomaly.${item.code.toLowerCase()}`)}
              </p>
              <p className="mt-2 text-xl font-semibold text-text-primary dark:text-white/95">{item.count}</p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
