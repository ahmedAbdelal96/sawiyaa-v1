"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, ExternalLink, Loader2, BadgeCheck, Clock3, ReceiptText } from "lucide-react";
import { StateCard } from "@/components/shared/ContentStates";
import { usePatientAcademyProgramEnrollment } from "../hooks/use-academy-programs";
import {
  buildPatientAcademyProgramPaymentRedirectUrl,
  buildPatientAcademyProgramPaymentReturnUrl,
} from "../lib/academy-program-navigation";
import {
  resolveAcademyProgramEnrollmentStatusLabel,
  resolveAcademyProgramLocalizedValue,
  resolveAcademyProgramPaymentStatusLabel,
} from "../lib/academy-program-localization";

function formatMoney(amount: string | null, currency: string | null, locale: string) {
  if (!amount || !currency) {
    return null;
  }

  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }

  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${amount} ${currency}`;
  }
}

function resolvePaymentStateKey(input: {
  enrollmentStatus: string;
  paymentStatus: string;
}) {
  if (input.enrollmentStatus === "CONFIRMED" || input.paymentStatus === "CAPTURED") {
    return "confirmed";
  }

  if (input.enrollmentStatus === "PENDING_PAYMENT") {
    if (input.paymentStatus === "FAILED") {
      return "failed";
    }

    if (input.paymentStatus === "EXPIRED") {
      return "expired";
    }

    if (input.paymentStatus === "CANCELLED") {
      return "cancelled";
    }

    if (input.paymentStatus === "PENDING" || input.paymentStatus === "CREATED") {
      return "pending";
    }

    return "payable";
  }

  if (input.enrollmentStatus === "CANCELLED") {
    return "cancelled";
  }

  if (input.enrollmentStatus === "EXPIRED") {
    return "expired";
  }

  return "unavailable";
}

export default function PatientAcademyProgramEnrollmentPayScreen({
  enrollmentId,
}: {
  enrollmentId: string;
}) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { data: enrollmentResponse, isLoading, isError, refetch } =
    usePatientAcademyProgramEnrollment(enrollmentId);
  const enrollment = enrollmentResponse?.item ?? null;

  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return buildPatientAcademyProgramPaymentReturnUrl({
      locale,
      enrollmentId,
      origin: window.location.origin,
    });
  }, [enrollmentId, locale]);

  const redirectUrl = useMemo(() => {
    if (!returnUrl) {
      return "";
    }

    return buildPatientAcademyProgramPaymentRedirectUrl({
      enrollmentId,
      returnUrl,
    });
  }, [enrollmentId, returnUrl]);

  const title = enrollment
    ? resolveAcademyProgramLocalizedValue({
        locale,
        primary: enrollment.program.titleAr,
        secondary: enrollment.program.titleEn,
        fallback: enrollment.program.title ?? enrollment.program.slug,
      })
    : "";
  const enrollmentStatusLabel = enrollment
    ? resolveAcademyProgramEnrollmentStatusLabel(enrollment.status, t)
    : "";
  const paymentStatusLabel = enrollment
    ? resolveAcademyProgramPaymentStatusLabel(enrollment.paymentStatus, t)
    : "";
  const amountLabel =
    enrollment
      ? formatMoney(
          enrollment.payment?.amountTotal ?? enrollment.selectedAmountSnapshot,
          enrollment.payment?.currencyCode ?? enrollment.selectedCurrencyCode,
          locale,
        ) ?? t("public.detail.free")
      : t("public.detail.free");
  const paymentStateKey = enrollment
    ? resolvePaymentStateKey({
        enrollmentStatus: enrollment.status,
        paymentStatus: enrollment.paymentStatus,
      })
    : "unavailable";
  const paymentStateTitle = t(`patient.pay.state.${paymentStateKey}.title`);
  const paymentStateNote = t(`patient.pay.state.${paymentStateKey}.note`);
  const actionLabel = t(`patient.pay.state.${paymentStateKey}.cta`);
  const canPay = Boolean(enrollment && enrollment.status === "PENDING_PAYMENT" && enrollment.payment);
  const handleContinue = () => {
    if (!redirectUrl) {
      return;
    }

    setIsRedirecting(true);
    window.location.assign(redirectUrl);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <div className="h-72 animate-pulse rounded-[28px] border border-border-light bg-surface-tertiary" />
      </div>
    );
  }

  if (isError || !enrollment) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <StateCard
          icon={<AlertCircle size={40} className="text-primary" />}
          title={t("patient.pay.error.title")}
          note={t("patient.pay.error.note")}
          action={{
            label: t("patient.pay.error.retry"),
            onClick: () => refetch(),
          }}
          className="rounded-[28px]"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_16px_40px_-32px_rgba(31,42,45,0.18)] sm:p-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light/40 px-3.5 py-1.5 text-xs font-semibold text-primary">
            <Loader2 className="h-3.5 w-3.5" />
            {t("patient.pay.badge")}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-[2.4rem]">
              {t("patient.pay.title")}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
              {t("patient.pay.note")}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] border border-border-light bg-surface-tertiary px-4 py-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <ReceiptText className="h-3.5 w-3.5 text-primary" />
              <span>{t("patient.pay.summary.program")}</span>
            </div>
            <div className="mt-1.5 text-sm font-bold leading-relaxed text-text-primary">
              {title}
            </div>
          </div>
          <div className="rounded-[20px] border border-border-light bg-surface-tertiary px-4 py-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              <span>{t("patient.pay.summary.amount")}</span>
            </div>
            <div className="mt-1.5 text-sm font-bold leading-relaxed text-text-primary" dir="ltr">
              {amountLabel}
            </div>
          </div>
          <div className="rounded-[20px] border border-border-light bg-surface-tertiary px-4 py-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              <span>{t("patient.pay.summary.enrollmentStatus")}</span>
            </div>
            <div className="mt-1.5 text-sm font-bold leading-relaxed text-text-primary">
              {enrollmentStatusLabel}
            </div>
          </div>
          <div className="rounded-[20px] border border-border-light bg-surface-tertiary px-4 py-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <Clock3 className="h-3.5 w-3.5 text-primary" />
              <span>{t("patient.pay.summary.paymentStatus")}</span>
            </div>
            <div className="mt-1.5 text-sm font-bold leading-relaxed text-text-primary">
              {paymentStatusLabel}
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-[24px] border border-border-light bg-surface-tertiary p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {paymentStateTitle}
              </div>
              <h2 className="text-lg font-bold text-text-primary sm:text-xl">
                {paymentStateTitle}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
                {paymentStateNote}
              </p>
            </div>

            {canPay ? (
              <button
                type="button"
                onClick={handleContinue}
                disabled={isRedirecting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isRedirecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {actionLabel}
              </button>
            ) : (
              <Link
                href={`/patient/academy/program-enrollments/${enrollment.id}`}
                className="inline-flex w-full items-center justify-center rounded-[14px] border border-primary/15 bg-white px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary-light/30 sm:w-auto"
              >
                {actionLabel}
              </Link>
            )}
          </div>
        </section>

        <div className="mt-5 rounded-[20px] border border-border-light bg-white px-4 py-4">
          <p className="text-xs font-medium leading-relaxed text-text-secondary">
            {t("patient.pay.hostedCheckoutNote")}
          </p>
        </div>

      </section>
    </div>
  );
}
