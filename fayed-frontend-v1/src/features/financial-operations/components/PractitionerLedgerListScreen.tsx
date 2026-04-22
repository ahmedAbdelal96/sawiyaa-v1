"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import {
  getPractitionerLedgerErrorKey,
} from "../lib/financial-operations-errors";
import { usePractitionerLedger } from "../hooks/use-financial-operations";
import type {
  PractitionerLedgerEntry,
  PractitionerLedgerListParams,
} from "../types/financial-operations.types";

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

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: locale !== "ar",
  });
}

function formatId(value: string) {
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

type ReferenceLabel = {
  label: string;
  value: string;
};

function getReferenceLabel(
  entry: PractitionerLedgerEntry,
  t: ReturnType<typeof useTranslations>,
): ReferenceLabel | null {
  if (entry.paymentId) {
    return { label: t("ledger.reference.payment"), value: formatId(entry.paymentId) };
  }
  if (entry.sessionId) {
    return { label: t("ledger.reference.session"), value: formatId(entry.sessionId) };
  }
  if (entry.settlementId) {
    return {
      label: t("ledger.reference.settlement"),
      value: formatId(entry.settlementId),
    };
  }
  if (entry.referenceType && entry.referenceId) {
    return {
      label: t("ledger.reference.generic", { type: entry.referenceType }),
      value: formatId(entry.referenceId),
    };
  }

  return null;
}

export default function PractitionerLedgerListScreen() {
  const t = useTranslations("practitioner-finance");
  const locale = useLocale();
  const [page, setPage] = useState(1);

  const params = useMemo<PractitionerLedgerListParams>(
    () => ({ page, limit: DEFAULT_PAGE_LIMIT }),
    [page],
  );

  const ledgerQuery = usePractitionerLedger(params);
  const data = ledgerQuery.data;

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("ledger.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("ledger.title")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
              {t("ledger.note")}
            </p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {data
              ? t("ledger.count", { value: data.pagination.totalItems })
              : t("ledger.countLoading")}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("ledger.scopeHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
              <li>{t("ledger.scopeItems.history")}</li>
              <li>{t("ledger.scopeItems.balances")}</li>
              <li>{t("ledger.scopeItems.references")}</li>
            </ul>
          </div>

          <div className="rounded-[24px] border border-border-light bg-surface-primary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("ledger.boundaryHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
              <li>{t("ledger.boundaryItems.noPayouts")}</li>
              <li>{t("ledger.boundaryItems.noSettlements")}</li>
              <li>{t("ledger.boundaryItems.noReconciliation")}</li>
            </ul>
          </div>
        </div>
      </section>

      {ledgerQuery.isLoading ? (
        <ListStateSkeleton items={6} heightClass="h-28" />
      ) : ledgerQuery.isError ? (
        <StateCard
          icon={<FileText className="h-5 w-5 text-primary" />}
          title={t("ledger.states.error.heading")}
          note={t(getPractitionerLedgerErrorKey(ledgerQuery.error))}
          action={{ label: t("ledger.states.error.retry"), onClick: () => ledgerQuery.refetch() }}
          className="rounded-[28px]"
        />
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((entry) => {
            const reference = getReferenceLabel(entry, t);
            return (
              <div
                key={entry.id}
                className="app-panel w-full rounded-[28px] p-5 text-start"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="app-chip rounded-full px-2.5 py-1 text-xs font-semibold">
                        {t(`ledger.entryTypes.${entry.entryType}` as Parameters<typeof t>[0])}
                      </span>
                      <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-text-secondary dark:bg-white/8 dark:text-white/70">
                        {t(`ledger.directions.${entry.direction}` as Parameters<typeof t>[0])}
                      </span>
                      <span className="rounded-full border border-border-light px-2.5 py-1 text-xs font-medium text-text-muted">
                        {t(`ledger.balanceBuckets.${entry.balanceBucket}` as Parameters<typeof t>[0])}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-text-primary dark:text-white/95">
                      {formatMoney(entry.amount, entry.currency, locale)}
                      <span className="text-xs font-medium text-text-muted">
                        {entry.currency}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                      <span>
                        {t("ledger.fields.effectiveAt")}: {formatDateTime(entry.effectiveAt, locale)}
                      </span>
                      <span>
                        {t("ledger.fields.createdAt")}: {formatDateTime(entry.createdAt, locale)}
                      </span>
                    </div>

                    {reference ? (
                      <div className="mt-3 text-xs text-text-secondary">
                        {reference.label}:{" "}
                        <span className="font-mono text-text-primary dark:text-white/90">
                          {reference.value}
                        </span>
                      </div>
                    ) : null}

                    {entry.description ? (
                      <p className="mt-3 text-xs text-text-secondary">
                        {t("ledger.fields.description")}: {entry.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {data.pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-[24px] border border-border-light bg-surface-primary px-4 py-3 dark:bg-white/5">
              <p className="text-xs text-text-muted">
                {t("ledger.pagination.summary", {
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
                  {t("ledger.pagination.previous")}
                </button>
                <button
                  type="button"
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/8"
                >
                  {t("ledger.pagination.next")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <StateCard
          icon={<FileText className="h-5 w-5 text-primary" />}
          title={t("ledger.states.empty.heading")}
          note={t("ledger.states.empty.note")}
          className="rounded-[28px] p-8"
        />
      )}
    </div>
  );
}
