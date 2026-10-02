"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  History,
  Lock,
  RotateCcw,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StateCard } from "@/components/shared/ContentStates";
import { formatViewerDate } from "@/lib/time-formatting";
import { usePatientWalletEntries, usePatientWalletSummary } from "../hooks/use-payments";
import { formatPatientMoney } from "../lib/patient-money-format";
import type { CustomerWalletEntryItem, CustomerWalletSummaryItem } from "../types/payments.types";
import { Skeleton } from "@/components/shared/LoadingStates";

function formatDate(isoString: string, numLocale: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat(numLocale.startsWith("ar") ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return formatViewerDate(isoString, { locale: numLocale });
  }
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
  const isRtl = locale.startsWith("ar");
  const available = formatPatientMoney(locale, summary.availableBalance, summary.currencyCode, {
    fallbackText: "0.00",
  });
  const reserved = formatPatientMoney(locale, summary.reservedBalance, summary.currencyCode, {
    fallbackText: "0.00",
  });

  return (
    <article className="relative overflow-hidden rounded-2xl bg-linear-to-br from-[#1b433e] via-[#215a53] to-[#143934] py-3 px-4 sm:py-3.5 sm:px-4.5 text-white shadow-xs border border-white/15 text-start space-y-1.5">
      {/* Background Decorative Accent */}
      <div className="pointer-events-none absolute -end-6 -bottom-6 h-24 w-24 rounded-full bg-white/5 blur-lg" />

      {/* Top row: Label & Icon */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2 py-0.5 text-[11px] font-bold text-white border border-white/25">
            <Coins className="h-3 w-3 text-amber-300" />
            <span>{currencyLabel}</span>
          </span>
          <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-200 uppercase">
            {summary.currencyCode}
          </span>
        </div>

        <span className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md text-emerald-200 border border-white/20">
          <Wallet className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Main Balance Row */}
      <div className="relative z-10">
        <p className="text-[10px] font-medium text-white/75">{title}</p>
        <p className="text-xl sm:text-[22px] font-extrabold tracking-tight text-white font-mono leading-tight">
          {available}
        </p>
      </div>

      {/* Reserved balance footer */}
      <div className="relative z-10 border-t border-white/15 pt-1.5 flex items-center justify-between text-xs text-white/90">
        <span className="text-[10px] text-emerald-100/90 flex items-center gap-1">
          <Lock className="h-2.5 w-2.5 text-amber-300" />
          <span>{t("walletPage.balanceReserved")}:</span>
        </span>
        <span className="font-bold font-mono text-white text-[11px]">{reserved}</span>
      </div>
    </article>
  );
}

export default function PatientWalletScreen() {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const isRtl = locale.startsWith("ar");

  const [page, setPage] = useState(1);
  const limit = 10;
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

  const walletSummaries = useMemo(
    () =>
      [
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
      ].filter((item) => item.summary),
    [egpWalletSummaryData?.item, t, usdWalletSummaryData?.item],
  );

  const entries = useMemo(() => walletEntriesData?.items ?? [], [walletEntriesData?.items]);
  const pageLoading = egpWalletSummaryLoading || usdWalletSummaryLoading;
  const topError = !walletSummaries.length && (egpWalletSummaryError || usdWalletSummaryError);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
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

      if (selectedDateFilter !== "ALL") {
        const entryDate = new Date(entry.effectiveAt);
        const entryTime = entryDate.getTime();
        const currentDate = new Date();

        if (selectedDateFilter === "TODAY") {
          const isSameDay =
            entryDate.getFullYear() === currentDate.getFullYear() &&
            entryDate.getMonth() === currentDate.getMonth() &&
            entryDate.getDate() === currentDate.getDate();
          if (!isSameDay) return false;
        } else if (selectedDateFilter === "WEEK") {
          const sevenDaysAgo = currentDate.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (entryTime < sevenDaysAgo) return false;
        } else if (selectedDateFilter === "MONTH") {
          const thirtyDaysAgo = currentDate.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (entryTime < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [entries, selectedDateFilter, selectedStatusFilter]);

  const totalPages = walletEntriesData?.pagination?.totalPages ?? 1;

  if (pageLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 py-6 px-4">
        <div className="space-y-2 border-b border-border-light/60 pb-4">
          <Skeleton className="h-7 w-40 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6 space-y-6 text-start">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-light/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
            {t("walletPage.heading")}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {locale === "ar"
              ? "متابعة رصيدك المتاح، المبالغ المحجوزة للجلسات، وسجل العمليات المالية."
              : t("walletPage.note")}
          </p>
        </div>

        <Link
          href="/patient/payments"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border-light bg-white px-4 py-2.5 text-xs font-bold text-text-secondary hover:border-primary/40 hover:text-primary transition shadow-2xs dark:bg-surface-secondary dark:border-border-dark self-start sm:self-auto cursor-pointer"
        >
          <CreditCard size={14} className="text-primary" />
          <span>{t("walletPage.actions.payments")}</span>
          {isRtl ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
        </Link>
      </div>

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
          className="rounded-3xl"
        />
      ) : null}

      {/* ── Wallet Summaries ── */}
      {walletSummaries.length > 0 ? (
        <div className={`grid gap-4 ${walletSummaries.length > 1 ? "md:grid-cols-2" : ""}`}>
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
      ) : null}

      {/* ── Activity Filter Bar ── */}
      <div className="rounded-3xl border border-border-light/80 bg-white p-4 shadow-2xs dark:bg-surface-secondary dark:border-border-dark space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-text-primary dark:text-white">
              {t("walletPage.activityHeading")}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">{t("walletPage.activityNote")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label={locale === "ar" ? "الحالة" : "Status"}
              className="rounded-xl border border-border-light bg-surface-tertiary/40 px-3 py-2 text-xs font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer"
            >
              <option value="ALL">{locale === "ar" ? "كل الحالات" : "All Statuses"}</option>
              <option value="COMPLETED">{locale === "ar" ? "مكتمل" : "Completed"}</option>
              <option value="PROCESSING">{locale === "ar" ? "قيد المعالجة" : "Processing"}</option>
              <option value="REFUNDED">{locale === "ar" ? "مسترد" : "Refunded"}</option>
            </select>

            {/* Date Filter */}
            <select
              value={selectedDateFilter}
              onChange={(e) => {
                setSelectedDateFilter(e.target.value);
                setPage(1);
              }}
              aria-label={locale === "ar" ? "التاريخ" : "Date"}
              className="rounded-xl border border-border-light bg-surface-tertiary/40 px-3 py-2 text-xs font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer"
            >
              <option value="ALL">{locale === "ar" ? "كل التواريخ" : "All Dates"}</option>
              <option value="TODAY">{locale === "ar" ? "اليوم" : "Today"}</option>
              <option value="WEEK">{locale === "ar" ? "آخر 7 أيام" : "Last 7 Days"}</option>
              <option value="MONTH">{locale === "ar" ? "آخر 30 يوم" : "Last 30 Days"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Activity Entries ── */}
      {walletEntriesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : filteredEntries.length > 0 ? (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const isCredit = entry.direction === "CREDIT";
            const statusKey = resolveWalletEntryStatusKey(entry);
            const statusClass =
              entry.entryType === "SESSION_PAYMENT_RESERVE"
                ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300"
                : entry.entryType === "REFUND_CREDIT"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : "bg-primary-light text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-light";

            return (
              <div
                key={entry.id}
                className="rounded-2xl border border-border-light/80 bg-white p-4 shadow-2xs transition-all hover:border-primary/30 hover:shadow-xs dark:bg-surface-secondary dark:border-border-dark"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        isCredit
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300"
                      }`}
                    >
                      {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </span>

                    <div className="space-y-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-text-primary dark:text-white truncate">
                        {t(`history.wallet.entries.type.${entry.entryType}` as any)}
                      </p>
                      {entry.description ? (
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {translateDescription(entry.description, entry.entryType, locale)}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-text-muted flex items-center gap-1 font-medium">
                        <Calendar size={11} className="text-primary" />
                        <span>{formatDate(entry.effectiveAt, numLocale)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-light/60">
                    <span
                      className={`text-sm sm:text-base font-black font-mono ${
                        isCredit ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {formatPatientMoney(numLocale, entry.amount, entry.currencyCode, {
                        fallbackText: "—",
                      })}
                    </span>

                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusClass}`}>
                      {t(statusKey as any)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border-light/60 px-2 pt-4">
              <p className="text-xs text-text-secondary">
                {locale === "ar" ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-border-light bg-white px-3 text-xs font-semibold text-text-primary transition hover:border-primary/40 disabled:opacity-40 dark:bg-surface-secondary cursor-pointer"
                >
                  {isRtl ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
                  <span>{locale === "ar" ? "السابق" : "Prev"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-border-light bg-white px-3 text-xs font-semibold text-text-primary transition hover:border-primary/40 disabled:opacity-40 dark:bg-surface-secondary cursor-pointer"
                >
                  <span>{locale === "ar" ? "التالي" : "Next"}</span>
                  {isRtl ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-border-light/80 bg-white p-8 text-center shadow-xs dark:bg-surface-secondary dark:border-border-dark max-w-md mx-auto space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20">
            <History size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-text-primary dark:text-white">
              {t("walletPage.states.empty.heading")}
            </h3>
            <p className="text-xs text-text-secondary">{t("walletPage.states.empty.note")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

