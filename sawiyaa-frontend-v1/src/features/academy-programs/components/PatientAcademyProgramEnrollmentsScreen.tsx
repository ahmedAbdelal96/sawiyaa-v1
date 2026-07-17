"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  BookOpen,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Loader2,
  SearchX,
  Sparkles,
} from "lucide-react";
import { StateCard } from "@/components/shared/ContentStates";
import { usePatientAcademyProgramEnrollments } from "../hooks/use-academy-programs";
import {
  resolveAcademyProgramEnrollmentStatusLabel,
  resolveAcademyProgramLocalizedValue,
  resolveAcademyProgramPaymentStatusLabel,
} from "../lib/academy-program-localization";
import type { AcademyProgramEnrollmentItem } from "../types/academy-programs.types";

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

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

function resolveProgramTitle(enrollment: AcademyProgramEnrollmentItem, locale: string) {
  return (
    resolveAcademyProgramLocalizedValue({
      locale,
      primary: enrollment.program.titleAr,
      secondary: enrollment.program.titleEn,
      fallback: enrollment.program.title ?? enrollment.program.slug,
    }) || enrollment.program.slug
  );
}

function resolveProgramDescription(enrollment: AcademyProgramEnrollmentItem, locale: string) {
  return (
    resolveAcademyProgramLocalizedValue({
      locale,
      primary: enrollment.program.descriptionAr,
      secondary: enrollment.program.descriptionEn,
      fallback: enrollment.program.description ?? null,
    }) || null
  );
}

function resolveEnrollmentTone(status: AcademyProgramEnrollmentItem["status"]) {
  switch (status) {
    case "UPCOMING":
      return "success";
    case "PENDING_PAYMENT":
      return "warning";
    case "CANCELLED":
    case "EXPIRED":
      return "muted";
    default:
      return "default";
  }
}

function EnrollmentCard({
  enrollment,
  locale,
  t,
}: {
  enrollment: AcademyProgramEnrollmentItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const title = resolveProgramTitle(enrollment, locale);
  const description = resolveProgramDescription(enrollment, locale);
  const enrollmentStatusLabel = resolveAcademyProgramEnrollmentStatusLabel(
    enrollment.status,
    t,
  );
  const paymentStatusLabel = resolveAcademyProgramPaymentStatusLabel(
    enrollment.paymentStatus,
    t,
  );
  const startDate = formatDate(enrollment.program.startAt, locale);
  const endDate = formatDate(enrollment.program.endAt, locale);
  const amountLabel =
    formatMoney(
      enrollment.payment?.amountTotal ?? enrollment.selectedAmountSnapshot,
      enrollment.payment?.currencyCode ?? enrollment.selectedCurrencyCode,
      locale,
    ) ?? t("public.detail.free");

  const actionHref =
    enrollment.status === "PENDING_PAYMENT" && enrollment.payment
      ? `/patient/academy/program-enrollments/${enrollment.id}/pay`
      : `/patient/academy/program-enrollments/${enrollment.id}`;
  const actionLabel =
    enrollment.status === "PENDING_PAYMENT" && enrollment.payment
      ? t("patient.home.card.pay")
      : t("patient.home.card.view");

  return (
    <Link
      href={actionHref}
      className="group block rounded-[28px] border border-border-light bg-white p-4 shadow-[0_14px_36px_-28px_rgba(31,42,45,0.14)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_40px_-26px_rgba(36,86,79,0.16)] sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary-light/40 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("patient.home.card.program")}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                resolveEnrollmentTone(enrollment.status) === "success"
                  ? "border-success/20 bg-success-light text-success"
                  : resolveEnrollmentTone(enrollment.status) === "warning"
                    ? "border-warning/20 bg-warning-light text-warning"
                    : "border-border-light bg-surface-tertiary text-text-secondary"
              }`}
            >
              {enrollmentStatusLabel}
            </span>
            <span className="rounded-full border border-border-light bg-surface-tertiary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
              {paymentStatusLabel}
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-bold tracking-tight text-text-primary transition group-hover:text-primary sm:text-[1.35rem]">
              {title}
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary sm:line-clamp-2">
              {description ?? t("patient.home.card.noDescription")}
            </p>
          </div>
        </div>

        <span className="inline-flex w-full items-center justify-center gap-1 rounded-[14px] bg-primary px-4 py-3 text-xs font-semibold text-white transition group-hover:bg-primary-hover sm:w-auto">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-border-light bg-surface-tertiary px-4 py-3 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {t("patient.home.card.startAt")}
          </div>
          <div className="mt-1 font-semibold text-text-primary">
            {startDate ?? t("patient.home.card.noDate")}
          </div>
        </div>
        <div className="rounded-[18px] border border-border-light bg-surface-tertiary px-4 py-3 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {t("patient.home.card.endAt")}
          </div>
          <div className="mt-1 font-semibold text-text-primary">
            {endDate ?? t("patient.home.card.noDate")}
          </div>
        </div>
        <div className="rounded-[18px] border border-border-light bg-surface-tertiary px-4 py-3 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {t("patient.home.card.amount")}
          </div>
          <div className="mt-1 font-semibold text-text-primary">{amountLabel}</div>
        </div>
      </div>
    </Link>
  );
}

export default function PatientAcademyProgramEnrollmentsScreen() {
  const t = useTranslations("academy");
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = usePatientAcademyProgramEnrollments({
    page: 1,
    limit: 24,
  });

  const enrollments = data?.items ?? [];
  const stats = useMemo(
    () => ({
      total: data?.pagination.totalItems ?? 0,
      pending: enrollments.filter((item) => item.status === "PENDING_PAYMENT").length,
      active: enrollments.filter((item) => item.status === "UPCOMING").length,
      finished: enrollments.filter(
        (item) => item.status === "CANCELLED" || item.status === "EXPIRED",
      ).length,
    }),
    [data?.pagination.totalItems, enrollments],
  );

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-6 sm:py-8">
        <div className="h-44 animate-pulse rounded-[28px] border border-border-light bg-surface-tertiary" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="h-28 animate-pulse rounded-[20px] border border-border-light bg-surface-tertiary" />
          <div className="h-28 animate-pulse rounded-[20px] border border-border-light bg-surface-tertiary" />
          <div className="h-28 animate-pulse rounded-[20px] border border-border-light bg-surface-tertiary" />
          <div className="h-28 animate-pulse rounded-[20px] border border-border-light bg-surface-tertiary" />
        </div>
        <div className="space-y-4">
          <div className="h-36 animate-pulse rounded-[28px] border border-border-light bg-surface-tertiary" />
          <div className="h-36 animate-pulse rounded-[28px] border border-border-light bg-surface-tertiary" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-6 sm:py-8">
        <StateCard
          icon={<AlertCircle className="h-5 w-5 text-primary" />}
          title={t("patient.home.error.title")}
          note={t("patient.home.error.note")}
          action={{
            label: t("patient.home.error.retry"),
            onClick: () => refetch(),
          }}
          className="rounded-[24px]"
        />
      </div>
    );
  }

  return (
    <div className="app-max-content mx-auto space-y-6 px-4 py-6 sm:py-8">
      <section className="overflow-hidden rounded-[28px] border border-border-light bg-white p-5 shadow-[0_16px_40px_-32px_rgba(31,42,45,0.18)] sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light/40 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <BadgeCheck className="h-3.5 w-3.5" />
              {t("patient.home.badge")}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-[2.4rem]">
              {t("patient.home.title")}
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-text-secondary sm:text-base">
              {t("patient.home.note")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: t("patient.home.stats.total"), value: stats.total, icon: Sparkles },
              { label: t("patient.home.stats.pending"), value: stats.pending, icon: CalendarClock },
              { label: t("patient.home.stats.active"), value: stats.active, icon: BadgeCheck },
              { label: t("patient.home.stats.finished"), value: stats.finished, icon: Loader2 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-[20px] border border-border-light bg-surface-tertiary p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <div className="font-mono text-xl font-bold text-text-primary">
                        {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
                          item.value,
                        )}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        {item.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {enrollments.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 border-b border-border-light pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {t("patient.home.list.title")}
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">{t("patient.home.list.subtitle")}</p>
            </div>
            <div className="rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-muted">
              {t("patient.home.list.count", { count: stats.total })}
            </div>
          </div>

          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <EnrollmentCard
                key={enrollment.id}
                enrollment={enrollment}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        </section>
      ) : (
        <StateCard
          icon={<SearchX className="h-6 w-6 text-primary" />}
          title={t("patient.home.empty.title")}
          note={t("patient.home.empty.note")}
          className="rounded-[28px]"
          action={{
            label: t("patient.home.empty.action"),
            href: (
              <Link
                href="/academy"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {t("patient.home.empty.action")}
              </Link>
            ),
          }}
        />
      )}
    </div>
  );
}
