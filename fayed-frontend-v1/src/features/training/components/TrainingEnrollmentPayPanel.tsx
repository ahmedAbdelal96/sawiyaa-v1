"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { StateCard } from "@/components/shared/ContentStates";
import StripePaymentForm from "@/features/payments/components/StripePaymentForm";
import { usePatientTrainingEnrollment } from "../hooks/use-training";
import { formatTrainingAmount } from "./training-utils";

type Props = {
  enrollmentId: string;
};

export default function TrainingEnrollmentPayPanel({ enrollmentId }: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const { data: enrollment, isLoading, isError, refetch } =
    usePatientTrainingEnrollment(enrollmentId);

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

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-[32px] border border-primary/15 bg-primary-light p-6 dark:border-primary/20 dark:bg-primary/10">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("patient.pay.heading")}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">{t("patient.pay.note")}</p>
          </div>
        </div>
      </section>

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

      {enrollment.payment.checkoutUrl ? (
        <section className="rounded-[32px] border border-border-light bg-surface-primary p-6 dark:bg-white/5">
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("patient.pay.hostedCheckoutHeading")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {t("patient.pay.hostedCheckoutNote")}
          </p>
          <a
            href={enrollment.payment.checkoutUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" />
            {t("patient.pay.openCheckout")}
          </a>
        </section>
      ) : null}

      {enrollment.payment.clientSecret ? (
        <StripePaymentForm
          clientSecret={enrollment.payment.clientSecret}
          netPaidAmount={enrollment.payment.amount}
          currency={enrollment.payment.currency}
          returnUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}/patient/training/${enrollment.id}`}
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
    </div>
  );
}
