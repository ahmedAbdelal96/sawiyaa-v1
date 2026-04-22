"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowDownLeft, ArrowUpRight, CreditCard, RefreshCw, Wallet } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { usePatientPayments, usePatientWalletEntries, usePatientWalletSummary } from "../hooks/use-payments";
import {
  canContinuePayment,
  canRetryPayment,
  getPaymentPrimaryActionKey,
  getPaymentStatusNoteKey,
} from "../lib/payment-status";
import type {
  CustomerWalletEntryItem,
  CustomerWalletEntryType,
  PaymentItem,
  PaymentProvider,
  PaymentStatus,
} from "../types/payments.types";

const STATUS_STYLES: Record<PaymentStatus, string> = {
  CREATED:
    "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60",
  PENDING: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  REQUIRES_ACTION:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  AUTHORIZED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  CAPTURED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  FAILED: "bg-error-50 text-error-700 dark:bg-error-500/12 dark:text-error-400",
  CANCELLED:
    "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/50",
  EXPIRED:
    "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/50",
  REFUND_PENDING:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  PARTIALLY_REFUNDED:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  REFUNDED:
    "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60",
};

function formatAmount(amount: string, currency: string, numLocale: string): string {
  return new Intl.NumberFormat(numLocale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(isoString: string, numLocale: string): string {
  return new Date(isoString).toLocaleDateString(numLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const DEFAULT_WALLET_CURRENCY = "SAR";

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

function resolveWalletEntryLabelKey(entryType: CustomerWalletEntryType): string {
  return `history.wallet.entries.type.${entryType}`;
}

function PaymentCard({ payment }: { payment: PaymentItem }) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const { labelKey, isoString } = resolveRelevantDate(payment);
  const canContinue = canContinuePayment(payment);
  const canRetry = canRetryPayment(payment);
  const primaryActionKey = getPaymentPrimaryActionKey(payment);

  const walletApplied = Number(payment.amountFromWallet) > 0;
  const gatewayApplied = Number(payment.amountFromGateway) > 0;

  return (
    <div className="rounded-2xl border border-border-light bg-surface-secondary dark:bg-white/5">
      <div className="flex flex-col gap-2 px-5 pb-3 pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div>
          <p className="text-lg font-bold tabular-nums text-text-primary dark:text-white/95">
            {formatAmount(payment.amountTotal, payment.currency, numLocale)}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {t(resolveProviderLabelKey(payment.provider) as Parameters<typeof t>[0])}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            STATUS_STYLES[payment.status] ?? "bg-surface-tertiary text-text-muted"
          }`}
        >
          {t(`history.status.${payment.status}` as Parameters<typeof t>[0])}
        </span>
      </div>

      <div className="mx-5 border-t border-border-light dark:border-white/10" />

      <div className="px-5 py-3">
        <p className="text-xs text-text-secondary">
          {t(labelKey as Parameters<typeof t>[0])} {formatDate(isoString, numLocale)}
        </p>

        {(walletApplied || gatewayApplied) && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border-light bg-white px-3 py-2 text-xs dark:bg-white/5">
              <p className="text-text-muted">{t("history.wallet.walletUsedLabel")}</p>
              <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
                {formatAmount(payment.amountFromWallet, payment.currency, numLocale)}
              </p>
            </div>
            <div className="rounded-xl border border-border-light bg-white px-3 py-2 text-xs dark:bg-white/5">
              <p className="text-text-muted">{t("history.wallet.gatewayUsedLabel")}</p>
              <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
                {formatAmount(payment.amountFromGateway, payment.currency, numLocale)}
              </p>
            </div>
          </div>
        )}

        <p className="mt-2 text-xs text-text-secondary">
          {t(getPaymentStatusNoteKey(payment.status) as Parameters<typeof t>[0])}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {(canContinue || canRetry) && payment.sessionId && primaryActionKey && (
            <Link
              href={`/patient/sessions/${payment.sessionId}/pay` as never}
              className="inline-flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover sm:w-auto sm:justify-start sm:py-1.5"
            >
              {canRetry && <RefreshCw size={11} />}
              {t(primaryActionKey as Parameters<typeof t>[0])}
            </Link>
          )}
          {payment.sessionId && (
            <Link
              href={`/patient/sessions/${payment.sessionId}` as never}
              className="text-center text-xs font-medium text-primary hover:underline sm:text-start"
            >
              {t("history.viewSession")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function WalletActivityCard({ entry }: { entry: CustomerWalletEntryItem }) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const isCredit = entry.direction === "CREDIT";

  return (
    <div className="flex items-start justify-between rounded-xl border border-border-light bg-white px-4 py-3 dark:bg-white/5">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${
            isCredit
              ? "bg-primary-light text-text-brand dark:bg-primary/20 dark:text-primary-light"
              : "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70"
          }`}
        >
          {isCredit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
        </span>
        <div>
          <p className="text-sm font-medium text-text-primary dark:text-white/90">
            {t(resolveWalletEntryLabelKey(entry.entryType) as Parameters<typeof t>[0])}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {formatDate(entry.effectiveAt, numLocale)}
          </p>
          {entry.description ? (
            <p className="mt-1 text-xs text-text-secondary">{entry.description}</p>
          ) : null}
        </div>
      </div>
      <p
        className={`text-sm font-semibold tabular-nums ${
          isCredit ? "text-text-brand dark:text-primary-light" : "text-text-primary dark:text-white/90"
        }`}
      >
        {isCredit ? "+" : "-"}
        {formatAmount(entry.amount, entry.currencyCode, numLocale)}
      </p>
    </div>
  );
}

export default function PatientPaymentsHistoryPanel() {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = usePatientPayments({ limit: DEFAULT_PAGE_LIMIT });

  const {
    data: walletSummaryData,
    isLoading: walletSummaryLoading,
    isError: walletSummaryError,
    refetch: refetchWalletSummary,
  } = usePatientWalletSummary();

  const {
    data: walletEntriesData,
    isLoading: walletEntriesLoading,
    isError: walletEntriesError,
    refetch: refetchWalletEntries,
  } = usePatientWalletEntries({ page: 1, limit: 6 });

  if (paymentsLoading) {
    return <ListStateSkeleton items={3} heightClass="h-24" />;
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
  const wallet = walletSummaryData?.item ?? null;
  const walletEntries = walletEntriesData?.items ?? [];
  const walletCurrencyCode =
    wallet?.currencyCode ??
    walletEntries[0]?.currencyCode ??
    payments[0]?.currency ??
    DEFAULT_WALLET_CURRENCY;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border-light bg-white p-4 dark:bg-surface-secondary">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-primary" />
            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("history.wallet.summaryHeading")}
            </p>
          </div>
          {walletSummaryError ? (
            <button
              type="button"
              onClick={() => refetchWalletSummary()}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("history.retry")}
            </button>
          ) : null}
        </div>

        {walletSummaryLoading ? (
          <div className="mt-3">
            <ListStateSkeleton items={1} heightClass="h-14" />
          </div>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border-light bg-surface-secondary px-3 py-3 dark:bg-white/5">
              <p className="text-xs text-text-muted">{t("history.wallet.availableLabel")}</p>
              <p className="mt-1 text-lg font-bold text-text-primary dark:text-white/95">
                {formatAmount(wallet?.availableBalance ?? "0", walletCurrencyCode, numLocale)}
              </p>
            </div>
            <div className="rounded-xl border border-border-light bg-surface-secondary px-3 py-3 dark:bg-white/5">
              <p className="text-xs text-text-muted">{t("history.wallet.reservedLabel")}</p>
              <p className="mt-1 text-lg font-semibold text-text-primary dark:text-white/90">
                {formatAmount(wallet?.reservedBalance ?? "0", walletCurrencyCode, numLocale)}
              </p>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-text-muted">{t("history.wallet.refundHint")}</p>
      </section>

      <section className="space-y-3">
        {payments.length > 0 ? (
          payments.map((payment) => <PaymentCard key={payment.id} payment={payment} />)
        ) : (
          <StateCard
            icon={<CreditCard size={36} className="text-text-muted" />}
            title={t("history.emptyHeading")}
            note={t("history.emptyNote")}
            action={{
              label: t("history.emptyAction"),
              href: (
                <Link
                  href="/patient/sessions"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  {t("history.emptyAction")}
                </Link>
              ),
            }}
          />
        )}
      </section>

      <section className="rounded-2xl border border-border-light bg-white p-4 dark:bg-surface-secondary">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-primary dark:text-white/90">
            {t("history.wallet.activityHeading")}
          </p>
          {walletEntriesError ? (
            <button
              type="button"
              onClick={() => refetchWalletEntries()}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("history.retry")}
            </button>
          ) : null}
        </div>

        {walletEntriesLoading ? (
          <div className="mt-3">
            <ListStateSkeleton items={2} heightClass="h-16" />
          </div>
        ) : walletEntries.length > 0 ? (
          <div className="mt-3 space-y-2">
            {walletEntries.map((entry) => (
              <WalletActivityCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">{t("history.wallet.activityEmpty")}</p>
        )}
      </section>
    </div>
  );
}
