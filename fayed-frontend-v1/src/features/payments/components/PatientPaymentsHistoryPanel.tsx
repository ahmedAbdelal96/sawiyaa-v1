"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CreditCard, RefreshCw } from "lucide-react";
import { usePatientPayments } from "../hooks/use-payments";
import {
  canContinuePayment,
  canRetryPayment,
  getPaymentPrimaryActionKey,
  getPaymentStatusNoteKey,
} from "../lib/payment-status";
import type { PaymentItem, PaymentStatus } from "../types/payments.types";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";

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

function PaymentCard({ payment }: { payment: PaymentItem }) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const { labelKey, isoString } = resolveRelevantDate(payment);
  const canContinue = canContinuePayment(payment);
  const canRetry = canRetryPayment(payment);
  const primaryActionKey = getPaymentPrimaryActionKey(payment);

  return (
    <div className="rounded-2xl border border-border-light bg-surface-secondary dark:bg-white/5">
      <div className="flex flex-col gap-2 px-5 pb-3 pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div>
          <p className="text-lg font-bold tabular-nums text-text-primary dark:text-white/95">
            {formatAmount(payment.amount, payment.currency, numLocale)}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {t(`history.provider.${payment.provider}` as Parameters<typeof t>[0])}
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

export default function PatientPaymentsHistoryPanel() {
  const t = useTranslations("payments");
  const { data, isLoading, isError, refetch } = usePatientPayments({ limit: 20 });

  if (isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-24" />;
  }

  if (isError) {
    return (
      <StateCard
        title={t("history.errorHeading")}
        note={t("history.errorNote")}
        action={{ label: t("history.retry"), onClick: () => refetch() }}
      />
    );
  }

  const payments = data?.items ?? [];

  if (payments.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <PaymentCard key={payment.id} payment={payment} />
      ))}
    </div>
  );
}
