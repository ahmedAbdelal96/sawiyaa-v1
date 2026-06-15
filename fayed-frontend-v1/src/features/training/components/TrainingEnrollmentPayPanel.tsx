"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, ExternalLink } from "lucide-react";
import { StateCard } from "@/components/shared/ContentStates";
import PaymentCheckoutShell from "@/features/payments/components/PaymentCheckoutShell";
import StripePaymentForm from "@/features/payments/components/StripePaymentForm";
import { usePatientTrainingEnrollment } from "../hooks/use-training";
import {
  buildTrainingPaymentRedirectUrl,
  buildTrainingPaymentReturnUrl,
  formatTrainingAmount,
} from "./training-utils";

type Props = {
  enrollmentId: string;
};

export default function TrainingEnrollmentPayPanel({ enrollmentId }: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const { data: enrollment, isLoading, isError, refetch } =
    usePatientTrainingEnrollment(enrollmentId);
  const paymentReturnUrl =
    typeof window !== "undefined"
      ? buildTrainingPaymentReturnUrl({
          locale,
          enrollmentId,
          origin: window.location.origin,
        })
      : "";
  const paymentRedirectUrl =
    paymentReturnUrl && enrollment?.payment
      ? buildTrainingPaymentRedirectUrl({
          enrollmentId: enrollment.id,
          returnUrl: paymentReturnUrl,
        })
      : "";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded-xl bg-surface-tertiary dark:bg-white/10" />
        <div className="h-24 animate-pulse rounded-[28px] bg-surface-tertiary dark:bg-white/10" />
        <div className="h-56 animate-pulse rounded-[28px] bg-surface-tertiary dark:bg-white/10" />
      </div>
    );
  }

  if (isError || !enrollment) {
    return (
      <StateCard
        title={t("patient.pay.states.error.heading")}
        note={t("patient.pay.states.error.note")}
        action={{ label: t("patient.pay.states.error.retry"), onClick: () => refetch() }}
      />
    );
  }

  if (enrollment.enrollmentStatus !== "PENDING_PAYMENT" || !enrollment.payment) {
    return (
      <StateCard
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        title={t("patient.pay.states.notPayable.heading")}
        note={t("patient.pay.states.notPayable.note")}
        action={{
          href: (
            <Link
              href={`/patient/training/${enrollment.id}` as never}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              {t("patient.pay.states.notPayable.action")}
            </Link>
          ),
          label: t("patient.pay.states.notPayable.action"),
        }}
      />
    );
  }

  const amountLabel = formatTrainingAmount(
    enrollment.payment.amount,
    enrollment.payment.currency,
    locale,
  );

  const paymentSummary = (
    <section className="rounded-[32px] border border-border-light bg-surface-primary p-6 dark:bg-white/5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
        {t("patient.pay.summaryHeading")}
      </p>
      <p className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">
        {enrollment.courseTitle}
      </p>
      <p className="mt-1 text-sm text-text-secondary">
        {t("patient.pay.scheduleCode", { code: enrollment.scheduleCode })}
      </p>
      <p className="mt-4 text-sm font-medium text-text-primary dark:text-white/90">
        {t("patient.pay.amount", { amount: amountLabel })}
      </p>
    </section>
  );

  const paymentSidebar = (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
        {t("patient.pay.summaryHeading")}
      </p>
      <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/90">
        {enrollment.courseTitle}
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        {t("patient.pay.scheduleCode", { code: enrollment.scheduleCode })}
      </p>
      <p className="mt-4 text-lg font-bold text-primary">{amountLabel}</p>
      <p className="mt-2 rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-xs text-text-muted dark:bg-white/5">
        {t("patient.pay.note")}
      </p>
    </>
  );

  return (
    <PaymentCheckoutShell
      backHref={`/patient/training/${enrollment.id}`}
      backLabel={t("patient.pay.backToEnrollment")}
      eyebrow={t("patient.pay.heading")}
      title={t("patient.pay.heading")}
      description={t("patient.pay.note")}
      summary={paymentSummary}
      sidebar={paymentSidebar}
    >
      {enrollment.payment.checkoutUrl && enrollment.payment.provider !== "STRIPE" ? (
        <section className="rounded-[32px] border border-border-light bg-surface-primary p-6 dark:bg-white/5">
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("patient.pay.hostedCheckoutHeading")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {t("patient.pay.hostedCheckoutNote")}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!paymentRedirectUrl) return;
              window.location.assign(paymentRedirectUrl);
            }}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" />
            {t("patient.pay.openCheckout")}
          </button>
        </section>
      ) : null}

      {enrollment.payment.provider === "STRIPE" && enrollment.payment.clientSecret ? (
        <StripePaymentForm
          clientSecret={enrollment.payment.clientSecret}
          netPaidAmount={enrollment.payment.amount}
          currency={enrollment.payment.currency}
          returnUrl={paymentReturnUrl}
        />
      ) : null}

      {!enrollment.payment.checkoutUrl && !enrollment.payment.clientSecret ? (
        <StateCard
          title={t("patient.pay.states.noRuntime.heading")}
          note={t("patient.pay.states.noRuntime.note")}
          action={{
            href: (
              <Link
                href={`/patient/training/${enrollment.id}` as never}
                className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-secondary dark:text-white/90 dark:hover:bg-white/5"
              >
                {t("patient.pay.states.noRuntime.action")}
              </Link>
            ),
            label: t("patient.pay.states.noRuntime.action"),
          }}
        />
      ) : null}
    </PaymentCheckoutShell>
  );
}
