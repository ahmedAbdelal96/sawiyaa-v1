"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  HeartHandshake,
  LifeBuoy,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import type { ReactNode } from "react";
import { usePatientJourney } from "../hooks/use-patient-journey";
import type {
  PatientJourney,
  PatientJourneyNextStepType,
} from "../types/patient-journey.types";

type StepConfig = {
  href: string | null;
  ctaKey: string | null;
  supported: boolean;
};

function formatDatetime(isoString: string | null, numLocale: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(numLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

function formatDate(isoString: string | null, numLocale: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString(numLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(amount: string, currency: string, numLocale: string): string {
  return new Intl.NumberFormat(numLocale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function resolveStepConfig(
  journey: PatientJourney,
  type: PatientJourneyNextStepType,
): StepConfig {
  switch (type) {
    case "COMPLETE_PAYMENT":
      return {
        href: journey.upcoming.pendingPayment?.sessionId
          ? `/patient/sessions/${journey.upcoming.pendingPayment.sessionId}/pay`
          : "/patient/payments",
        ctaKey: "nextSteps.types.COMPLETE_PAYMENT.cta",
        supported: true,
      };
    case "JOIN_UPCOMING_SESSION":
      return {
        href: journey.upcoming.session ? `/patient/sessions/${journey.upcoming.session.id}` : null,
        ctaKey: "nextSteps.types.JOIN_UPCOMING_SESSION.cta",
        supported: Boolean(journey.upcoming.session),
      };
    case "START_GUIDED_MATCHING":
      return {
        href: "/patient/matching",
        ctaKey: "nextSteps.types.START_GUIDED_MATCHING.cta",
        supported: true,
      };
    case "BOOK_NEXT_SESSION":
      return {
        href: "/patient/practitioners",
        ctaKey: "nextSteps.types.BOOK_NEXT_SESSION.cta",
        supported: true,
      };
    case "VIEW_SUPPORT_TICKET":
      return {
        href: journey.support.latestOpenTicket
          ? `/patient/support/${journey.support.latestOpenTicket.id}`
          : "/patient/support",
        ctaKey: "nextSteps.types.VIEW_SUPPORT_TICKET.cta",
        supported: true,
      };
    case "TAKE_ASSESSMENT":
      return {
        href: "/patient/assessments",
        ctaKey: "nextSteps.types.TAKE_ASSESSMENT.cta",
        supported: true,
      };
    default:
      return { href: null, ctaKey: null, supported: false };
  }
}

function StepIcon({ type }: { type: PatientJourneyNextStepType }) {
  switch (type) {
    case "COMPLETE_PAYMENT":
      return <CreditCard className="h-5 w-5" />;
    case "JOIN_UPCOMING_SESSION":
      return <CalendarDays className="h-5 w-5" />;
    case "VIEW_SUPPORT_TICKET":
      return <LifeBuoy className="h-5 w-5" />;
    case "TAKE_ASSESSMENT":
      return <Sparkles className="h-5 w-5" />;
    case "START_GUIDED_MATCHING":
      return <HeartHandshake className="h-5 w-5" />;
    case "BOOK_NEXT_SESSION":
      return <Stethoscope className="h-5 w-5" />;
    default:
      return <ArrowRight className="h-5 w-5" />;
  }
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-3xl">
      <ListStateSkeleton items={3} heightClass="h-36" />
    </div>
  );
}

type CareEntryItem = {
  href: string;
  label: string;
  note: string;
  icon: ReactNode;
};

export default function PatientJourneyScreen() {
  const t = useTranslations("patient-journey");
  const tSessions = useTranslations("sessions");
  const tPayments = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const { data: journey, isLoading, isError, refetch } = usePatientJourney();

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError || !journey) {
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          title={t("states.error.heading")}
          note={t("states.error.note")}
          action={{ label: t("states.error.retry"), onClick: () => refetch() }}
        />
      </div>
    );
  }

  const primaryStep =
    journey.nextSteps.find((step) => step.type === journey.summary.suggestedNextAction) ??
    journey.nextSteps[0];
  const remainingSteps = journey.nextSteps.filter((step) => step.type !== primaryStep?.type);
  const primaryConfig = primaryStep ? resolveStepConfig(journey, primaryStep.type) : null;
  const fallbackNextStep =
    primaryConfig?.supported && primaryConfig.href && primaryConfig.ctaKey
      ? primaryConfig
      : {
          href: "/patient/matching",
          ctaKey: "nextSteps.types.START_GUIDED_MATCHING.cta",
          supported: true,
        };

  const hasRecentHistory =
    journey.recentHistory.sessions.length > 0 ||
    journey.recentHistory.assessments.length > 0 ||
    journey.recentHistory.matching.length > 0 ||
    journey.recentHistory.payments.length > 0;

  const careEntryItems: CareEntryItem[] = [
    {
      href: "/patient/matching",
      label: t("nextSteps.types.START_GUIDED_MATCHING.cta"),
      note: t("nextSteps.types.START_GUIDED_MATCHING.note"),
      icon: <HeartHandshake className="h-4 w-4" />,
    },
    {
      href: "/patient/assessments",
      label: t("nextSteps.types.TAKE_ASSESSMENT.cta"),
      note: t("nextSteps.types.TAKE_ASSESSMENT.note"),
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      href: "/patient/support",
      label: t("quickLinks.support"),
      note: t("nextSteps.types.VIEW_SUPPORT_TICKET.note"),
      icon: <LifeBuoy className="h-4 w-4" />,
    },
    {
      href: "/patient/sessions",
      label: t("quickLinks.sessions"),
      note: t("nextSteps.types.JOIN_UPCOMING_SESSION.note"),
      icon: <CalendarDays className="h-4 w-4" />,
    },
  ];

  return (
    <div className="app-max-content mx-auto space-y-5 sm:space-y-6">
      <section className="app-panel overflow-hidden rounded-[32px] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("hero.eyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("hero.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
              {t("hero.note")}
            </p>
          </div>
          <div className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-medium text-primary dark:bg-primary/15 dark:text-primary-light">
            {t(
              `summary.suggested.${journey.summary.suggestedNextAction}` as Parameters<typeof t>[0],
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {journey.summary.hasPendingPayment && (
            <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
              {t("summary.chips.pendingPayment")}
            </span>
          )}
          {journey.summary.hasUpcomingSession && journey.summary.nextSessionAt && (
            <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
              {t("summary.chips.nextSessionAt", {
                date: formatDatetime(journey.summary.nextSessionAt, numLocale),
              })}
            </span>
          )}
          {journey.summary.hasOpenSupportTicket && (
            <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
              {t("summary.chips.supportOpen")}
            </span>
          )}
          {journey.summary.lastAssessmentTakenAt && (
            <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
              {t("summary.chips.lastAssessment", {
                date: formatDate(journey.summary.lastAssessmentTakenAt, numLocale),
              })}
            </span>
          )}
        </div>
      </section>

      {primaryStep && (
        <section className="app-panel rounded-[32px] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
              <StepIcon type={primaryStep.type} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {t("primaryAction.eyebrow")}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-text-primary dark:text-white/95">
                {t(
                  `nextSteps.types.${primaryStep.type}.title` as Parameters<typeof t>[0],
                )}
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t(
                  `nextSteps.types.${primaryStep.type}.note` as Parameters<typeof t>[0],
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {primaryConfig?.supported && primaryConfig.href && primaryConfig.ctaKey ? (
              <Link
                href={primaryConfig.href as never}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {t(primaryConfig.ctaKey as Parameters<typeof t>[0])}
                <ArrowRight size={14} className="rtl:rotate-180" />
              </Link>
            ) : (
              <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
                {t("nextSteps.unavailable")}
              </div>
            )}

            <Link
              href="/patient/practitioners"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border-light bg-surface px-5 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary"
            >
              {t("quickLinks.practitioners")}
              <ArrowRight size={14} className="rtl:rotate-180" />
            </Link>
          </div>
        </section>
      )}

      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
            {t("quickLinks.careHeading")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {t("quickLinks.careNote")}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {careEntryItems.map((item) => (
            <Link
              key={item.href}
              href={item.href as never}
              className="app-panel-soft flex items-start gap-3 rounded-[24px] px-4 py-4 transition hover:border-primary/25 hover:bg-white/90 dark:hover:bg-white/8"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {item.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {item.note}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {journey.upcoming.pendingPayment && (
          <div className="app-panel rounded-[28px] p-5">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("upcoming.pendingPayment.heading")}
            </p>
            <p className="mt-2 text-lg font-semibold text-text-primary dark:text-white">
              {formatAmount(
                journey.upcoming.pendingPayment.amount,
                journey.upcoming.pendingPayment.currency,
                numLocale,
              )}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {tPayments(
                `history.status.${journey.upcoming.pendingPayment.status}` as Parameters<typeof tPayments>[0],
              )}
            </p>
            <Link
              href={
                (journey.upcoming.pendingPayment.sessionId
                  ? `/patient/sessions/${journey.upcoming.pendingPayment.sessionId}/pay`
                  : "/patient/payments") as never
              }
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {t("upcoming.pendingPayment.cta")}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
          </div>
        )}

        {journey.upcoming.session && (
          <div className="app-panel rounded-[28px] p-5">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("upcoming.session.heading")}
            </p>
            <p className="mt-2 text-base font-semibold text-text-primary dark:text-white">
              {journey.upcoming.session.practitioner.displayName ??
                journey.upcoming.session.practitioner.slug}
            </p>
            {journey.upcoming.session.scheduledStartAt && (
              <p className="mt-1 text-sm text-text-secondary">
                {formatDatetime(journey.upcoming.session.scheduledStartAt, numLocale)}
              </p>
            )}
            <div className="mt-3 inline-flex rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/15 dark:text-primary-light">
              {tSessions(
                `status.${journey.upcoming.session.status}` as Parameters<typeof tSessions>[0],
              )}
            </div>
            <Link
              href={`/patient/sessions/${journey.upcoming.session.id}` as never}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {t("upcoming.session.cta")}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
          </div>
        )}

        {journey.upcoming.instantBookingRequest && (
          <div className="app-panel-soft rounded-[28px] p-5 sm:col-span-2">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("upcoming.instantBooking.heading")}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {t("upcoming.instantBooking.note", {
                practitioner:
                  journey.upcoming.instantBookingRequest.practitioner.displayName ??
                  journey.upcoming.instantBookingRequest.practitioner.slug,
              })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
                {t("upcoming.instantBooking.duration", {
                  n: journey.upcoming.instantBookingRequest.durationMinutes,
                })}
              </span>
              <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
                {t("upcoming.instantBooking.expiresAt", {
                  date: formatDatetime(journey.upcoming.instantBookingRequest.expiresAt, numLocale),
                })}
              </span>
            </div>
          </div>
        )}

        {!journey.upcoming.pendingPayment &&
          !journey.upcoming.session &&
          !journey.upcoming.instantBookingRequest && (
            <div className="app-panel-soft rounded-[28px] p-5 sm:col-span-2">
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("upcoming.empty.heading")}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t("upcoming.empty.note")}
              </p>
              <Link
                href={fallbackNextStep.href as never}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {t(fallbackNextStep.ctaKey as Parameters<typeof t>[0])}
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </div>
          )}
      </section>

      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
          {t("recent.heading")}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{t("recent.note")}</p>

        {hasRecentHistory ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {journey.recentHistory.sessions.length > 0 && (
              <div className="app-panel-soft rounded-[24px] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("recent.sessions.heading")}
                  </p>
                  <Link
                    href="/patient/sessions"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("recent.sessions.viewAll")}
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {journey.recentHistory.sessions.slice(0, 3).map((session) => (
                    <Link
                      key={session.id}
                      href={`/patient/sessions/${session.id}` as never}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3.5 py-3 transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-text-primary dark:text-white/90">
                          {session.practitioner.displayName ?? session.practitioner.slug}
                        </p>
                        {session.scheduledStartAt && (
                          <p className="mt-1 text-xs text-text-muted">
                            {formatDatetime(session.scheduledStartAt, numLocale)}
                          </p>
                        )}
                      </div>
                      <span className="app-chip shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium">
                        {tSessions(
                          `status.${session.status}` as Parameters<typeof tSessions>[0],
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {journey.recentHistory.payments.length > 0 && (
              <div className="app-panel-soft rounded-[24px] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("recent.payments.heading")}
                  </p>
                  <Link
                    href="/patient/payments"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("recent.payments.viewAll")}
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {journey.recentHistory.payments.slice(0, 2).map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-2xl bg-white/80 px-3.5 py-3 dark:bg-white/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-text-primary dark:text-white/90">
                          {formatAmount(payment.amount, payment.currency, numLocale)}
                        </p>
                        <span className="app-chip rounded-full px-2.5 py-1 text-[11px] font-medium">
                          {tPayments(
                            `history.status.${payment.status}` as Parameters<typeof tPayments>[0],
                          )}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        <span>{formatDate(payment.createdAt, numLocale)}</span>
                        {payment.sessionId && (
                          <Link
                            href={`/patient/sessions/${payment.sessionId}` as never}
                            className="font-medium text-primary hover:underline"
                          >
                            {t("recent.payments.viewSession")}
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {journey.recentHistory.assessments.length > 0 && (
              <div className="app-panel-soft rounded-[24px] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("recent.assessments.heading")}
                  </p>
                  <Link
                    href="/patient/assessments"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("recent.sessions.viewAll")}
                  </Link>
                </div>
                <div className="mt-3 space-y-2.5">
                  {journey.recentHistory.assessments.slice(0, 2).map((assessment) => (
                    <div
                      key={assessment.id}
                      className="rounded-2xl bg-white/80 px-3.5 py-3 dark:bg-white/5"
                    >
                      <p className="text-sm font-medium text-text-primary dark:text-white/90">
                        {assessment.assessmentTitle}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-text-muted">
                        {assessment.completedAt && (
                          <span>
                            {t("recent.assessments.completedAt", {
                              date: formatDate(assessment.completedAt, numLocale),
                            })}
                          </span>
                        )}
                        {assessment.score !== null && (
                          <span>{t("recent.assessments.score", { score: assessment.score })}</span>
                        )}
                        <Link
                          href={`/patient/assessments/submissions/${assessment.id}` as never}
                          className="font-medium text-primary hover:underline"
                        >
                          {t("recent.assessments.viewResult")}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {journey.recentHistory.matching.length > 0 && (
              <div className="app-panel-soft rounded-[24px] p-4">
                <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {t("recent.matching.heading")}
                </p>
                <div className="mt-3 space-y-2.5">
                  {journey.recentHistory.matching.slice(0, 2).map((matching) => (
                    <div
                      key={matching.id}
                      className="rounded-2xl bg-white/80 px-3.5 py-3 dark:bg-white/5"
                    >
                      <p className="text-sm font-medium text-text-primary dark:text-white/90">
                        {matching.topRecommendation
                          ? t("recent.matching.recommendation", {
                              practitioner:
                                matching.topRecommendation.practitionerDisplayName ??
                                matching.topRecommendation.practitionerSlug,
                            })
                          : t("recent.matching.noRecommendation")}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        {matching.completedAt && (
                          <span>
                            {t("recent.matching.completedAt", {
                              date: formatDate(matching.completedAt, numLocale),
                            })}
                          </span>
                        )}
                        <Link
                          href={`/patient/matching/${matching.id}` as never}
                          className="font-medium text-primary hover:underline"
                        >
                          {t("recent.matching.viewMatching")}
                        </Link>
                        {matching.topRecommendation && (
                          <Link
                            href={`/practitioners/${matching.topRecommendation.practitionerSlug}` as never}
                            className="font-medium text-primary hover:underline"
                          >
                            {t("recent.matching.viewPractitioner")}
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="app-panel-soft mt-4 rounded-[24px] p-5">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("recent.empty.heading")}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {t("recent.empty.note")}
            </p>
            <Link
              href={fallbackNextStep.href as never}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {t(fallbackNextStep.ctaKey as Parameters<typeof t>[0])}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="app-panel rounded-[28px] p-5">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("support.heading")}
          </p>
          {journey.support.latestOpenTicket ? (
            <>
              <p className="mt-2 text-sm text-text-secondary">
                {t("support.openTicket")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
                  {t(`support.categories.${journey.support.latestOpenTicket.category}` as Parameters<typeof t>[0])}
                </span>
                <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
                  {t(`support.statuses.${journey.support.latestOpenTicket.status}` as Parameters<typeof t>[0])}
                </span>
                <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
                  {t("support.updatedAt", {
                    date: formatDate(journey.support.latestOpenTicket.updatedAt, numLocale),
                  })}
                </span>
              </div>
              <Link
                href={`/patient/support/${journey.support.latestOpenTicket.id}` as never}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {t("support.viewTicket")}
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t("support.empty")}
              </p>
              <Link
                href="/patient/support"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {t("support.chatCta")}
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </>
          )}
        </div>

        <div className="app-panel rounded-[28px] p-5">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("quickLinks.utilityHeading")}
          </p>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {t("quickLinks.utilityNote")}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              {
                href: "/patient/sessions",
                label: t("quickLinks.sessions"),
                icon: <CalendarDays className="h-4 w-4" />,
              },
              {
                href: "/patient/payments",
                label: t("quickLinks.payments"),
                icon: <CreditCard className="h-4 w-4" />,
              },
              {
                href: "/patient/practitioners",
                label: t("quickLinks.practitioners"),
                icon: <Stethoscope className="h-4 w-4" />,
              },
              {
                href: "/patient/profile",
                label: t("quickLinks.profile"),
                icon: <UserRound className="h-4 w-4" />,
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href as never}
                className="app-panel-soft flex items-center gap-2 rounded-2xl px-3.5 py-3 text-sm font-medium text-text-primary transition hover:border-primary/25 hover:text-primary dark:text-white/90"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {remainingSteps.length > 0 && (
        <section className="app-panel rounded-[32px] p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
            {t("nextSteps.moreHeading")}
          </h2>
          <div className="mt-4 space-y-3">
            {remainingSteps.map((step) => {
              const config = resolveStepConfig(journey, step.type);
              return (
                <div key={step.type} className="app-panel-soft rounded-[24px] p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
                      <StepIcon type={step.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                        {t(
                          `nextSteps.types.${step.type}.title` as Parameters<typeof t>[0],
                        )}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">
                        {t(
                          `nextSteps.types.${step.type}.note` as Parameters<typeof t>[0],
                        )}
                      </p>
                      {config.supported && config.href && config.ctaKey ? (
                        <Link
                          href={config.href as never}
                          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          {t(config.ctaKey as Parameters<typeof t>[0])}
                          <ArrowRight size={13} className="rtl:rotate-180" />
                        </Link>
                      ) : (
                        <p className="mt-3 text-xs text-text-muted">
                          {t("nextSteps.unavailable")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
