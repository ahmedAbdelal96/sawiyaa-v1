"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Layers } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { getPractitionerSettlementsErrorKey } from "../lib/financial-operations-errors";
import { usePractitionerSettlements } from "../hooks/use-financial-operations";
import type {
  PractitionerSettlementItem,
  PractitionerSettlementListParams,
  PractitionerSettlementStatus,
} from "../types/financial-operations.types";

const STATUS_FILTERS: Array<PractitionerSettlementStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "READY",
  "PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
];

const STATUS_STYLES: Record<PractitionerSettlementStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
  READY: "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  PROCESSING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  CANCELLED: "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-white/60",
};

function formatMoney(value: string, currency: string, locale: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return `${value} ${currency}`;

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatId(value: string) {
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function getStatusTone(status: PractitionerSettlementStatus) {
  return STATUS_STYLES[status] ?? "app-chip";
}

function SettlementRow({
  settlement,
  locale,
  t,
}: {
  settlement: PractitionerSettlementItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="app-panel w-full rounded-[28px] p-5 text-start">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(settlement.status)}`}>
              {t(`settlements.statuses.${settlement.status}` as Parameters<typeof t>[0])}
            </span>
            <span className="app-chip rounded-full px-2.5 py-1 text-xs font-medium">
              {settlement.currency}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-text-primary dark:text-white/95">
            {formatMoney(settlement.amountNet, settlement.currency, locale)}
            <span className="text-xs font-medium text-text-muted">
              {t("settlements.fields.net")}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
            <span>
              {t("settlements.fields.gross")}:{" "}
              {formatMoney(settlement.amountGross, settlement.currency, locale)}
            </span>
            <span>
              {t("settlements.fields.adjustments")}:{" "}
              {formatMoney(settlement.amountAdjustments, settlement.currency, locale)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
            <span>
              {t("settlements.fields.createdAt")}: {formatDate(settlement.createdAt, locale)}
            </span>
            <span>
              {t("settlements.fields.paidAt")}: {formatDate(settlement.paidAt, locale)}
            </span>
            <span>
              {t("settlements.fields.failedAt")}: {formatDate(settlement.failedAt, locale)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary">
            <span>
              {t("settlements.fields.batch")}:{" "}
              <span className="font-mono text-text-primary dark:text-white/90">
                {formatId(settlement.batchId)}
              </span>
            </span>
            <span>
              {t("settlements.fields.reference")}:{" "}
              <span className="font-mono text-text-primary dark:text-white/90">
                {settlement.externalPayoutRef ? formatId(settlement.externalPayoutRef) : "-"}
              </span>
            </span>
          </div>

          {settlement.notes ? (
            <p className="mt-3 text-xs text-text-secondary">
              {t("settlements.fields.notes")}: {settlement.notes}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PractitionerSettlementsListScreen() {
  const t = useTranslations("practitioner-finance");
  const locale = useLocale();
  const [statusFilter, setStatusFilter] = useState<PractitionerSettlementStatus | "ALL">(
    "ALL",
  );
  const [page, setPage] = useState(1);

  const params = useMemo<PractitionerSettlementListParams>(() => {
    const next: PractitionerSettlementListParams = { page, limit: DEFAULT_PAGE_LIMIT };
    if (statusFilter !== "ALL") next.status = statusFilter;
    return next;
  }, [page, statusFilter]);

  const settlementsQuery = usePractitionerSettlements(params);
  const data = settlementsQuery.data;

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("settlements.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("settlements.title")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
              {t("settlements.note")}
            </p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {data
              ? t("settlements.count", { value: data.pagination.totalItems })
              : t("settlements.countLoading")}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("settlements.scopeHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
              <li>{t("settlements.scopeItems.history")}</li>
              <li>{t("settlements.scopeItems.statuses")}</li>
              <li>{t("settlements.scopeItems.amounts")}</li>
            </ul>
          </div>

          <div className="rounded-[24px] border border-border-light bg-surface-primary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("settlements.boundaryHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
              <li>{t("settlements.boundaryItems.noPayouts")}</li>
              <li>{t("settlements.boundaryItems.noLedger")}</li>
              <li>{t("settlements.boundaryItems.noAdjustments")}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("settlements.filters.allStatuses")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as PractitionerSettlementStatus | "ALL");
                setPage(1);
              }}
              className="app-control w-full px-4 py-3"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL"
                    ? t("settlements.filters.allStatuses")
                    : t(`settlements.statuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end justify-end">
            <FilterClearButton
              disabled={statusFilter === "ALL" && page === 1}
              onClick={() => {
                setStatusFilter("ALL");
                setPage(1);
              }}
            />
          </div>
        </div>
      </section>

      {settlementsQuery.isLoading ? (
        <ListStateSkeleton items={6} heightClass="h-28" />
      ) : settlementsQuery.isError ? (
        <StateCard
          icon={<Layers className="h-5 w-5 text-primary" />}
          title={t("settlements.states.error.heading")}
          note={t(getPractitionerSettlementsErrorKey(settlementsQuery.error))}
          action={{ label: t("settlements.states.error.retry"), onClick: () => settlementsQuery.refetch() }}
          className="rounded-[28px]"
        />
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((settlement) => (
            <SettlementRow
              key={settlement.id}
              settlement={settlement}
              locale={locale}
              t={t}
            />
          ))}

          {data.pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-[24px] border border-border-light bg-surface-primary px-4 py-3 dark:bg-white/5">
              <p className="text-xs text-text-muted">
                {t("settlements.pagination.summary", {
                  from: (data.pagination.page - 1) * data.pagination.limit + 1,
                  to: Math.min(
                    data.pagination.page * data.pagination.limit,
                    data.pagination.totalItems,
                  ),
                  total: data.pagination.totalItems,
                })}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.pagination.page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/8"
                >
                  {t("settlements.pagination.previous")}
                </button>
                <button
                  type="button"
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/8"
                >
                  {t("settlements.pagination.next")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <StateCard
          icon={<Layers className="h-5 w-5 text-primary" />}
          title={t("settlements.states.empty.heading")}
          note={t("settlements.states.empty.note")}
          className="rounded-[28px] p-8"
        />
      )}
    </div>
  );
}
