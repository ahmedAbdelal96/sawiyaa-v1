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
import Button from "@/components/ui/button/Button";
import { ListStateSkeleton } from "@/components/shared/ContentStates";
import {
  PatientActionPanel,
  PatientPageHeader,
  PatientSectionCard,
  PatientStatCard,
  PatientStatusBadge,
} from "@/components/patient/PatientChrome";
import { usePatientJourney } from "../hooks/use-patient-journey";
import { isPaymentExpired } from "@/features/payments/lib/payment-status";
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

export default function PatientJourneyScreen() {
  const t = useTranslations("patient-journey");
  const tSessions = useTranslations("sessions");
  const tPayments = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const { data: journey, isLoading, isError, refetch } = usePatientJourney();

  if (isLoading) {
    return (
      <div className="app-max-content mx-auto space-y-5 sm:space-y-6">
        <PatientPageHeader
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          description={t("hero.note")}
        />
        <PatientSectionCard tone="subtle">
          <ListStateSkeleton items={3} heightClass="h-36" />
        </PatientSectionCard>
      </div>
    );
  }

  if (isError || !journey) {
    return (
      <div className="app-max-content mx-auto space-y-5 sm:space-y-6">
        <PatientPageHeader
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          description={t("hero.note")}
        />
        <PatientSectionCard
          tone="subtle"
          eyebrow={t("states.error.eyebrow")}
          title={t("states.error.heading")}
          description={t("states.error.note")}
          actions={
            <Button onClick={() => refetch()} variant="outline">
              {t("states.error.retry")}
            </Button>
          }
        >
          <div />
        </PatientSectionCard>
      </div>
    );
  }

  const primaryStep =
    journey.nextSteps.find((step) => step.type === journey.summary.suggestedNextAction) ??
    journey.nextSteps[0];
  const activePendingPayment = Boolean(
    journey.upcoming.pendingPayment && !isPaymentExpired(journey.upcoming.pendingPayment),
  );
  const primaryConfig =
    primaryStep && !(primaryStep.type === "COMPLETE_PAYMENT" && !activePendingPayment)
      ? resolveStepConfig(journey, primaryStep.type)
      : null;
  const fallbackNextStep =
    primaryConfig?.supported && primaryConfig.href && primaryConfig.ctaKey
      ? primaryConfig
      : {
          href: "/patient/matching",
          ctaKey: "nextSteps.types.START_GUIDED_MATCHING.cta",
          supported: true,
        };

  const upcomingSession = journey.upcoming.session;
  const pendingPayment = journey.upcoming.pendingPayment;
  const instantRequest = journey.upcoming.instantBookingRequest;

  const hasUpcomingItems = upcomingSession || pendingPayment || instantRequest;

  const hasRecentHistory =
    journey.recentHistory.sessions.length > 0 ||
    journey.recentHistory.assessments.length > 0 ||
    journey.recentHistory.matching.length > 0 ||
    journey.recentHistory.payments.length > 0;

  // Filter out the upcoming session from recent history to avoid duplication
  const recentSessionsExcludingUpcoming = journey.recentHistory.sessions.filter(
    (s) => s.id !== upcomingSession?.id,
  );

  const summaryBadges: React.ReactNode[] = [];
  if (activePendingPayment) {
    summaryBadges.push(
      <PatientStatusBadge key="pendingPayment">
        {t("summary.chips.pendingPayment")}
      </PatientStatusBadge>,
    );
  }
  if (journey.summary.hasUpcomingSession && journey.summary.nextSessionAt) {
    summaryBadges.push(
      <PatientStatusBadge key="nextSession">
        {t("summary.chips.nextSessionAt", {
          date: formatDatetime(journey.summary.nextSessionAt, numLocale),
        })}
      </PatientStatusBadge>,
    );
  }
  if (journey.summary.hasOpenSupportTicket) {
    summaryBadges.push(
      <PatientStatusBadge key="supportOpen">
        {t("summary.chips.supportOpen")}
      </PatientStatusBadge>,
    );
  }
  if (journey.summary.lastAssessmentTakenAt) {
    summaryBadges.push(
      <PatientStatusBadge key="lastAssessment">
        {t("summary.chips.lastAssessment", {
          date: formatDate(journey.summary.lastAssessmentTakenAt, numLocale),
        })}
      </PatientStatusBadge>,
    );
  }

  return (
    <div className="app-max-content mx-auto space-y-5 sm:space-y-6">
      {/* ── Hero ── */}
      <PatientPageHeader
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        meta={
          <div className="flex flex-wrap gap-2">
            {summaryBadges.length > 0 ? (
              summaryBadges
            ) : (
              <span className="text-sm text-text-muted">{t("hero.note")}</span>
            )}
          </div>
        }
        actions={
          <div className="rounded-full bg-primary-light px-4 py-2 text-sm font-semibold text-primary dark:bg-primary/15 dark:text-primary-light">
            {t(
              `summary.suggested.${journey.summary.suggestedNextAction}` as Parameters<typeof t>[0],
            )}
          </div>
        }
      />

      {/* ── Stat cards row ── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PatientStatCard
          label={t("upcoming.session.heading")}
          value={
            journey.summary.nextSessionAt && upcomingSession
              ? formatDate(journey.summary.nextSessionAt, numLocale)
              : "-"
          }
          hint={
            upcomingSession?.practitioner.displayName ??
            upcomingSession?.practitioner.slug ??
            (!hasUpcomingItems ? t("upcoming.session.noSession") : "")
          }
          icon={<CalendarDays className="h-4 w-4" />}
          tone={upcomingSession ? "brand" : "neutral"}
        />
        <PatientStatCard
          label={t("recent.sessions.heading")}
          value={journey.recentHistory.sessions.length > 0 ? String(journey.recentHistory.sessions.length) : "-"}
          hint={journey.recentHistory.sessions.length > 0 ? t("recent.sessions.viewAll") : t("recent.sessions.zeroHint")}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="neutral"
        />
        <PatientStatCard
          label={t("support.heading")}
          value={journey.support.hasOpenTicket ? "1" : "-"}
          hint={journey.support.hasOpenTicket ? t("support.openTicketBody") : t("support.zeroHint")}
          icon={<LifeBuoy className="h-4 w-4" />}
          tone={journey.support.hasOpenTicket ? "warning" : "neutral"}
        />
        <PatientStatCard
          label={t("upcoming.pendingPayment.heading")}
          value={
            activePendingPayment && pendingPayment
              ? formatAmount(pendingPayment.amount, pendingPayment.currency, numLocale)
              : "-"
          }
          hint={
            activePendingPayment
              ? t("summary.chips.pendingPayment")
              : t("upcoming.pendingPayment.zeroHint")
          }
          icon={<CreditCard className="h-4 w-4" />}
          tone={activePendingPayment ? "warning" : "neutral"}
        />
      </div>

      {/* ── Primary action card ── */}
      {primaryStep && (
        <PatientSectionCard
          eyebrow={t("primaryAction.eyebrow")}
          title={t(
            `nextSteps.types.${primaryStep.type}.title` as Parameters<typeof t>[0],
          )}
          description={t(
            `nextSteps.types.${primaryStep.type}.note` as Parameters<typeof t>[0],
          )}
          actions={
            primaryConfig?.supported && primaryConfig.href && primaryConfig.ctaKey ? (
              <Link
                href={primaryConfig.href as never}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary-hover hover:-translate-y-0.5"
              >
                {t(primaryConfig.ctaKey as Parameters<typeof t>[0])}
                <ArrowRight size={14} className="rtl:rotate-180" />
              </Link>
            ) : (
              <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
                {t("nextSteps.unavailable")}
              </div>
            )
          }
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
              <StepIcon type={primaryStep.type} />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-6 text-text-secondary">
              {t(
                `nextSteps.types.${primaryStep.type}.note` as Parameters<typeof t>[0],
              )}
            </p>
          </div>
        </PatientSectionCard>
      )}

      {/* ── Care shortcuts ── */}
      <PatientSectionCard
        eyebrow={t("quickLinks.careHeading")}
        title={t("quickLinks.careHeading")}
        description={t("quickLinks.careNote")}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PatientActionPanel
            href="/patient/matching"
            label={t("nextSteps.types.START_GUIDED_MATCHING.cta")}
            description={t("nextSteps.types.START_GUIDED_MATCHING.note")}
            icon={<HeartHandshake className="h-5 w-5" />}
            tone="emerald"
          />
          <PatientActionPanel
            href="/patient/assessments"
            label={t("nextSteps.types.TAKE_ASSESSMENT.cta")}
            description={t("nextSteps.types.TAKE_ASSESSMENT.note")}
            icon={<Sparkles className="h-5 w-5" />}
            tone="indigo"
          />
          <PatientActionPanel
            href="/patient/practitioners"
            label={t("nextSteps.types.BOOK_NEXT_SESSION.cta")}
            description={t("nextSteps.types.BOOK_NEXT_SESSION.note")}
            icon={<Stethoscope className="h-5 w-5" />}
            tone="sky"
          />
          <PatientActionPanel
            href="/patient/support"
            label={t("support.heading")}
            description={t("support.empty")}
            icon={<LifeBuoy className="h-5 w-5" />}
            tone="amber"
          />
        </div>
      </PatientSectionCard>

      {/* ── Upcoming session area ── */}
      <PatientSectionCard
        title={t("upcoming.session.heading")}
        actions={
          <Link
            href="/patient/sessions"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            {t("recent.sessions.viewAll")}
            <ArrowRight size={13} className="rtl:rotate-180" />
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Pending payment */}
          {activePendingPayment && pendingPayment ? (
            <div className="app-panel rounded-[24px] p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t("upcoming.pendingPayment.heading")}
                </p>
                <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
              </div>
              <p className="text-xl font-bold text-text-primary dark:text-white">
                {formatAmount(pendingPayment.amount, pendingPayment.currency, numLocale)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {tPayments(
                  `history.status.${pendingPayment.status}` as Parameters<typeof tPayments>[0],
                )}
              </p>
              <Link
                href={
                  pendingPayment.sessionId
                    ? `/patient/sessions/${pendingPayment.sessionId}/pay`
                    : "/patient/payments"
                }
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-warning-light px-4 py-2 text-sm font-semibold text-warning transition-all hover:bg-warning hover:text-white"
              >
                {t("upcoming.pendingPayment.cta")}
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </div>
          ) : null}

          {/* Upcoming session */}
          {upcomingSession ? (
            <div className="app-panel rounded-[24px] p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t("upcoming.session.heading")}
                </p>
                <CalendarDays className="h-5 w-5 text-indigo-500" />
              </div>
              <p className="text-lg font-semibold text-text-primary dark:text-white">
                {upcomingSession.practitioner.displayName ?? upcomingSession.practitioner.slug}
              </p>
              {upcomingSession.scheduledStartAt ? (
                <p className="mt-1 text-sm text-text-secondary">
                  {formatDatetime(upcomingSession.scheduledStartAt, numLocale)}
                </p>
              ) : null}
              <div className="mt-3">
                <PatientStatusBadge className="px-2.5 py-1 text-[11px]">
                  {tSessions(
                    `status.${upcomingSession.status}` as Parameters<typeof tSessions>[0],
                  )}
                </PatientStatusBadge>
              </div>
              <Link
                href={`/patient/sessions/${upcomingSession.id}` as never}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {t("upcoming.session.cta")}
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </div>
          ) : null}

          {/* Instant booking request */}
          {instantRequest ? (
            <div className="app-panel rounded-[24px] border border-indigo-200 bg-indigo-50/40 p-5">
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("upcoming.instantBooking.heading")}
              </p>
              <p className="mt-1.5 text-sm text-text-secondary">
                {t("upcoming.instantBooking.note", {
                  practitioner:
                    instantRequest.practitioner.displayName ?? instantRequest.practitioner.slug,
                })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <PatientStatusBadge>
                  {t("upcoming.instantBooking.duration", {
                    n: instantRequest.durationMinutes,
                  })}
                </PatientStatusBadge>
                <PatientStatusBadge>
                  {t("upcoming.instantBooking.expiresAt", {
                    date: formatDatetime(instantRequest.expiresAt, numLocale),
                  })}
                </PatientStatusBadge>
              </div>
            </div>
          ) : null}

          {/* All empty */}
          {!hasUpcomingItems ? (
            <div className="app-panel rounded-[24px] p-5">
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("upcoming.empty.heading")}
              </p>
              <p className="mt-1.5 text-sm text-text-secondary">
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
          ) : null}
        </div>
      </PatientSectionCard>

      {/* ── Recent activity ── */}
      <PatientSectionCard title={t("recent.heading")} description={t("recent.note")}>
        {hasRecentHistory ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {recentSessionsExcludingUpcoming.length > 0 ? (
              <div className="app-panel-soft rounded-[22px] p-4">
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
                <div className="space-y-2">
                  {recentSessionsExcludingUpcoming.slice(0, 3).map((session) => (
                    <Link
                      key={session.id}
                      href={`/patient/sessions/${session.id}` as never}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-text-primary dark:text-white/90">
                          {session.practitioner.displayName ?? session.practitioner.slug}
                        </p>
                        {session.scheduledStartAt ? (
                          <p className="mt-1 text-xs text-text-muted">
                            {formatDatetime(session.scheduledStartAt, numLocale)}
                          </p>
                        ) : null}
                      </div>
                      <PatientStatusBadge className="shrink-0 px-2.5 py-1 text-[11px]">
                        {tSessions(
                          `status.${session.status}` as Parameters<typeof tSessions>[0],
                        )}
                      </PatientStatusBadge>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {journey.recentHistory.payments.length > 0 ? (
              <div className="app-panel-soft rounded-[22px] p-4">
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
                <div className="space-y-2">
                  {journey.recentHistory.payments.slice(0, 2).map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-2xl bg-white/80 px-3.5 py-3 dark:bg-white/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-text-primary dark:text-white/90">
                          {formatAmount(payment.amount, payment.currency, numLocale)}
                        </p>
                        <PatientStatusBadge className="px-2.5 py-1 text-[11px]">
                          {tPayments(
                            `history.status.${payment.status}` as Parameters<typeof tPayments>[0],
                          )}
                        </PatientStatusBadge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        <span>{formatDate(payment.createdAt, numLocale)}</span>
                        {payment.sessionId ? (
                          <Link
                            href={`/patient/sessions/${payment.sessionId}` as never}
                            className="font-medium text-primary hover:underline"
                          >
                            {t("recent.payments.viewSession")}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {journey.recentHistory.assessments.length > 0 ? (
              <div className="app-panel-soft rounded-[22px] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("recent.assessments.heading")}
                  </p>
                  <Link
                    href="/patient/assessments"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("recent.assessments.viewAll")}
                  </Link>
                </div>
                <div className="space-y-2">
                  {journey.recentHistory.assessments.slice(0, 2).map((assessment) => (
                    <div
                      key={assessment.id}
                      className="rounded-2xl bg-white/80 px-3.5 py-3 dark:bg-white/5"
                    >
                      <p className="text-sm font-medium text-text-primary dark:text-white/90">
                        {assessment.assessmentTitle}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-text-muted">
                        {assessment.completedAt ? (
                          <span>
                            {t("recent.assessments.completedAt", {
                              date: formatDate(assessment.completedAt, numLocale),
                            })}
                          </span>
                        ) : null}
                        {assessment.score !== null ? (
                          <span>{t("recent.assessments.score", { score: assessment.score })}</span>
                        ) : null}
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
            ) : null}

            {journey.recentHistory.matching.length > 0 ? (
              <div className="app-panel-soft rounded-[22px] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("recent.matching.heading")}
                  </p>
                  <Link
                    href="/patient/matching"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("recent.matching.viewAll")}
                  </Link>
                </div>
                <div className="space-y-2">
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
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        {matching.completedAt ? (
                          <span>
                            {t("recent.matching.completedAt", {
                              date: formatDate(matching.completedAt, numLocale),
                            })}
                          </span>
                        ) : null}
                        <Link
                          href={`/patient/matching/${matching.id}` as never}
                          className="font-medium text-primary hover:underline"
                        >
                          {t("recent.matching.viewMatching")}
                        </Link>
                        {matching.topRecommendation ? (
                          <Link
                            href={`/practitioners/${matching.topRecommendation.practitionerSlug}` as never}
                            className="font-medium text-primary hover:underline"
                          >
                            {t("recent.matching.viewPractitioner")}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="app-panel-soft mt-4 rounded-[22px] p-5">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("recent.empty.heading")}
            </p>
            <p className="mt-1.5 text-sm text-text-secondary">
              {t("recent.empty.note")}
            </p>
            <Link
              href={fallbackNextStep.href as never}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {t(fallbackNextStep.ctaKey as Parameters<typeof t>[0])}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
          </div>
        )}
      </PatientSectionCard>

      {/* ── Support + quick actions 2-col ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Support card */}
        <PatientSectionCard
          title={t("support.heading")}
        >
          {journey.support.latestOpenTicket ? (
            <div>
              <p className="text-sm text-text-secondary">{t("support.openTicket")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <PatientStatusBadge>
                  {t(
                    `support.categories.${journey.support.latestOpenTicket.category}` as Parameters<typeof t>[0],
                  )}
                </PatientStatusBadge>
                <PatientStatusBadge>
                  {t(
                    `support.statuses.${journey.support.latestOpenTicket.status}` as Parameters<typeof t>[0],
                  )}
                </PatientStatusBadge>
                <PatientStatusBadge>
                  {t("support.updatedAt", {
                    date: formatDate(journey.support.latestOpenTicket.updatedAt, numLocale),
                  })}
                </PatientStatusBadge>
              </div>
              <Link
                href={`/patient/support/${journey.support.latestOpenTicket.id}` as never}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {t("support.viewTicket")}
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-sm text-text-secondary">{t("support.empty")}</p>
              <Link
                href="/patient/support"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {t("support.chatCta")}
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </div>
          )}
        </PatientSectionCard>

        {/* Quick actions card */}
        <PatientSectionCard title={t("quickLinks.utilityHeading")}>
          <div className="grid grid-cols-2 gap-3">
            <PatientActionPanel
              href="/patient/sessions"
              label={t("quickLinks.sessions")}
              icon={<CalendarDays className="h-5 w-5" />}
              tone="indigo"
            />
            <PatientActionPanel
              href="/patient/payments"
              label={t("quickLinks.payments")}
              icon={<CreditCard className="h-5 w-5" />}
              tone="sky"
            />
            <PatientActionPanel
              href="/patient/practitioners"
              label={t("quickLinks.practitioners")}
              icon={<Stethoscope className="h-5 w-5" />}
              tone="emerald"
            />
            <PatientActionPanel
              href="/patient/profile"
              label={t("quickLinks.profile")}
              icon={<UserRound className="h-5 w-5" />}
              tone="teal"
            />
          </div>
        </PatientSectionCard>
      </div>
    </div>
  );
}