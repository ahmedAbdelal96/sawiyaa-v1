"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ChevronLeft, Search, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { groupAmountsByCurrency } from "@/lib/finance-format";
import { formatViewerDate } from "@/lib/time-formatting";
import { usePatientPayments } from "../hooks/use-payments";
import { usePatientSessions } from "@/features/sessions/hooks/use-sessions";
import { canContinuePayment, canRetryPayment } from "../lib/payment-status";
import { formatPatientMoney } from "../lib/patient-money-format";
import type {
  PaymentItem,
  PaymentProvider,
  PaymentStatus,
} from "../types/payments.types";

const STATUS_STYLES: Record<PaymentStatus, string> = {
  CREATED: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60",
  PENDING: "bg-warning-light text-warning dark:bg-warning/15 dark:text-warning-300",
  REQUIRES_ACTION: "bg-warning-light text-warning dark:bg-warning/15 dark:text-warning-300",
  AUTHORIZED: "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  CAPTURED: "bg-success-light text-success dark:bg-success/15 dark:text-success-light",
  FAILED: "bg-error-light text-error dark:bg-error/15 dark:text-error-light",
  CANCELLED: "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/50",
  EXPIRED: "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/50",
  REFUND_PENDING: "bg-warning-light text-warning dark:bg-warning/15 dark:text-warning-300",
  PARTIALLY_REFUNDED: "bg-warning-light text-warning dark:bg-warning/15 dark:text-warning-300",
  REFUNDED: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60",
};

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

const PAYMENT_ROWS_PER_PAGE = 6;

function formatDate(isoString: string, numLocale: string): string {
  return formatViewerDate(isoString, { locale: numLocale });
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

function resolveProviderLabelKey(provider: PaymentProvider): string {
  if (provider === "INTERNAL_WALLET") {
    return "history.provider.INTERNAL_WALLET";
  }

  return `history.provider.${provider}`;
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

function SummaryCard({
  label,
  title,
  amount,
  accentTone,
  note,
}: {
  label: string;
  title: string;
  amount: string;
  accentTone: "teal" | "seafoam";
  note?: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[30px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              accentTone === "teal"
                ? "bg-primary-light text-primary"
                : "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70"
            }`}
          >
            {label}
          </span>
          <div>
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-text-primary dark:text-white/95">
              {amount}
            </p>
          </div>
        </div>

        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
          <Wallet className="h-6 w-6" />
        </span>
      </div>

      {note ? (
        <p className="mt-5 border-t border-border-light pt-4 text-xs text-text-muted dark:border-white/10">
          {note}
        </p>
      ) : null}
    </article>
  );
}

function PaymentRow({
  payment,
  sessionLabel,
  practitionerLabel,
}: {
  payment: PaymentItem;
  sessionLabel: string;
  practitionerLabel: string;
}) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const { labelKey, isoString } = resolveRelevantDate(payment);
  const actionHref = resolvePaymentActionHref(payment);
  const canContinue = canContinuePayment(payment);
  const canRetry = canRetryPayment(payment);
  const methodKey = resolvePaymentMethodKey(payment);
  const statusLabel = t(resolvePaymentStatusKey(payment.status) as Parameters<typeof t>[0]);
  const amount = formatPatientMoney(numLocale, payment.amountTotal, payment.currency, {
    fallbackText: "?",
  });
  const statusTone =
    payment.status === "CAPTURED"
      ? "bg-success-light text-success"
      : payment.status === "FAILED"
        ? "bg-error-light text-error"
        : payment.status === "REFUNDED"
          ? "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60"
          : "bg-warning-light text-warning";

  return (
    <tr className="border-b border-border-light/70 transition-colors last:border-b-0 hover:bg-surface-tertiary/40 dark:border-white/10 dark:hover:bg-white/5">
      <td className="px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
            {sessionLabel}
          </p>
          <p className="mt-1 truncate text-xs text-text-secondary">{practitionerLabel}</p>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-text-secondary">
        {t(labelKey as Parameters<typeof t>[0])} {formatDate(isoString, numLocale)}
      </td>
      <td className="px-4 py-4 text-sm text-text-secondary">
        {t(methodKey as Parameters<typeof t>[0])}
      </td>
      <td className="px-4 py-4 text-sm font-semibold tabular-nums text-text-primary dark:text-white/95">
        {amount}
      </td>
      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-4">
        {actionHref ? (
          <Link
            href={actionHref as never}
            aria-label={canRetry ? t("history.retryPayment") : canContinue ? t("history.continuePayment") : t("history.viewSession")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-white text-text-secondary transition hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/80"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-surface-tertiary text-text-muted dark:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
      </td>
    </tr>
  );
}

export default function PatientPaymentsHistoryPanel() {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = usePatientPayments({ limit: 50 });

  const { data: sessionsData, isLoading: sessionsLoading } = usePatientSessions({ limit: 50 });

  if (paymentsLoading || sessionsLoading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[32px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
          <ListStateSkeleton items={1} heightClass="h-28" />
        </section>
        <ListStateSkeleton items={3} heightClass="h-28" />
      </div>
    );
  }

  if (paymentsError) {
    return (
      <StateCard
        title={t("history.errorHeading")}
        note={t("history.errorNote")}
        action={{ label: t("history.retry"), onClick: () => refetchPayments() }}
      />
    );
  }

  const payments = paymentsData?.items ?? [];
  const sessionMap = new Map(
    (sessionsData?.items ?? []).map((session) => [
      session.id,
      {
        sessionCode: session.sessionCode,
        practitionerName: session.practitioner.displayName ?? session.practitioner.slug,
        practitionerSlug: session.practitioner.slug,
      },
    ]),
  );

  const currencyTotals = groupAmountsByCurrency(
    payments,
    (payment) => payment.currency,
    (payment) => payment.amountTotal,
  );

  const refundCount = payments.filter((payment) =>
    ["REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status),
  ).length;

  const filteredPayments = payments.filter((payment) => {
    const paymentCurrency = payment.currency.toUpperCase();
    if (statusFilter !== "ALL" && payment.status !== statusFilter) return false;
    if (currencyFilter !== "ALL" && paymentCurrency !== currencyFilter) return false;

    const { isoString } = resolveRelevantDate(payment);
    const paymentDate = new Date(isoString).getTime();
    if (Number.isFinite(new Date(fromDate).getTime()) && paymentDate < new Date(fromDate).getTime()) {
      return false;
    }
    if (Number.isFinite(new Date(toDate).getTime())) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (paymentDate > endOfDay.getTime()) return false;
    }

    if (!search.trim()) return true;

    const session = payment.sessionId ? sessionMap.get(payment.sessionId) : null;
    const searchable = [
      payment.id,
      payment.sessionId ?? "",
      session?.sessionCode ?? "",
      session?.practitionerName ?? "",
      payment.provider,
      payment.providerMethod ?? "",
      payment.providerPaymentId ?? "",
      payment.providerReference ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(search.trim().toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAYMENT_ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visiblePayments = filteredPayments.slice(
    (safePage - 1) * PAYMENT_ROWS_PER_PAGE,
    safePage * PAYMENT_ROWS_PER_PAGE,
  );

  const summaryCards = currencyTotals.filter((item) => ["EGP", "USD"].includes(item.currencyCode));
  const otherCurrencyTotals = currencyTotals.filter((item) => !["EGP", "USD"].includes(item.currencyCode));

  const currencyOptions = Array.from(
    new Set([
      "ALL",
      ...currencyTotals.map((item) => item.currencyCode),
    ]),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
            <h1 className="mt-3 text-2xl font-bold text-text-primary dark:text-white/95 md:text-3xl">
              {t("history.heading")}
            </h1>
            <p className="mt-2 text-sm leading-7 text-text-secondary">
              {t("meta.historyDescription")}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <SummaryCard
            key={item.currencyCode}
            label={t(`history.summary.${item.currencyCode.toLowerCase()}` as Parameters<typeof t>[0])}
            title={t("history.summary.heading")}
            amount={formatPatientMoney(numLocale, item.amount, item.currencyCode, {
              fallbackText: "?",
            })}
            accentTone={item.currencyCode === "EGP" ? "teal" : "seafoam"}
          />
        ))}
        {otherCurrencyTotals.map((item) => (
          <SummaryCard
            key={item.currencyCode}
            label={item.currencyCode}
            title={t("history.summary.heading")}
            amount={formatPatientMoney(numLocale, item.amount, item.currencyCode, {
              fallbackText: "?",
            })}
            accentTone="seafoam"
          />
        ))}
        <article className="relative overflow-hidden rounded-[30px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="inline-flex rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary dark:bg-white/10 dark:text-white/70">
                {t("history.summary.refundsLabel")}
              </span>
              <div>
                <p className="text-sm font-medium text-text-secondary">{t("history.summary.refundsHeading")}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-text-primary dark:text-white/95">
                  {refundCount}
                </p>
              </div>
            </div>

            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
              <Wallet className="h-6 w-6" />
            </span>
          </div>
        </article>
      </div>

      <section className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))]">
          <label className="flex items-center gap-2 rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("history.filters.searchPlaceholder")}
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as PaymentStatus | "ALL");
              setPage(1);
            }}
            className="rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/40 dark:bg-white/5"
          >
            <option value="ALL">{t("history.filters.allStatuses")}</option>
            {PAYMENT_STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {t(resolvePaymentStatusKey(status) as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/40 dark:bg-white/5"
            aria-label={t("history.filters.fromDate")}
          />

          <select
            value={currencyFilter}
            onChange={(event) => {
              setCurrencyFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/40 dark:bg-white/5"
          >
            <option value="ALL">{t("history.filters.allCurrencies")}</option>
            {currencyOptions
              .filter((currency) => currency !== "ALL")
              .map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
          <span>{t("history.filters.dateRangeLabel")}</span>
          <label className="flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-1.5 dark:bg-white/5">
            <span>{t("history.filters.toDate")}</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-text-primary outline-none"
              aria-label={t("history.filters.toDate")}
            />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-border-light bg-white shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-light px-5 py-5 dark:border-white/10 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-text-primary dark:text-white/95">
              {t("history.table.heading")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{t("history.table.note")}</p>
          </div>
          <Link
            href="/patient/wallet"
            className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/90"
          >
            {t("history.actions.wallet")}
          </Link>
        </div>

        {visiblePayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light text-right">
              <thead className="bg-surface-tertiary dark:bg-white/5">
                <tr>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {t("history.table.columns.sessionPractitioner")}
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {t("history.table.columns.date")}
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {t("history.table.columns.method")}
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {t("history.table.columns.amount")}
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {t("history.table.columns.status")}
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {t("history.table.columns.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light bg-white dark:divide-white/8 dark:bg-surface-secondary">
                {visiblePayments.map((payment) => {
                  const session = payment.sessionId ? sessionMap.get(payment.sessionId) : null;
                  const sessionLabel = session
                    ? `${session.sessionCode}`
                    : payment.sessionId
                      ? payment.sessionId.slice(0, 8)
                      : t("history.unknownSession");
                  const practitionerLabel = session?.practitionerName
                    ? session.practitionerName
                    : t("history.unknownPractitioner");
                  const actionHref = canContinuePayment(payment) || canRetryPayment(payment)
                    ? `/patient/sessions/${payment.sessionId}/pay`
                    : payment.sessionId
                      ? `/patient/sessions/${payment.sessionId}`
                      : null;

                  return (
                    <tr
                      key={payment.id}
                      className="transition-colors hover:bg-surface-tertiary/40 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                            {sessionLabel}
                          </p>
                          <p className="mt-1 truncate text-xs text-text-secondary">
                            {practitionerLabel}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-text-secondary">
                        {t(resolveRelevantDate(payment).labelKey as Parameters<typeof t>[0])}{" "}
                        {formatDate(resolveRelevantDate(payment).isoString, numLocale)}
                      </td>
                      <td className="px-4 py-4 text-sm text-text-secondary">
                        {t(resolvePaymentMethodKey(payment) as Parameters<typeof t>[0])}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold tabular-nums text-text-primary dark:text-white/95">
                        {formatPatientMoney(numLocale, payment.amountTotal, payment.currency, {
                          fallbackText: "?",
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            STATUS_STYLES[payment.status] ?? "bg-surface-tertiary text-text-muted"
                          }`}
                        >
                          {t(resolvePaymentStatusKey(payment.status) as Parameters<typeof t>[0])}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {actionHref ? (
                          <Link
                            href={actionHref as never}
                            aria-label={t("history.table.columns.action")}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-white text-text-secondary transition hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/80"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Link>
                        ) : (
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-surface-tertiary text-text-muted dark:bg-white/10">
                            <ArrowLeft className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 sm:px-6">
            <StateCard
              icon={<Wallet className="h-6 w-6 text-primary" />}
              title={t("history.emptyHeading")}
              note={t("history.emptyNote")}
              action={{
                label: t("history.emptyAction"),
                href: (
                  <Link
                    href="/patient/sessions"
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  >
                    {t("history.emptyAction")}
                  </Link>
                ),
              }}
              className="rounded-[28px]"
            />
          </div>
        )}

        {visiblePayments.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border-light px-5 py-4 text-sm text-text-secondary dark:border-white/10 sm:px-6">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-3 py-2 text-xs font-medium text-text-primary transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-white/90"
            >
              <ChevronLeft className="h-4 w-4 rotate-180 rtl:rotate-0" />
              {t("history.pagination.previous")}
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 text-sm font-medium transition ${
                    pageNumber === safePage
                      ? "bg-primary text-white shadow-sm"
                      : "bg-transparent text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
              className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-3 py-2 text-xs font-medium text-text-primary transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-white/90"
            >
              {t("history.pagination.next")}
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
