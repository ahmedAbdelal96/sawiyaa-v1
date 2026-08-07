"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  Clock3,
  Receipt,
  RefreshCcw,
  RotateCcw,
  Wallet,
  Radar,
  ChevronDown,
  User,
  Calendar,
  CheckCircle,
  FileText,
  AlertCircle
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import AdminSessionReference from "@/components/shared/admin/AdminSessionReference";
import Button from "@/components/ui/button/Button";
import { toAppError } from "@/lib/api/errors";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { PermissionKey } from "@/lib/auth/permissions";
import { getAdminPaymentErrorKey, ADMIN_PAYMENT_STATUS_STYLES, ADMIN_REFUND_STATUS_STYLES } from "../lib/admin-payment-status";
import { useAdminPaymentOpsDetails, useRequestAdminPaymentRefund, useRetryAdminPaymentRefund } from "../hooks/use-admin-payments";
import { formatAdminMoneyForLocale as formatMoney } from "@/features/admin/finance/lib/finance-formatters";
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

  return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
      <span className="text-sm text-text-muted">{label}</span>
      <span
        className={`text-sm font-medium text-text-primary dark:text-white/90 ${mono ? "font-mono text-xs sm:text-sm" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  note,
  icon,
  children,
}: {
  title: string;
  note?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="app-panel rounded-[24px] border border-border-light/80 p-5 dark:border-white/8 dark:bg-white/[0.02]">
      <div className="flex items-center gap-2.5">
        {icon ? <span className="text-text-brand">{icon}</span> : null}
        <h2 className="text-base font-semibold text-text-primary dark:text-white/95">{title}</h2>
      </div>
      {note ? <p className="mt-1 text-xs text-text-secondary leading-normal">{note}</p> : null}
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
  currency,
  canRetry,
}: {
  paymentId: string;
  refunds: AdminPaymentRefundItem[];
  currency: string;
  canRetry: boolean;
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
      <div className="rounded-xl border border-dashed border-border-light p-5 text-center text-sm text-text-muted">
        {t("payments.states.noRefunds.note")}
      </div>
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
            className="rounded-2xl border border-border-light bg-surface-secondary/50 p-4 dark:border-white/8 dark:bg-white/[0.02]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RefundStatusChip status={refund.status} />
                  <span className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {formatMoney(locale, refund.amount, currency)}
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

              {isRetryable && canRetry ? (
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

function EventsTimeline({ events }: { events: AdminPaymentEventItem[] }) {
  const t = useTranslations("admin-area");
  const locale = useLocale();

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-light p-5 text-center text-sm text-text-muted">
        {t("payments.states.noEvents.note")}
      </div>
    );
  }

  const translateEvent = (type: string) => {
    if (locale === "ar") {
      switch (type) {
        case "PAYMENT_CREATED": return "تم إنشاء الدفعة";
        case "PAYMENT_CAPTURED": return "تم التحصيل";
        case "PAYMENT_FAILED": return "فشل الدفع";
        case "REFUND_REQUESTED": return "تم طلب الاسترداد";
        case "REFUND_PROCESSING": return "قيد معالجة الاسترداد";
        case "REFUND_SUCCEEDED": return "تم الاسترداد بنجاح";
        case "REFUND_FAILED": return "فشل الاسترداد";
        default: return type;
      }
    }
    return type;
  };

  return (
    <div className="relative border-s border-border-light pl-4 rtl:border-s-0 rtl:border-e rtl:pl-0 rtl:pr-4 dark:border-white/8 space-y-4">
      {events.map((event) => (
        <div key={event.id} className="relative">
          <span className="absolute -left-[21px] rtl:-right-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary ring-4 ring-white dark:ring-slate-900" />
          <div className="rounded-xl border border-border-light bg-surface-secondary/40 p-3 dark:border-white/8 dark:bg-white/[0.01]">
            <p className="text-xs font-semibold text-text-primary dark:text-white/95">
              {translateEvent(event.eventType)}
            </p>
            <p className="mt-0.5 text-[10px] text-text-muted">
              {formatDateTime(event.createdAt, locale)}
            </p>
            {event.providerEventRef ? (
              <span className="mt-1.5 inline-block rounded bg-surface-tertiary px-1.5 py-0.5 font-mono text-[9px] text-text-muted dark:bg-white/10">
                {event.providerEventRef}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
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

export default function AdminPaymentOpsScreen({ paymentId }: Props) {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const router = useRouter();
  const payment = useAdminPaymentOpsDetails(paymentId);
  const [metadataOpen, setMetadataOpen] = useState(false);

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
  const permissionQuery = useCurrentUserPermissions(true);
  const permissions = permissionQuery.data?.permissions ?? [];
  const canRequestRefund = permissions.includes(PermissionKey.REFUNDS_APPROVE);
  const canRetryRefund = permissions.includes(PermissionKey.REFUNDS_RETRY);
  const refundControlState = getRefundControlState(item);

  return (
    <div className="space-y-6">
      {/* ── HEADER SECTION ── */}
      <section className="app-panel rounded-[28px] border border-border-light p-6 dark:border-white/8 dark:bg-white/[0.01]">
        <ActionIconLink
          href="/admin/payments"
          intent="view"
          label={locale.startsWith("ar") ? "العودة إلى مراجعة المدفوعات" : "Back to payments review"}
          icon={<DirectionalArrowIcon direction="back" className="h-4 w-4" />}
          className="mb-4"
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {locale === "ar" ? "تفاصيل الدفعة" : "Payment Details"}
            </h1>
            <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
              {locale === "ar"
                ? "راجع بيانات عملية الدفع وحالة التحصيل والاسترداد والجلسة أو التسوية المرتبطة بها."
                : "Review payment collection status, refund status, and related session or settlement."}
            </p>
            <div className="pt-1 font-mono text-xs text-text-muted select-all">
              ID: {item.payment.id}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <PaymentStatusChip status={item.payment.status} />
            {item.refundSummary.totalCount > 0 ? (
              <span className="rounded-full bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-200/55 dark:border-amber-900/30">
                {locale === "ar" ? "تم الاسترداد جزئيًا" : "Refunded"}
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-xs font-semibold text-text-secondary">
              {t(`payments.providers.${item.payment.provider}` as Parameters<typeof t>[0])}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3.5 py-1 text-sm font-bold text-text-brand border border-primary/10">
              <BadgeDollarSign className="h-4 w-4" />
              {formatMoney(locale, item.payment.amountTotal, item.payment.currency)}
            </span>
          </div>
        </div>
      </section>

      {/* ── TWO COLUMN MAIN LAYOUT ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(350px,0.85fr)]">
        
        {/* LEFT COLUMN: PRIMARY DETAILS */}
        <div className="space-y-6">
          
          {/* Section 1: Payment Summary */}
          <SectionCard title={t("payments.sections.payment")} icon={<Receipt className="h-5 w-5" />}>
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 rounded-[20px] border border-border-light bg-surface-secondary/35 p-5 dark:border-white/8 dark:bg-white/[0.005]">
              <DetailRow label={t("payments.paymentFields.providerPaymentId")} value={item.payment.providerPaymentId ?? "-"} mono />
              <DetailRow label={t("payments.paymentFields.providerReference")} value={item.payment.providerReference ?? "-"} mono />
              <DetailRow label={t("payments.paymentFields.amountTotal")} value={formatMoney(locale, item.payment.amountTotal, item.payment.currency)} />
              <DetailRow label={t("payments.paymentFields.subtotal")} value={formatMoney(locale, item.payment.amountSubtotal, item.payment.currency)} />
              <DetailRow label={t("payments.paymentFields.discount")} value={formatMoney(locale, item.payment.amountDiscount, item.payment.currency)} />
              <DetailRow label={t("payments.paymentFields.currency")} value={item.payment.currency} />
              <DetailRow label={t("payments.paymentFields.createdAt")} value={formatDateTime(item.payment.createdAt, locale)} />
              <DetailRow label={t("payments.paymentFields.initiatedAt")} value={formatDateTime(item.payment.initiatedAt, locale)} />
              <DetailRow label={t("payments.paymentFields.capturedAt")} value={formatDateTime(item.payment.capturedAt, locale)} />
              <DetailRow label={t("payments.paymentFields.failedAt")} value={formatDateTime(item.payment.failedAt, locale)} />
              <DetailRow label={t("payments.paymentFields.expiredAt")} value={formatDateTime(item.payment.expiredAt, locale)} />
            </div>
          </SectionCard>

          {/* Section 2: Related Customer & Session */}
          <SectionCard title={t("payments.sections.session")} icon={<Calendar className="h-5 w-5" />}>
            {!item.session ? (
              <div className="rounded-xl border border-dashed border-border-light p-6 text-center text-sm text-text-muted">
                {locale === "ar" ? "لا توجد جلسة مرتبطة بهذه الدفعة" : "No session is associated with this payment."}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 rounded-[20px] border border-border-light bg-surface-secondary/35 p-5 dark:border-white/8 dark:bg-white/[0.005]">
                  <div className="flex items-center justify-between gap-4 border-b border-border-light py-3"><span className="text-sm text-text-muted">{locale === "ar" ? "كود الجلسة" : "Session Code"}</span><AdminSessionReference sessionId={item.session.id} sessionCode={item.session.sessionCode} href={`/admin/sessions/runtime-inspection?sessionId=${item.session.id}`} variant="detail" copyable /></div>
                  <DetailRow label={t("payments.sessionFields.status")} value={t(`payments.sessionStatuses.${item.session.status}` as Parameters<typeof t>[0])} />
                  <DetailRow label={t("payments.sessionFields.mode")} value={t(`payments.sessionModes.${item.session.sessionMode}` as Parameters<typeof t>[0])} />
                  <DetailRow label={t("payments.sessionFields.provider")} value={t(`payments.sessionProviders.${item.session.provider}` as Parameters<typeof t>[0])} />
                  <DetailRow label={t("payments.sessionFields.scheduledStartAt")} value={formatDateTime(item.session.scheduledStartAt, locale)} />
                  <DetailRow label={t("payments.sessionFields.scheduledEndAt")} value={formatDateTime(item.session.scheduledEndAt, locale)} />
                </div>
                
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary-light/40 border border-primary/10 p-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-text-brand">
                      {t("payments.sessionRuntime.heading")}
                    </p>
                    <p className="text-xs text-text-muted">
                      {t("payments.sessionRuntime.note")}
                    </p>
                  </div>
                  <Link
                    href={`/admin/sessions/runtime-inspection?sessionId=${item.session.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-primary/30 hover:text-primary hover:shadow-sm"
                  >
                    <Radar className="h-3.5 w-3.5 text-primary" />
                    {t("payments.sessionRuntime.action")}
                  </Link>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Section 3: Related Settlement */}
          <SectionCard title={t("payments.settlementFields.title")} icon={<FileText className="h-5 w-5" />}>
            {!item.relatedSettlement ? (
              <div className="rounded-xl border border-dashed border-border-light p-6 text-center text-sm text-text-muted">
                {t("payments.settlementFields.noSettlement")}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 rounded-[20px] border border-border-light bg-surface-secondary/35 p-5 dark:border-white/8 dark:bg-white/[0.005]">
                  <DetailRow label={locale === "ar" ? "رقم المراجعة المحاسبية" : "Accounting review ID"} value={item.relatedSettlement.reviewId} mono />
                  <DetailRow label={t("payments.settlementFields.status")} value={item.relatedSettlement.status} />
                  <DetailRow label={t("payments.settlementFields.practitioner")} value={item.relatedSettlement.practitionerName} />
                  <DetailRow label={locale === "ar" ? "المبلغ الأصلي للجلسة" : "Session amount"} value={formatMoney(locale, item.relatedSettlement.originalAmount, item.relatedSettlement.originalCurrency)} />
                  <DetailRow label={t("payments.settlementFields.finalAmount")} value={formatMoney(locale, item.relatedSettlement.finalAmount, item.relatedSettlement.walletCurrency)} />
                  <DetailRow label={t("payments.settlementFields.walletCurrency")} value={item.relatedSettlement.walletCurrency} />
                </div>
                
                <div className="flex justify-end">
                  <Link
                    href={`/admin/settlements/${item.relatedSettlement.reviewId}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-primary-hover shadow-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-white/90" />
                    {t("payments.settlementFields.openSettlement")}
                  </Link>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* RIGHT COLUMN: REFUNDS & TIMELINE */}
        <div className="space-y-6">
          
          {/* Section 4: Refund Management Summary */}
          <SectionCard title={t("payments.sections.refundSummary")} icon={<Wallet className="h-5 w-5" />}>
            <div className="space-y-1.5 rounded-[20px] border border-border-light bg-surface-secondary/35 p-4 dark:border-white/8 dark:bg-white/[0.005]">
              <DetailRow label={t("payments.refundSummaryFields.totalCount")} value={String(item.refundSummary.totalCount)} />
              <DetailRow label={t("payments.refundSummaryFields.requestedCount")} value={String(item.refundSummary.requestedCount)} />
              <DetailRow label={t("payments.refundSummaryFields.processingCount")} value={String(item.refundSummary.processingCount)} />
              <DetailRow label={t("payments.refundSummaryFields.succeededCount")} value={String(item.refundSummary.succeededCount)} />
              <DetailRow label={t("payments.refundSummaryFields.failedCount")} value={String(item.refundSummary.failedCount)} />
              <DetailRow label={t("payments.refundSummaryFields.cancelledCount")} value={String(item.refundSummary.cancelledCount)} />
              <DetailRow label={t("payments.refundSummaryFields.totalRefundedAmount")} value={formatMoney(locale, item.refundSummary.totalRefundedAmount, item.payment.currency)} />
              <DetailRow label={t("payments.refundSummaryFields.lastRefundAt")} value={formatDateTime(item.refundSummary.lastRefundAt, locale)} />
            </div>
          </SectionCard>

          {/* Refund request controls */}
          {refundControlState === "requestAvailable" && canRequestRefund ? (
            <RefundRequestPanel paymentId={paymentId} />
          ) : (
            <SectionCard title={t("payments.refundForm.heading")} icon={<AlertCircle className="h-5 w-5" />}>
              <StateCard
                title={t(`payments.refundForm.states.${refundControlState}.heading` as Parameters<typeof t>[0])}
                note={t(`payments.refundForm.states.${refundControlState}.note` as Parameters<typeof t>[0])}
              />
            </SectionCard>
          )}

          {/* Refund activity timeline */}
          <SectionCard title={t("payments.sections.refunds")} icon={<RotateCcw className="h-5 w-5" />}>
          <RefundTimeline paymentId={paymentId} refunds={item.refunds} currency={item.payment.currency} canRetry={canRetryRefund} />
          </SectionCard>

          {/* Section 5: Events Timeline */}
          <SectionCard title={t("payments.sections.events")} icon={<Clock3 className="h-5 w-5" />}>
            <EventsTimeline events={item.recentEvents} />
          </SectionCard>

          {/* Section 6: Provider Metadata (Collapsed) */}
          <div className="rounded-2xl border border-border-light bg-surface-secondary/40 overflow-hidden dark:border-white/8 dark:bg-white/[0.005]">
            <button
              onClick={() => setMetadataOpen(!metadataOpen)}
              className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-text-primary dark:text-white/95"
            >
              <span>{locale === "ar" ? "بيانات المزود الفنية" : "Technical Provider Metadata"}</span>
              <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-200 ${metadataOpen ? "rotate-180" : ""}`} />
            </button>
            
            {metadataOpen && (
              <div className="px-5 pb-5 border-t border-border-light/75 dark:border-white/8 space-y-1 text-xs">
                <DetailRow label="Transaction ID" value={item.payment.providerPaymentId ?? "-"} mono />
                <DetailRow label="Order Reference" value={item.payment.providerReference ?? "-"} mono />
                <DetailRow label="Gateway Provider" value={item.payment.provider} />
                <DetailRow label="Payment Status Raw" value={item.payment.status} mono />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
