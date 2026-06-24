"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { formatViewerDate } from "@/lib/time-formatting";
import { usePatientWalletEntries, usePatientWalletSummary } from "../hooks/use-payments";
import { formatPatientMoney } from "../lib/patient-money-format";
import type { CustomerWalletEntryItem, CustomerWalletSummaryItem } from "../types/payments.types";
import { DataTable } from "@/components/ui/data-table";

function formatDate(isoString: string, numLocale: string): string {
  return formatViewerDate(isoString, { locale: numLocale });
}

function resolveWalletEntryStatusKey(entry: CustomerWalletEntryItem): string {
  if (entry.entryType === "SESSION_PAYMENT_RESERVE") {
    return "walletPage.activityStatus.processing";
  }

  if (entry.entryType === "REFUND_CREDIT") {
    return "walletPage.activityStatus.refunded";
  }

  return "walletPage.activityStatus.completed";
}

function translateDescription(description: string | null, entryType: string, locale: string): string {
  if (!description) return "";
  if (locale !== "ar") return description;
  
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes("reserved") && lowerDesc.includes("captured")) {
    return "خصم مبلغ الجلسة بعد تأكيد الحجز.";
  }
  if (lowerDesc.includes("reserved") || lowerDesc.includes("reserve")) {
    return "حجز مبلغ مؤقتاً لتأكيد موعد الجلسة.";
  }
  if (lowerDesc.includes("refund")) {
    return "إيداع مبلغ مسترد في رصيد المحفظة.";
  }
  if (lowerDesc.includes("released") || lowerDesc.includes("release")) {
    return "فك حجز المبلغ وإعادته للمحفظة.";
  }
  return description;
}

function WalletSummaryCard({
  summary,
  currencyLabel,
  title,
  locale,
}: {
  summary: CustomerWalletSummaryItem;
  currencyLabel: string;
  title: string;
  locale: string;
}) {
  const t = useTranslations("payments");
  const available = formatPatientMoney(locale, summary.availableBalance, summary.currencyCode, {
    fallbackText: "?",
  });
  const reserved = formatPatientMoney(locale, summary.reservedBalance, summary.currencyCode, {
    fallbackText: "?",
  });
  const lastActivity = summary.lastEntryAt ? formatDate(summary.lastEntryAt, locale) : null;

  return (
    <article className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[24px] bg-gradient-to-br from-primary via-[#2d5c55] to-[#1c4540] p-6 text-white shadow-[0_12px_32px_rgba(36,86,79,0.16)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(36,86,79,0.22)] hover:-translate-y-0.5 w-full max-w-md">
      {/* Decorative Glassmorphic Blur Overlays */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-secondary/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-bold text-white/90 border border-white/10 shadow-sm">
              {currencyLabel}
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/50">{summary.currencyCode}</span>
          </div>
          <div>
            <p className="text-xs font-medium text-white/70">{title}</p>
            <p className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight tabular-nums text-white">
              {available}
            </p>
          </div>
        </div>

        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-white border border-white/10 shadow-sm">
          <Wallet className="h-5 w-5" />
        </span>
      </div>

      <div className="relative z-10 mt-6 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-3 text-sm text-white/80">
          <span className="font-medium">{t("walletPage.balanceReserved")}</span>
          <span className="font-bold tabular-nums text-white">
            {reserved}
          </span>
        </div>
        {lastActivity ? (
          <p className="mt-2 text-xs text-white/50">
            {t("walletPage.balanceLastActivity")} {lastActivity}
          </p>
        ) : (
          <p className="mt-2 text-xs text-white/50">{t("walletPage.balanceNoActivity")}</p>
        )}
      </div>
    </article>
  );
}

export default function PatientWalletScreen() {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("ALL");

  const {
    data: egpWalletSummaryData,
    isLoading: egpWalletSummaryLoading,
    isError: egpWalletSummaryError,
    refetch: refetchEgpWalletSummary,
  } = usePatientWalletSummary("EGP");

  const {
    data: usdWalletSummaryData,
    isLoading: usdWalletSummaryLoading,
    isError: usdWalletSummaryError,
    refetch: refetchUsdWalletSummary,
  } = usePatientWalletSummary("USD");

  const {
    data: walletEntriesData,
    isLoading: walletEntriesLoading,
    isError: walletEntriesError,
    refetch: refetchWalletEntries,
  } = usePatientWalletEntries({
    page,
    limit,
  });

  const walletSummaries = [
    {
      currencyCode: "EGP",
      currencyLabel: t("walletPage.currencyLabels.local"),
      title: t("walletPage.balanceTitle"),
      summary: egpWalletSummaryData?.item ?? null,
    },
    {
      currencyCode: "USD",
      currencyLabel: t("walletPage.currencyLabels.international"),
      title: t("walletPage.balanceTitle"),
      summary: usdWalletSummaryData?.item ?? null,
    },
  ].filter((item) => item.summary);

  const entries = walletEntriesData?.items ?? [];
  const topError = !walletSummaries.length && (egpWalletSummaryError || usdWalletSummaryError);
  const pageLoading = egpWalletSummaryLoading || usdWalletSummaryLoading;

  // Client-side filtering logic based on Date presets and Status
  const filteredEntries = entries.filter((entry) => {
    // 1. Status Filter
    if (selectedStatusFilter !== "ALL") {
      const statusKey = resolveWalletEntryStatusKey(entry);
      if (selectedStatusFilter === "COMPLETED" && statusKey !== "walletPage.activityStatus.completed") {
        return false;
      }
      if (selectedStatusFilter === "PROCESSING" && statusKey !== "walletPage.activityStatus.processing") {
        return false;
      }
      if (selectedStatusFilter === "REFUNDED" && statusKey !== "walletPage.activityStatus.refunded") {
        return false;
      }
    }

    // 2. Date Filter
    if (selectedDateFilter !== "ALL") {
      const entryTime = new Date(entry.effectiveAt).getTime();
      const nowTime = Date.now();
      if (selectedDateFilter === "TODAY") {
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        if (entryTime < startOfToday) return false;
      } else if (selectedDateFilter === "WEEK") {
        const sevenDaysAgo = nowTime - 7 * 24 * 60 * 60 * 1000;
        if (entryTime < sevenDaysAgo) return false;
      } else if (selectedDateFilter === "MONTH") {
        const thirtyDaysAgo = nowTime - 30 * 24 * 60 * 60 * 1000;
        if (entryTime < thirtyDaysAgo) return false;
      }
    }

    return true;
  });

  const columns = [
    {
      id: "type",
      align: "start" as const,
      header: t("walletPage.activityColumns.type"),
      cell: (row: CustomerWalletEntryItem) => {
        const isCredit = row.direction === "CREDIT";
        return (
          <div className="flex items-start gap-3 text-start">
            <span
              className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                isCredit
                  ? "bg-primary-light text-text-brand dark:bg-primary/20 dark:text-primary-light"
                  : "bg-error-light text-error dark:bg-error/15 dark:text-error"
              }`}
            >
              {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                {t(`history.wallet.entries.type.${row.entryType}` as any)}
              </p>
              {row.description ? (
                <p className="mt-1 line-clamp-1 text-xs text-text-secondary">
                  {translateDescription(row.description, row.entryType, locale)}
                </p>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      id: "date",
      align: "start" as const,
      header: t("walletPage.activityColumns.date"),
      cell: (row: CustomerWalletEntryItem) => (
        <span className="text-sm text-text-secondary text-start block">
          {formatDate(row.effectiveAt, numLocale)}
        </span>
      ),
    },
    {
      id: "amount",
      align: "end" as const,
      header: t("walletPage.activityColumns.amount"),
      cell: (row: CustomerWalletEntryItem) => {
        const isCredit = row.direction === "CREDIT";
        return (
          <span
            className={`text-sm font-semibold tabular-nums text-end block ${
              isCredit ? "text-text-brand" : "text-error"
            }`}
          >
            {isCredit ? "+" : "-"}
            {formatPatientMoney(numLocale, row.amount, row.currencyCode, {
              fallbackText: "?",
            })}
          </span>
        );
      },
    },
    {
      id: "status",
      align: "end" as const,
      header: t("walletPage.activityColumns.status"),
      cell: (row: CustomerWalletEntryItem) => (
        <div className="text-end">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              row.entryType === "SESSION_PAYMENT_RESERVE"
                ? "bg-warning-light text-warning"
                : row.entryType === "REFUND_CREDIT"
                  ? "bg-success-light text-success"
                  : "bg-primary-light text-text-brand"
            }`}
          >
            {t(resolveWalletEntryStatusKey(row) as any)}
          </span>
        </div>
      ),
    },
  ];

  const paginationConfig = walletEntriesData?.pagination
    ? {
        page: walletEntriesData.pagination.page,
        limit: walletEntriesData.pagination.limit,
        totalItems: walletEntriesData.pagination.totalItems,
        totalPages: walletEntriesData.pagination.totalPages,
        hasNextPage: walletEntriesData.pagination.page < walletEntriesData.pagination.totalPages,
        hasPrevPage: walletEntriesData.pagination.page > 1,
      }
    : undefined;

  if (pageLoading) {
    return (
      <div className="space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl space-y-3 text-start">
            <div className="h-4 w-28 rounded-full bg-surface-tertiary" />
            <div className="h-10 w-72 rounded-2xl bg-surface-tertiary" />
            <div className="h-4 w-full max-w-2xl rounded-full bg-surface-tertiary" />
          </div>
          <div className="h-12 w-44 rounded-2xl bg-surface-tertiary" />
        </section>

        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-[220px] rounded-[24px] bg-surface-tertiary/45 animate-pulse w-full max-w-md" />
            <div className="h-[220px] rounded-[24px] bg-surface-tertiary/45 animate-pulse w-full max-w-md" />
          </div>
          <div className="h-[360px] rounded-[32px] bg-surface-tertiary/45 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl text-start">
          <p className="text-sm font-semibold text-primary">{t("walletPage.eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary dark:text-white/95 md:text-4xl">
            {t("walletPage.heading")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-text-secondary">{t("walletPage.note")}</p>
        </div>

        <Link
          href="/patient/payments"
          className="inline-flex w-fit items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover shadow-sm"
        >
          <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
          {t("walletPage.actions.payments")}
        </Link>
      </section>

      {topError ? (
        <StateCard
          icon={<Wallet className="h-6 w-6 text-primary" />}
          title={t("walletPage.states.error.heading")}
          note={t("walletPage.states.error.note")}
          action={{
            label: t("walletPage.states.error.retry"),
            onClick: () => {
              void refetchEgpWalletSummary();
              void refetchUsdWalletSummary();
            },
          }}
          className="rounded-[28px]"
        />
      ) : null}

      <div className="space-y-6">
        {walletSummaries.length > 0 ? (
          <div className={`grid gap-6 ${walletSummaries.length > 1 ? "md:grid-cols-2" : ""}`}>
            {walletSummaries.map((item) => (
              <WalletSummaryCard
                key={item.currencyCode}
                summary={item.summary as CustomerWalletSummaryItem}
                currencyLabel={item.currencyLabel}
                title={item.title}
                locale={numLocale}
              />
            ))}
          </div>
        ) : (
          <StateCard
            icon={<Wallet className="h-6 w-6 text-primary" />}
            title={t("walletPage.states.empty.heading")}
            note={t("walletPage.states.empty.note")}
            action={{
              label: t("walletPage.states.empty.action"),
              href: (
                <Link
                  href="/patient/payments"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  {t("walletPage.states.empty.action")}
                </Link>
              ),
            }}
            className="rounded-[28px]"
          />
        )}

        <section className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-light/60">
            <div className="text-start">
              <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
                {t("walletPage.activityHeading")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">{t("walletPage.activityNote")}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-secondary font-medium">
                  {locale === "ar" ? "الحالة:" : "Status:"}
                </span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => {
                    setSelectedStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-1.5 text-xs font-semibold text-text-primary focus:border-primary focus:ring-1 focus:ring-primary dark:bg-white/5 dark:text-white/90"
                >
                  <option value="ALL">{locale === "ar" ? "كل الحالات" : "All Statuses"}</option>
                  <option value="COMPLETED">{locale === "ar" ? "مكتمل" : "Completed"}</option>
                  <option value="PROCESSING">{locale === "ar" ? "قيد المعالجة" : "Processing"}</option>
                  <option value="REFUNDED">{locale === "ar" ? "مسترد" : "Refunded"}</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-secondary font-medium">
                  {locale === "ar" ? "التاريخ:" : "Date:"}
                </span>
                <select
                  value={selectedDateFilter}
                  onChange={(e) => {
                    setSelectedDateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-1.5 text-xs font-semibold text-text-primary focus:border-primary focus:ring-1 focus:ring-primary dark:bg-white/5 dark:text-white/90"
                >
                  <option value="ALL">{locale === "ar" ? "كل التواريخ" : "All Dates"}</option>
                  <option value="TODAY">{locale === "ar" ? "اليوم" : "Today"}</option>
                  <option value="WEEK">{locale === "ar" ? "آخر 7 أيام" : "Last 7 Days"}</option>
                  <option value="MONTH">{locale === "ar" ? "آخر 30 يوم" : "Last 30 Days"}</option>
                </select>
              </div>

              {walletEntriesError ? (
                <button
                  type="button"
                  onClick={() => refetchWalletEntries()}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t("walletPage.retry")}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <DataTable
              data={filteredEntries}
              columns={columns}
              getRowId={(row) => row.id}
              loading={walletEntriesLoading}
              error={walletEntriesError ? "Failed to load entries" : null}
              pagination={paginationConfig}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
