"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, BadgeDollarSign, Clock3, Receipt, RefreshCcw, RotateCcw, Wallet, Radar } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import Button from "@/components/ui/button/Button";
import { toAppError } from "@/lib/api/errors";
import { getAdminPaymentErrorKey, ADMIN_PAYMENT_STATUS_STYLES, ADMIN_REFUND_STATUS_STYLES } from "../lib/admin-payment-status";
import { useAdminPaymentOpsDetails, useRequestAdminPaymentRefund, useRetryAdminPaymentRefund } from "../hooks/use-admin-payments";
import type {
  AdminPaymentEventItem,
  AdminPaymentOpsItem,
  AdminPaymentRefundItem,
  AdminPaymentPurpose,
  AdminRefundStatus,
} from "../types/admin-payments.types";

type Props = {
  paymentId: string;
};

const RETRYABLE_REFUND_STATUS: AdminRefundStatus = "FAILED";

function getOperationalRefundState(item: AdminPaymentOpsItem) {
  if (item.payment.status === "REFUNDED") {
    return "refunded";
  }

  if (
    item.payment.status === "REFUND_PENDING" ||
    item.refundSummary.requestedCount > 0 ||
    item.refundSummary.processingCount > 0
  ) {
    return "inFlight";
  }

  if (item.refunds.some((refund) => refund.status === RETRYABLE_REFUND_STATUS)) {
    return "retryAvailable";
  }

  if (item.refundSummary.totalCount > 0) {
    return "historyPresent";
  }

  return "noRefunds";
}

function getRefundControlState(item: AdminPaymentOpsItem) {
  if (item.payment.status === "REFUNDED") {
    return "fullyRefunded";
  }

  if (
    item.payment.status === "REFUND_PENDING" ||
    item.refundSummary.requestedCount > 0 ||
    item.refundSummary.processingCount > 0
  ) {
    return "refundInFlight";
  }

  return "requestAvailable";
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function formatMoney(value: string, currency: string, locale: string) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return `${value} ${currency}`;
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span
        className={`text-sm text-text-primary dark:text-white/90 ${mono ? "font-mono text-xs sm:text-sm" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-text-primary dark:text-white/95">{title}</h2>
      {note ? <p className="mt-1 text-sm leading-6 text-text-secondary">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PaymentStatusChip({ status }: { status: AdminPaymentOpsItem["payment"]["status"] }) {
  const t = useTranslations("admin-area");
  const className =
    ADMIN_PAYMENT_STATUS_STYLES[status] ??
    "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/60";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {t(`payments.paymentStatuses.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

function RefundStatusChip({ status }: { status: AdminRefundStatus }) {
  const t = useTranslations("admin-area");
  const className =
    ADMIN_REFUND_STATUS_STYLES[status] ??
    "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/60";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {t(`payments.refundStatuses.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

function RefundTimeline({
  paymentId,
  refunds,
}: {
  paymentId: string;
  refunds: AdminPaymentRefundItem[];
}) {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const retryRefund = useRetryAdminPaymentRefund();
  const [feedback, setFeedback] = useState<{
    refundId: string;
    kind: "success" | "error";
    key?: string;
  } | null>(null);

  if (refunds.length === 0) {
    return (
      <StateCard
        title={t("payments.states.noRefunds.heading")}
        note={t("payments.states.noRefunds.note")}
      />
    );
  }

  const handleRetry = async (refundId: string) => {
    setFeedback(null);

    try {
      await retryRefund.mutateAsync({ paymentId, refundId });
      setFeedback({ refundId, kind: "success" });
    } catch (error) {
      setFeedback({
        refundId,
        kind: "error",
        key: getAdminPaymentErrorKey(error),
      });
    }
  };

  return (
    <div className="space-y-3">
      {refunds.map((refund) => {
        const isRetryable = refund.status === RETRYABLE_REFUND_STATUS;
        const isActiveRetry =
          retryRefund.isPending && retryRefund.variables?.refundId === refund.id;

        return (
          <div
            key={refund.id}
            className="rounded-[24px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RefundStatusChip status={refund.status} />
                  <span className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {formatMoney(refund.amount, refund.currency, locale)}
                  </span>
                  <span className="text-xs text-text-muted">
                    {t(`payments.refundTypes.${refund.refundType}` as Parameters<typeof t>[0])}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {t("payments.refunds.requestedAt", {
                    date: formatDateTime(refund.requestedAt, locale),
                  })}
                </p>
              </div>

              {isRetryable ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleRetry(refund.id)}
                  disabled={retryRefund.isPending}
                  className="text-xs"
                >
                  {isActiveRetry ? (
                    <>
                      <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                      {t("payments.refunds.retrying")}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t("payments.refunds.retry")}
                    </>
                  )}
                </Button>
              ) : null}
            </div>

            <div className="mt-3 space-y-2 text-xs leading-5 text-text-secondary">
              {refund.reason ? (
                <p>
                  <span className="font-medium text-text-primary dark:text-white/90">
                    {t("payments.refunds.reasonLabel")}:
                  </span>{" "}
                  {refund.reason}
                </p>
              ) : null}
              {refund.providerRefundRef ? (
                <p className="font-mono text-[11px] text-text-muted">
                  {t("payments.refunds.providerRefundRef", {
                    value: refund.providerRefundRef,
                  })}
                </p>
              ) : null}
              {refund.processedAt ? (
                <p>
                  {t("payments.refunds.processedAt", {
                    date: formatDateTime(refund.processedAt, locale),
                  })}
                </p>
              ) : null}
              {refund.failedAt ? (
                <p>
                  {t("payments.refunds.failedAt", {
                    date: formatDateTime(refund.failedAt, locale),
                  })}
                </p>
              ) : null}
            </div>

            {feedback?.refundId === refund.id ? (
              <p
                className={`mt-3 text-xs ${
                  feedback.kind === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {feedback.kind === "success"
                  ? t("payments.refunds.retrySuccess")
                  : t((feedback.key ?? "payments.errors.generic") as Parameters<typeof t>[0])}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function EventsList({ events }: { events: AdminPaymentEventItem[] }) {
  const t = useTranslations("admin-area");
  const locale = useLocale();

  if (events.length === 0) {
    return (
      <StateCard
        title={t("payments.states.noEvents.heading")}
        note={t("payments.states.noEvents.note")}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li
          key={event.id}
          className="rounded-[22px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold text-text-primary dark:text-white/95">
                {event.eventType}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {formatDateTime(event.createdAt, locale)}
              </p>
            </div>
            {event.providerEventRef ? (
              <span className="rounded-full bg-surface-tertiary px-3 py-1 font-mono text-[11px] text-text-muted dark:bg-white/10">
                {event.providerEventRef}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function RefundRequestPanel({ paymentId }: { paymentId: string }) {
  const t = useTranslations("admin-area");
  const requestRefund = useRequestAdminPaymentRefund();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [feedbackKey, setFeedbackKey] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedbackKey(null);
    setFeedbackType(null);

    const normalizedAmount = amount.trim();
    const parsedAmount =
      normalizedAmount.length > 0 ? Number.parseFloat(normalizedAmount) : undefined;

    try {
      await requestRefund.mutateAsync({
        paymentId,
        data: {
          amount: parsedAmount,
          reason: reason.trim() || undefined,
        },
      });
      setAmount("");
      setReason("");
      setFeedbackType("success");
      setFeedbackKey("payments.refundForm.success");
    } catch (error) {
      const errorKey = getAdminPaymentErrorKey(error);
      setFeedbackType("error");
      setFeedbackKey(errorKey);
    }
  };

  return (
    <SectionCard title={t("payments.refundForm.heading")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
            {t("payments.refundForm.amountLabel")}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={t("payments.refundForm.amountPlaceholder")}
            className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
            {t("payments.refundForm.reasonLabel")}
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("payments.refundForm.reasonPlaceholder")}
            className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
          />
        </label>

        {feedbackKey ? (
          <p
            className={`text-xs ${
              feedbackType === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {t(feedbackKey as Parameters<typeof t>[0])}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={requestRefund.isPending}
          className="w-full sm:w-auto"
        >
          {requestRefund.isPending ? (
            <>
              <RefreshCcw className="h-4 w-4 animate-spin" />
              {t("payments.refundForm.submitting")}
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" />
              {t("payments.refundForm.submit")}
            </>
          )}
        </Button>
      </form>
    </SectionCard>
  );
}

function PaymentDetails({ item }: { item: AdminPaymentOpsItem }) {
  const t = useTranslations("admin-area");
  const locale = useLocale();

  return (
    <SectionCard title={t("payments.sections.payment")}>
      <div className="mb-4 flex flex-wrap gap-2">
        <PaymentStatusChip status={item.payment.status} />
        <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-white/10 dark:text-white/70">
          {t(`payments.purposes.${item.payment.purpose as AdminPaymentPurpose}` as Parameters<typeof t>[0])}
        </span>
      </div>

      <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
        <DetailRow label={t("payments.paymentFields.id")} value={item.payment.id} mono />
        <DetailRow
          label={t("payments.paymentFields.provider")}
          value={t(`payments.providers.${item.payment.provider}` as Parameters<typeof t>[0])}
        />
        <DetailRow
          label={t("payments.paymentFields.amountTotal")}
          value={formatMoney(item.payment.amountTotal, item.payment.currency, locale)}
        />
        <DetailRow
          label={t("payments.paymentFields.subtotal")}
          value={formatMoney(item.payment.amountSubtotal, item.payment.currency, locale)}
        />
        <DetailRow
          label={t("payments.paymentFields.discount")}
          value={formatMoney(item.payment.amountDiscount, item.payment.currency, locale)}
        />
        <DetailRow label={t("payments.paymentFields.currency")} value={item.payment.currency} />
        <DetailRow
          label={t("payments.paymentFields.createdAt")}
          value={formatDateTime(item.payment.createdAt, locale)}
        />
        <DetailRow
          label={t("payments.paymentFields.initiatedAt")}
          value={formatDateTime(item.payment.initiatedAt, locale)}
        />
        <DetailRow
          label={t("payments.paymentFields.capturedAt")}
          value={formatDateTime(item.payment.capturedAt, locale)}
        />
        <DetailRow
          label={t("payments.paymentFields.failedAt")}
          value={formatDateTime(item.payment.failedAt, locale)}
        />
        <DetailRow
          label={t("payments.paymentFields.expiredAt")}
          value={formatDateTime(item.payment.expiredAt, locale)}
        />
        <DetailRow
          label={t("payments.paymentFields.providerPaymentId")}
          value={item.payment.providerPaymentId ?? "-"}
          mono
        />
        <DetailRow
          label={t("payments.paymentFields.providerReference")}
          value={item.payment.providerReference ?? "-"}
          mono
        />
      </div>
    </SectionCard>
  );
}

function OperationalSnapshot({ item }: { item: AdminPaymentOpsItem }) {
  const t = useTranslations("admin-area");
  const refundState = getOperationalRefundState(item);
  const controlState = getRefundControlState(item);

  return (
    <SectionCard title={t("payments.sections.snapshot")}>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("payments.snapshotCards.paymentState.label")}
          </p>
          <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
            {t(
              `payments.paymentStatuses.${item.payment.status}` as Parameters<typeof t>[0],
            )}
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {t(
              `payments.snapshotCards.paymentState.notes.${item.payment.status}` as Parameters<
                typeof t
              >[0],
            )}
          </p>
        </div>

        <div className="rounded-[24px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("payments.snapshotCards.refundState.label")}
          </p>
          <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
            {t(
              `payments.snapshotCards.refundState.states.${refundState}.title` as Parameters<
                typeof t
              >[0],
            )}
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {t(
              `payments.snapshotCards.refundState.states.${refundState}.note` as Parameters<
                typeof t
              >[0],
            )}
          </p>
        </div>

        <div className="rounded-[24px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("payments.snapshotCards.controls.label")}
          </p>
          <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
            {t(
              `payments.snapshotCards.controls.states.${controlState}.title` as Parameters<
                typeof t
              >[0],
            )}
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {t(
              `payments.snapshotCards.controls.states.${controlState}.note` as Parameters<
                typeof t
              >[0],
            )}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

function SessionDetails({ item }: { item: AdminPaymentOpsItem }) {
  const t = useTranslations("admin-area");
  const locale = useLocale();

  if (!item.session) {
    return (
      <SectionCard title={t("payments.sections.session")}>
        <StateCard
          title={t("payments.states.noSession.heading")}
          note={t("payments.states.noSession.note")}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t("payments.sections.session")}>
      <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
        <DetailRow label={t("payments.sessionFields.id")} value={item.session.id} mono />
        <DetailRow
          label={t("payments.sessionFields.status")}
          value={t(`payments.sessionStatuses.${item.session.status}` as Parameters<typeof t>[0])}
        />
        <DetailRow
          label={t("payments.sessionFields.mode")}
          value={t(`payments.sessionModes.${item.session.sessionMode}` as Parameters<typeof t>[0])}
        />
        <DetailRow
          label={t("payments.sessionFields.provider")}
          value={t(`payments.sessionProviders.${item.session.provider}` as Parameters<typeof t>[0])}
        />
        <DetailRow
          label={t("payments.sessionFields.scheduledStartAt")}
          value={formatDateTime(item.session.scheduledStartAt, locale)}
        />
        <DetailRow
          label={t("payments.sessionFields.scheduledEndAt")}
          value={formatDateTime(item.session.scheduledEndAt, locale)}
        />
        <DetailRow
          label={t("payments.sessionFields.providerRoomId")}
          value={item.session.providerRoomId ?? "-"}
          mono
        />
        <DetailRow
          label={t("payments.sessionFields.providerSessionRef")}
          value={item.session.providerSessionRef ?? "-"}
          mono
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border-light bg-surface-secondary/70 px-4 py-3 text-sm text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
        <div>
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("payments.sessionRuntime.heading")}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {t("payments.sessionRuntime.note")}
          </p>
        </div>
        <Link
          href={`/admin/sessions/runtime-inspection?sessionId=${item.session.id}` as never}
          className="inline-flex items-center gap-2 rounded-full border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-primary/30 hover:text-primary"
        >
          <Radar className="h-3.5 w-3.5" />
          {t("payments.sessionRuntime.action")}
        </Link>
      </div>
    </SectionCard>
  );
}

export default function AdminPaymentOpsScreen({ paymentId }: Props) {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const payment = useAdminPaymentOpsDetails(paymentId);

  if (payment.isLoading) {
    return (
      <div className="space-y-5">
        <div className="app-panel rounded-[28px] p-5 sm:p-6">
          <ListStateSkeleton items={1} heightClass="h-28" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
          <div className="space-y-5">
            <ListStateSkeleton items={3} heightClass="h-52" />
          </div>
          <div className="space-y-5">
            <ListStateSkeleton items={3} heightClass="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (payment.isError || !payment.data) {
    const error = payment.error ? toAppError(payment.error) : null;
    const isNotFound = error?.statusCode === 404 || error?.code === "PAYMENT_NOT_FOUND";

    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={
            isNotFound ? (
              <Receipt className="h-8 w-8 text-text-muted" />
            ) : (
              <Clock3 className="h-8 w-8 text-text-muted" />
            )
          }
          title={
            isNotFound
              ? t("payments.states.notFound.heading")
              : t("payments.states.detailError.heading")
          }
          note={
            isNotFound
              ? t("payments.states.notFound.note")
              : t("payments.states.detailError.note")
          }
          action={{
            label: t("payments.states.detailError.retry"),
            href: (
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {!isNotFound ? (
                  <button
                    type="button"
                    onClick={() => payment.refetch()}
                    className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
                  >
                    {t("payments.states.detailError.retry")}
                  </button>
                ) : null}
                <Link
                  href="/admin/payments"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  {t("payments.states.detailError.back")}
                </Link>
              </div>
            ),
          }}
        />
      </div>
    );
  }

  const item = payment.data.item;
  const refundControlState = getRefundControlState(item);

  return (
    <div className="space-y-5">
      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <ActionIconLink
          href="/admin/payments"
          intent="view"
          label={locale.startsWith("ar") ? "العودة إلى مراجعة المدفوعات" : "Back to payments review"}
          icon={<DirectionalArrowIcon direction="back" className="h-4 w-4" />}
          className="mb-3"
        />

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("payments.detail.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("payments.detail.title")}
            </h1>
            <p className="mt-2 font-mono text-sm text-text-secondary">{item.payment.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PaymentStatusChip status={item.payment.status} />
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-white/10 dark:text-white/70">
              <BadgeDollarSign className="h-3.5 w-3.5" />
              {formatMoney(item.payment.amountTotal, item.payment.currency, locale)}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <PaymentDetails item={item} />
          <OperationalSnapshot item={item} />
          <SessionDetails item={item} />

          <SectionCard title={t("payments.sections.events")}>
            <EventsList events={item.recentEvents} />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard
            title={t("payments.sections.refundSummary")}
          >
            <div className="space-y-3 rounded-[24px] border border-border-light px-4 py-1 dark:border-white/8">
              <DetailRow
                label={t("payments.refundSummaryFields.totalCount")}
                value={String(item.refundSummary.totalCount)}
              />
              <DetailRow
                label={t("payments.refundSummaryFields.requestedCount")}
                value={String(item.refundSummary.requestedCount)}
              />
              <DetailRow
                label={t("payments.refundSummaryFields.processingCount")}
                value={String(item.refundSummary.processingCount)}
              />
              <DetailRow
                label={t("payments.refundSummaryFields.succeededCount")}
                value={String(item.refundSummary.succeededCount)}
              />
              <DetailRow
                label={t("payments.refundSummaryFields.failedCount")}
                value={String(item.refundSummary.failedCount)}
              />
              <DetailRow
                label={t("payments.refundSummaryFields.cancelledCount")}
                value={String(item.refundSummary.cancelledCount)}
              />
              <DetailRow
                label={t("payments.refundSummaryFields.totalRefundedAmount")}
                value={formatMoney(
                  item.refundSummary.totalRefundedAmount,
                  item.payment.currency,
                  locale,
                )}
              />
              <DetailRow
                label={t("payments.refundSummaryFields.lastRefundAt")}
                value={formatDateTime(item.refundSummary.lastRefundAt, locale)}
              />
            </div>
          </SectionCard>

          {refundControlState === "requestAvailable" ? (
            <RefundRequestPanel paymentId={paymentId} />
          ) : (
            <SectionCard
              title={t("payments.refundForm.heading")}
            >
              <StateCard
                title={t(
                  `payments.refundForm.states.${refundControlState}.heading` as Parameters<
                    typeof t
                  >[0],
                )}
                note={t(
                  `payments.refundForm.states.${refundControlState}.note` as Parameters<
                    typeof t
                  >[0],
                )}
              />
            </SectionCard>
          )}

          <SectionCard
            title={t("payments.sections.refunds")}
          >
            <RefundTimeline paymentId={paymentId} refunds={item.refunds} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
