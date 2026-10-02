"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  History,
  RotateCcw,
  Search,
  Stethoscope,
  User,
  Wallet,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StateCard } from "@/components/shared/ContentStates";
import { formatViewerDate } from "@/lib/time-formatting";
import {
  usePatientPayments,
  usePatientWalletSummary,
} from "../hooks/use-payments";
import { usePatientSessions } from "@/features/sessions/hooks/use-sessions";
import { canContinuePayment, canRetryPayment } from "../lib/payment-status";
import { formatPatientMoney } from "../lib/patient-money-format";
import type {
  PaymentItem,
  PaymentProvider,
  PaymentStatus,
} from "../types/payments.types";
import SessionCodeReference from "@/components/shared/SessionCodeReference";
import { Skeleton } from "@/components/shared/LoadingStates";

const PAYMENT_STATUS_FILTERS: PaymentStatus[] = [
  "CAPTURED",
  "PENDING",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "REFUND_PENDING",
  "CREATED",
  "REQUIRES_ACTION",
  "AUTHORIZED",
  "CANCELLED",
  "EXPIRED",
];

const PAYMENT_PAGE_SIZE = 20;

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

function resolveRelevantDate(
  payment: PaymentItem,
): { labelKey: string; isoString: string } {
  if (payment.paidAt) return { labelKey: "history.paidOn", isoString: payment.paidAt };
  if (payment.refundedAt) {
    return { labelKey: "history.refundedOn", isoString: payment.refundedAt };
  }
  if (payment.failedAt) {
    return { labelKey: "history.failedOn", isoString: payment.failedAt };
  }
  if (payment.expiredAt) {
    return { labelKey: "history.expiredOn", isoString: payment.expiredAt };
  }
  return { labelKey: "history.initiatedOn", isoString: payment.createdAt };
}

function resolvePaymentMethodKey(payment: PaymentItem): string {
  if (payment.provider === "INTERNAL_WALLET") {
    return "history.method.wallet";
  }

  if (payment.provider === "STRIPE") {
    if (payment.providerMethod === "WALLET") {
      return "history.method.wallet";
    }
    if (payment.providerMethod === "CARD") {
      return "history.method.card";
    }
    return "history.method.stripe";
  }

  if (payment.provider === "PAYMOB") {
    if (payment.providerMethod === "WALLET") {
      return "history.method.wallet";
    }
    if (payment.providerMethod === "CARD") {
      return "history.method.card";
    }
    return "history.method.paymob";
  }

  return payment.providerMethod === "WALLET"
    ? "history.method.wallet"
    : "history.method.gateway";
}

function resolvePaymentStatusKey(status: PaymentStatus): string {
  return `history.status.${status}`;
}

function resolvePaymentActionHref(payment: PaymentItem): string | null {
  if (!payment.sessionId) {
    return null;
  }

  if (canContinuePayment(payment) || canRetryPayment(payment)) {
    return `/patient/sessions/${payment.sessionId}/pay`;
  }

  return `/patient/sessions/${payment.sessionId}`;
}

export default function PatientPaymentsHistoryPanel() {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const isRtl = locale.startsWith("ar");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const dateFromIso = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined;
  const dateToIso = toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined;

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = usePatientPayments({
    limit: PAYMENT_PAGE_SIZE,
    page,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(currencyFilter === "ALL" ? {} : { currencyCode: currencyFilter as "EGP" | "USD" }),
    ...(dateFromIso ? { dateFrom: dateFromIso } : {}),
    ...(dateToIso ? { dateTo: dateToIso } : {}),
    ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
  });

  const { data: sessionsData, isLoading: sessionsLoading } = usePatientSessions({ limit: 50 });
  const { data: walletSummaryData } = usePatientWalletSummary();

  const walletSummary = walletSummaryData?.item ?? null;
  const availableWalletBalance = walletSummary
    ? formatPatientMoney(numLocale, walletSummary.availableBalance, walletSummary.currencyCode, {
        fallbackText: "0.00",
      })
    : null;

  const payments = useMemo(() => paymentsData?.items ?? [], [paymentsData?.items]);
  const sessionMap = useMemo(
    () =>
      new Map(
        (sessionsData?.items ?? []).map((session) => [
          session.id,
          {
            sessionCode: session.sessionCode,
            practitionerName: session.practitioner?.displayName ?? session.practitioner?.slug,
            practitionerSlug: session.practitioner?.slug,
          },
        ]),
      ),
    [sessionsData?.items],
  );

  const currencyOptions = useMemo(() => {
    const set = new Set(["ALL"]);
    payments.forEach((p) => {
      if (p.currency) set.add(p.currency.toUpperCase());
    });
    return Array.from(set);
  }, [payments]);

  const totalPages = paymentsData?.pagination.totalPages ?? 1;
  const safePage = Math.min(page, totalPages);
  const visiblePayments = payments;

  if (paymentsLoading || sessionsLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 py-6 px-4">
        <div className="space-y-2 border-b border-border-light/60 pb-4">
          <Skeleton className="h-7 w-40 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-32 rounded-3xl" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (paymentsError) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <StateCard
          title={t("history.errorHeading")}
          note={t("history.errorNote")}
          action={{ label: t("history.retry"), onClick: () => refetchPayments() }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6 space-y-6 text-start">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-light/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
            {t("history.heading")}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {locale === "ar"
              ? "متابعة سجل مدفوعات الجلسات والاستشارات، ورصيد محفظتك المتاح."
              : t("meta.historyDescription")}
          </p>
        </div>

        <Link
          href="/patient/wallet"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary-light/50 px-4 py-2.5 text-xs font-bold text-primary transition hover:bg-primary-light hover:shadow-2xs dark:bg-primary/20 dark:text-primary-light self-start sm:self-auto cursor-pointer"
        >
          <Wallet size={15} />
          <span>{locale === "ar" ? "سجل حركة المحفظة" : t("history.actions.wallet")}</span>
        </Link>
      </div>

      {/* ── Wallet Quick Highlight Card ── */}
      {availableWalletBalance ? (
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-[#1b433e] via-[#215a53] to-[#143934] px-4 py-2.5 text-white shadow-2xs border border-white/15">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-emerald-200 backdrop-blur-md">
                <Wallet size={13} />
              </span>
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-xs text-emerald-100/90 truncate">
                  {locale === "ar" ? "الرصيد المتاح:" : "Available:"}
                </span>
                <span className="text-base sm:text-lg font-black font-mono tracking-tight text-white">
                  {availableWalletBalance}
                </span>
              </div>
            </div>

            <Link
              href="/patient/wallet"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/25 active:scale-[0.98] shadow-xs cursor-pointer"
            >
              <span>{locale === "ar" ? "تفاصيل المحفظة" : "View Wallet"}</span>
              {isRtl ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
            </Link>
          </div>
        </div>
      ) : null}

      {/* ── Search & Filter Controls ── */}
      <div className="rounded-3xl border border-border-light/80 bg-white p-3.5 sm:p-4 shadow-2xs dark:bg-surface-secondary dark:border-border-dark space-y-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative flex items-center lg:col-span-2">
            <Search className="absolute start-3 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={locale === "ar" ? "بحث برقم المعاملة أو كود الجلسة أو المختص..." : t("history.filters.searchPlaceholder")}
              className="w-full rounded-2xl border border-border-light bg-surface-tertiary/40 py-2 ps-9 pe-3 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as PaymentStatus | "ALL");
              setPage(1);
            }}
            aria-label={t("history.filters.allStatuses")}
            className="rounded-2xl border border-border-light bg-surface-tertiary/40 px-3 py-2 text-xs sm:text-sm font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer"
          >
            <option value="ALL">{t("history.filters.allStatuses")}</option>
            {PAYMENT_STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {t(resolvePaymentStatusKey(status) as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => {
              setCurrencyFilter(e.target.value);
              setPage(1);
            }}
            aria-label={t("history.filters.allCurrencies")}
            className="rounded-2xl border border-border-light bg-surface-tertiary/40 px-3 py-2 text-xs sm:text-sm font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer"
          >
            <option value="ALL">{t("history.filters.allCurrencies")}</option>
            {currencyOptions
              .filter((c) => c !== "ALL")
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* ── Payments List Cards ── */}
      {visiblePayments.length > 0 ? (
        <div className="space-y-3">
          {visiblePayments.map((payment) => {
            const session = payment.sessionId ? sessionMap.get(payment.sessionId) : null;
            const practitionerLabel = session?.practitionerName ?? t("history.unknownPractitioner");
            const { labelKey, isoString } = resolveRelevantDate(payment);
            const actionHref = resolvePaymentActionHref(payment);
            const canContinue = canContinuePayment(payment);
            const canRetry = canRetryPayment(payment);
            const methodKey = resolvePaymentMethodKey(payment);
            const statusLabel = t(resolvePaymentStatusKey(payment.status) as Parameters<typeof t>[0]);
            const amount = formatPatientMoney(numLocale, payment.amountTotal, payment.currency, {
              fallbackText: "—",
            });

            const isSuccess = payment.status === "CAPTURED";
            const isPending = ["PENDING", "REQUIRES_ACTION", "AUTHORIZED"].includes(payment.status);
            const isFailed = payment.status === "FAILED";
            const isRefunded = ["REFUNDED", "PARTIALLY_REFUNDED", "REFUND_PENDING"].includes(payment.status);

            const statusClass = isSuccess
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800/40"
              : isPending
                ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800/40"
                : isFailed
                  ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-800/40"
                  : isRefunded
                    ? "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/20 dark:text-sky-300 dark:border-sky-800/40"
                    : "bg-surface-tertiary text-text-secondary border-border-light dark:bg-surface-tertiary dark:text-white/70";

            return (
              <div
                key={payment.id}
                className="rounded-2xl border border-border-light/80 bg-white p-4 sm:p-5 shadow-2xs transition-all hover:border-primary/30 hover:shadow-xs dark:bg-surface-secondary dark:border-border-dark"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left info with doctor avatar/icon */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary font-bold overflow-hidden border border-primary/20 dark:bg-primary/20">
                      <User size={18} />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          dir="auto"
                          className="text-sm font-bold text-text-primary dark:text-white truncate"
                        >
                          {practitionerLabel}
                        </span>
                        {session?.sessionCode ? (
                          <SessionCodeReference
                            sessionId={payment.sessionId!}
                            sessionCode={session.sessionCode}
                            href={`/patient/sessions/${payment.sessionId}`}
                            copyable
                          />
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Calendar size={12} className="text-primary" />
                          <span>
                            {t(labelKey as Parameters<typeof t>[0])} {formatDate(isoString, numLocale)}
                          </span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <CreditCard size={12} className="text-primary" />
                          <span>{t(methodKey as Parameters<typeof t>[0])}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount, Status & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-light/60">
                    <div className="text-start sm:text-end">
                      <p className="text-base sm:text-lg font-black font-mono text-text-primary dark:text-white">
                        {amount}
                      </p>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {actionHref ? (
                      <Link
                        href={actionHref as never}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                          canRetry || canContinue
                            ? "bg-primary text-white shadow-xs hover:bg-primary-hover active:scale-[0.98]"
                            : "border border-border-light bg-white text-text-secondary hover:border-primary/40 hover:text-primary transition dark:bg-surface-secondary dark:border-border-dark"
                        }`}
                      >
                        {canRetry ? (
                          <>
                            <RotateCcw size={12} />
                            <span>{t("history.retryPayment")}</span>
                          </>
                        ) : canContinue ? (
                          <span>{t("history.continuePayment")}</span>
                        ) : (
                          <>
                            <span>{t("history.viewSession")}</span>
                            {isRtl ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
                          </>
                        )}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border-light/60 px-2 pt-4">
              <p className="text-xs text-text-secondary">
                {locale === "ar"
                  ? `صفحة ${safePage} من ${totalPages}`
                  : `Page ${safePage} of ${totalPages}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-border-light bg-white px-3 text-xs font-semibold text-text-primary transition hover:border-primary/40 disabled:opacity-40 dark:bg-surface-secondary cursor-pointer"
                >
                  {isRtl ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
                  <span>{locale === "ar" ? "السابق" : "Prev"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
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
              {locale === "ar" ? "لا توجد معاملات دفع مطابقة" : "No matching payments"}
            </h3>
            <p className="text-xs text-text-secondary">
              {locale === "ar"
                ? "ستظهر هنا جميع مدفوعاتك وعمليات الاسترداد وتفاصيل جلساتك."
                : "All your session payments and refund activities will appear here."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
