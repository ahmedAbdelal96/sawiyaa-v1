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
  Zap,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { ListStateSkeleton } from "@/components/shared/ContentStates";
import { Skeleton } from "@/components/shared/LoadingStates";
import {
  PatientPageHeader,
  PatientSectionCard,
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
          ? `/patient/messages?lane=support&id=${journey.support.latestOpenTicket.id}`
          : "/patient/messages?lane=support",
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

function PatientJourneySkeleton() {
  return (
    <div className="app-max-content mx-auto space-y-5 sawiyaa-animate-fade-in">
      {/* ── Welcome Hero Skeleton ── */}
      <div className="rounded-[24px] border border-border-light bg-surface-tertiary p-6 md:p-8 border-s-4 border-s-primary shadow-sawiyaa-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl w-full">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          {/* Next Action Widget Skeleton */}
          <div className="shrink-0 flex flex-col items-start gap-4 p-5 rounded-2xl bg-white border border-border-light shadow-theme-sm max-w-sm w-full lg:w-80">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="space-y-1.5 w-full">
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* ── Active Care Timeline Skeleton ── */}
      <div className="rounded-[24px] border border-border-light bg-white p-4 shadow-sawiyaa-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-2 w-full max-w-xl">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-xl shrink-0" />
        </div>
      </div>

      {/* ── Instant Booking Pathway Skeleton ── */}
      <div className="rounded-[24px] border border-border-light bg-white p-6 shadow-sawiyaa-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 w-full max-w-xl">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl shrink-0" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 mt-6 pt-6 border-t border-border-light">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>

      {/* ── Service Shortcuts Skeleton ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-border-light">
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <div className="space-y-1.5 w-full">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Care Journey Columns Skeleton ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[24px] border border-border-light bg-white p-6 shadow-sawiyaa-card space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-xl border border-border-light bg-surface-tertiary space-y-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-5/6" />
            </div>
            <div className="p-4 rounded-xl border border-border-light bg-surface-tertiary space-y-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-border-light bg-white p-6 shadow-sawiyaa-card flex flex-col justify-between">
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-6 w-1/3" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function PatientJourneyScreen() {
  const t = useTranslations("patient-journey");
  const tSessions = useTranslations("sessions");
  const tPayments = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const { data: journey, isLoading, isError, refetch } = usePatientJourney();

  if (isLoading) {
    return <PatientJourneySkeleton />;
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
    <div className="app-max-content mx-auto space-y-5 sawiyaa-animate-fade-in">
      {/* ── Welcome Hero & Dynamic Journey Action Banner ── */}
      <div className="rounded-[24px] border border-border-light bg-surface-tertiary p-6 md:p-8 border-s-4 border-s-primary shadow-sawiyaa-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                {t("hero.eyebrow")}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight leading-tight">
              {t("hero.title")}
            </h1>
            <p className="text-sm md:text-base text-text-secondary leading-relaxed max-w-xl">
              {t("hero.note")}
            </p>
            
            {/* Live Context badges */}
            {summaryBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {summaryBadges}
              </div>
            )}
          </div>

          {/* Next Best Action Widget */}
          {primaryStep && primaryConfig && (
            <div className="shrink-0 flex flex-col items-start gap-4 p-5 rounded-2xl bg-white border border-border-light shadow-theme-sm max-w-sm w-full lg:w-80 sawiyaa-hover-lift">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary">
                  <StepIcon type={primaryStep.type} />
                </span>
                <span className="text-xs font-semibold tracking-wider uppercase text-text-muted">
                  {t("primaryAction.eyebrow")}
                </span>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-text-primary">
                  {t(`nextSteps.types.${primaryStep.type}.title` as any)}
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t(`nextSteps.types.${primaryStep.type}.note` as any)}
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full pt-1">
                {primaryConfig.href ? (
                  <Link
                    href={primaryConfig.href as any}
                    className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary-hover sawiyaa-btn-press"
                  >
                    {t(primaryConfig.ctaKey as any)}
                    <ArrowRight size={13} className="rtl:rotate-180" />
                  </Link>
                ) : (
                  <div className="w-full text-center text-xs text-text-muted py-2 bg-surface-tertiary rounded-xl border border-border-light">
                    {t("nextSteps.unavailable")}
                  </div>
                )}
                
                {/* Secondary CTAs */}
                {primaryStep.type === "START_GUIDED_MATCHING" && (
                  <Link
                    href="/patient/practitioners"
                    className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-primary px-4 py-2 text-xs font-semibold text-primary hover:bg-primary-light transition-all sawiyaa-btn-press"
                  >
                    {t("quickLinks.practitioners")}
                  </Link>
                )}
                {primaryStep.type === "COMPLETE_PAYMENT" && (
                  <Link
                    href="/patient/payments"
                    className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-primary px-4 py-2 text-xs font-semibold text-primary hover:bg-primary-light transition-all sawiyaa-btn-press"
                  >
                    {t("quickLinks.payments")}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Active Care Timeline Panel ── */}
      {hasUpcomingItems ? (
        <div className="rounded-[24px] border border-border-light bg-white p-6 shadow-sawiyaa-card">
          <div className="flex items-center gap-2 mb-6 border-b border-border-light pb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {t("upcoming.session.heading")}
              </h2>
              <p className="text-xs text-text-secondary">
                {t("upcoming.empty.heading")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Active Pending payment */}
            {activePendingPayment && pendingPayment ? (
              <div className="rounded-[22px] border border-border-light bg-surface-tertiary p-5 relative overflow-hidden sawiyaa-hover-lift">
                <div className="absolute top-0 start-0 h-1 w-full bg-warning" />
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    {t("upcoming.pendingPayment.heading")}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                    {t("summary.chips.pendingPayment")}
                  </span>
                </div>
                <p className="text-2xl font-black text-text-primary">
                  {formatAmount(pendingPayment.amount, pendingPayment.currency, numLocale)}
                </p>
                <p className="mt-1.5 text-xs text-text-secondary">
                  {tPayments(`history.status.${pendingPayment.status}` as any)}
                </p>
                <Link
                  href={
                    pendingPayment.sessionId
                      ? `/patient/sessions/${pendingPayment.sessionId}/pay`
                      : "/patient/payments"
                  }
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-warning px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-warning/90 sawiyaa-btn-press"
                >
                  {t("upcoming.pendingPayment.cta")}
                  <ArrowRight size={12} className="rtl:rotate-180" />
                </Link>
              </div>
            ) : null}

            {/* Active Upcoming session */}
            {upcomingSession ? (
              <div className="rounded-[22px] border border-border-light bg-surface-tertiary p-5 relative overflow-hidden sawiyaa-hover-lift">
                <div className="absolute top-0 start-0 h-1 w-full bg-primary" />
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    {t("upcoming.session.heading")}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary">
                    {tSessions(`status.${upcomingSession.status}` as any)}
                  </span>
                </div>
                <p className="text-lg font-bold text-text-primary leading-tight">
                  {upcomingSession.practitioner.displayName ?? upcomingSession.practitioner.slug}
                </p>
                {upcomingSession.scheduledStartAt ? (
                  <p className="mt-1 text-xs text-text-secondary">
                    {formatDatetime(upcomingSession.scheduledStartAt, numLocale)}
                  </p>
                ) : null}
                <Link
                  href={`/patient/sessions/${upcomingSession.id}` as any}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary-hover sawiyaa-btn-press"
                >
                  {t("upcoming.session.cta")}
                  <ArrowRight size={12} className="rtl:rotate-180" />
                </Link>
              </div>
            ) : null}

            {/* Instant booking request */}
            {instantRequest ? (
              <div className="rounded-[22px] border border-primary/20 bg-primary-light/40 p-5 relative overflow-hidden">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {t("upcoming.instantBooking.heading")}
                  </p>
                  <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                </div>
                <p className="text-sm font-bold text-text-primary">
                  {t("upcoming.instantBooking.note", {
                    practitioner: instantRequest.practitioner.displayName ?? instantRequest.practitioner.slug,
                  })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/10">
                    {t("upcoming.instantBooking.duration", { n: instantRequest.durationMinutes })}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-text-muted border border-border-light">
                    {t("upcoming.instantBooking.expiresAt", { date: formatDatetime(instantRequest.expiresAt, numLocale) })}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* Compact empty state visually grouped with primary content */
        <div className="rounded-[24px] border border-border-light bg-white p-4 shadow-sawiyaa-card sawiyaa-hover-lift">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="space-y-0.5 text-start">
                <h2 className="text-sm font-bold text-text-primary">
                  {t("upcoming.session.heading")}
                </h2>
                <p className="text-xs text-text-secondary leading-normal max-w-xl">
                  {t("upcoming.empty.note")}
                </p>
              </div>
            </div>
            <Link
              href={fallbackNextStep.href as any}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary-hover sawiyaa-btn-press shrink-0"
            >
              {t(fallbackNextStep.ctaKey as any)}
              <ArrowRight size={12} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Instant Booking Pathway ── */}
      <div className="rounded-[24px] border border-border-light bg-white p-6 shadow-sawiyaa-card relative overflow-hidden sawiyaa-hover-lift">
        <div className="absolute top-0 end-0 h-full w-32 bg-primary-light/30 rounded-e-[24px] pointer-events-none transform translate-x-12 skew-x-12" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-1">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              {t("instantBooking.eyebrow")}
            </span>
            <h3 className="text-xl font-bold text-text-primary">
              {t("instantBooking.title")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t("instantBooking.note")}
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href="/patient/instant-booking"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary-hover sawiyaa-btn-press"
            >
              {t("instantBooking.cta")}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Feature info */}
        <div className="grid gap-3 sm:grid-cols-3 mt-6 pt-6 border-t border-border-light">
          <div className="rounded-xl bg-primary-light/50 p-4 border border-primary/10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
              <Zap className="h-4 w-4" />
              <span>{t("instantBooking.chips.availableNow")}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
              {t("instantBooking.note")}
            </p>
          </div>
          <div className="rounded-xl bg-surface-tertiary p-4 border border-border-light">
            <span className="text-xs font-bold uppercase text-text-muted">
              {t("instantBooking.chips.duration")}
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
              {t("instantBooking.chips.durationNote")}
            </p>
          </div>
          <div className="rounded-xl bg-surface-tertiary p-4 border border-border-light">
            <span className="text-xs font-bold uppercase text-text-muted">
              {t("instantBooking.chips.pricing")}
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
              {t("instantBooking.chips.pricingNote")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Service Shortcuts ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/patient/practitioners"
          className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-border-light sawiyaa-hover-lift sawiyaa-btn-press"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary group-hover:scale-105 transition-transform">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <span className="block text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
              {t("quickLinks.practitioners")}
            </span>
            <span className="block text-[11px] text-text-secondary truncate">
              {t("nextSteps.types.BOOK_NEXT_SESSION.note")}
            </span>
          </div>
        </Link>
        
        <Link
          href="/patient/sessions"
          className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-border-light sawiyaa-hover-lift sawiyaa-btn-press"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary group-hover:scale-105 transition-transform">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <span className="block text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
              {t("quickLinks.sessions")}
            </span>
            <span className="block text-[11px] text-text-secondary truncate">
              {t("nextSteps.types.JOIN_UPCOMING_SESSION.note")}
            </span>
          </div>
        </Link>
        
        <Link
          href="/patient/payments"
          className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-border-light sawiyaa-hover-lift sawiyaa-btn-press"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary group-hover:scale-105 transition-transform">
            <CreditCard className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <span className="block text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
              {t("quickLinks.payments")}
            </span>
            <span className="block text-[11px] text-text-secondary truncate">
              {t("nextSteps.types.COMPLETE_PAYMENT.note")}
            </span>
          </div>
        </Link>
        
        <Link
          href="/patient/messages?lane=support"
          className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-border-light sawiyaa-hover-lift sawiyaa-btn-press"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary group-hover:scale-105 transition-transform">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <span className="block text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
              {t("support.heading")}
            </span>
            <span className="block text-[11px] text-text-secondary truncate">
              {t("support.chatCta")}
            </span>
          </div>
        </Link>
      </div>

      {/* ── Care Journey & Support columns ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Care Journey Cards */}
        <div className="rounded-[24px] border border-border-light bg-white p-6 shadow-sawiyaa-card">
          <h3 className="text-lg font-bold text-text-primary mb-4 pb-2 border-b border-border-light">
            {t("quickLinks.careHeading")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/patient/matching"
              className="group flex flex-col justify-between p-4 rounded-xl border border-border-light bg-surface-tertiary sawiyaa-hover-lift sawiyaa-btn-press"
            >
              <div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mb-3 group-hover:scale-105 transition-transform">
                  <HeartHandshake className="h-4 w-4" />
                </span>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  {t("nextSteps.types.START_GUIDED_MATCHING.cta")}
                </h4>
                <p className="mt-1 text-[11px] leading-normal text-text-secondary">
                  {t("nextSteps.types.START_GUIDED_MATCHING.note")}
                </p>
              </div>
              <span className="mt-4 text-xs font-semibold text-primary inline-flex items-center gap-1">
                {t("nextSteps.types.START_GUIDED_MATCHING.cta")}
                <ArrowRight size={10} className="rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>

            <Link
              href="/patient/assessments"
              className="group flex flex-col justify-between p-4 rounded-xl border border-border-light bg-surface-tertiary sawiyaa-hover-lift sawiyaa-btn-press"
            >
              <div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-3 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  {t("nextSteps.types.TAKE_ASSESSMENT.cta")}
                </h4>
                <p className="mt-1 text-[11px] leading-normal text-text-secondary">
                  {t("nextSteps.types.TAKE_ASSESSMENT.note")}
                </p>
              </div>
              <span className="mt-4 text-xs font-semibold text-primary inline-flex items-center gap-1">
                {t("nextSteps.types.TAKE_ASSESSMENT.cta")}
                <ArrowRight size={10} className="rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>
        </div>

        {/* Support ticket card */}
        <div className="rounded-[24px] border border-border-light bg-white p-6 shadow-sawiyaa-card flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-4 pb-2 border-b border-border-light">
              {t("support.heading")}
            </h3>
            
            {journey.support.latestOpenTicket ? (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t("support.openTicket")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <PatientStatusBadge>
                    {t(`support.categories.${journey.support.latestOpenTicket.category}` as any)}
                  </PatientStatusBadge>
                  <PatientStatusBadge>
                    {t(`support.statuses.${journey.support.latestOpenTicket.status}` as any)}
                  </PatientStatusBadge>
                  <span className="inline-flex items-center rounded-full bg-surface-tertiary border border-border-soft px-3 py-1.5 text-xs font-medium text-text-secondary">
                    {t("support.updatedAt", {
                      date: formatDate(journey.support.latestOpenTicket.updatedAt, numLocale),
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t("support.empty")}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border-light">
            {journey.support.latestOpenTicket ? (
              <Link
                href={`/patient/messages?lane=support&id=${journey.support.latestOpenTicket.id}` as any}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary-hover sawiyaa-btn-press"
              >
                {t("support.viewTicket")}
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            ) : (
              <Link
                href="/patient/messages?lane=support"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary-hover sawiyaa-btn-press"
              >
                {t("support.chatCta")}
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity Section ── */}
      <div className="rounded-[24px] border border-border-light bg-white p-6 shadow-sawiyaa-card">
        <div className="space-y-1 mb-6 pb-4 border-b border-border-light">
          <h3 className="text-lg font-bold text-text-primary">
            {t("recent.heading")}
          </h3>
          <p className="text-xs text-text-secondary">
            {t("recent.note")}
          </p>
        </div>

        {hasRecentHistory ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Sessions */}
            {recentSessionsExcludingUpcoming.length > 0 && (
              <div className="rounded-xl border border-border-light bg-surface-tertiary p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text-primary">
                    {t("recent.sessions.heading")}
                  </h4>
                  <Link href="/patient/sessions" className="text-xs font-bold text-primary hover:underline">
                    {t("recent.sessions.viewAll")}
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentSessionsExcludingUpcoming.slice(0, 3).map((session) => (
                    <Link
                      key={session.id}
                      href={`/patient/sessions/${session.id}` as any}
                      className="flex items-center justify-between gap-4 rounded-xl bg-white p-3 border border-border-light sawiyaa-hover-lift sawiyaa-btn-press"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">
                          {session.practitioner.displayName ?? session.practitioner.slug}
                        </p>
                        {session.scheduledStartAt && (
                          <p className="mt-0.5 text-[10px] text-text-secondary">
                            {formatDatetime(session.scheduledStartAt, numLocale)}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 inline-flex rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-semibold text-primary border border-primary/10">
                        {tSessions(`status.${session.status}` as any)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Payments */}
            {journey.recentHistory.payments.length > 0 && (
              <div className="rounded-xl border border-border-light bg-surface-tertiary p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text-primary">
                    {t("recent.payments.heading")}
                  </h4>
                  <Link href="/patient/payments" className="text-xs font-bold text-primary hover:underline">
                    {t("recent.payments.viewAll")}
                  </Link>
                </div>
                <div className="space-y-3">
                  {journey.recentHistory.payments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="rounded-xl bg-white p-3 border border-border-light">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-text-primary">
                          {formatAmount(payment.amount, payment.currency, numLocale)}
                        </span>
                        <span className="inline-flex rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-semibold text-primary border border-primary/10">
                          {tPayments(`history.status.${payment.status}` as any)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-text-secondary">
                        <span>{formatDate(payment.createdAt, numLocale)}</span>
                        {payment.sessionId && (
                          <Link
                            href={`/patient/sessions/${payment.sessionId}` as any}
                            className="font-bold text-primary hover:underline"
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

            {/* Assessments */}
            {journey.recentHistory.assessments.length > 0 && (
              <div className="rounded-xl border border-border-light bg-surface-tertiary p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text-primary">
                    {t("recent.assessments.heading")}
                  </h4>
                  <Link href="/patient/assessments" className="text-xs font-bold text-primary hover:underline">
                    {t("recent.assessments.viewAll")}
                  </Link>
                </div>
                <div className="space-y-3">
                  {journey.recentHistory.assessments.slice(0, 3).map((assessment) => (
                    <div key={assessment.id} className="rounded-xl bg-white p-3 border border-border-light">
                      <p className="text-xs font-bold text-text-primary line-clamp-1">
                        {assessment.assessmentTitle}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-text-secondary">
                        {assessment.completedAt && (
                          <span>
                            {t("recent.assessments.completedAt", {
                              date: formatDate(assessment.completedAt, numLocale),
                            })}
                          </span>
                        )}
                        <Link
                          href={`/patient/assessments/submissions/${assessment.id}` as any}
                          className="font-bold text-primary hover:underline"
                        >
                          {t("recent.assessments.viewResult")}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matching */}
            {journey.recentHistory.matching.length > 0 && (
              <div className="rounded-xl border border-border-light bg-surface-tertiary p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text-primary">
                    {t("recent.matching.heading")}
                  </h4>
                  <Link href="/patient/matching" className="text-xs font-bold text-primary hover:underline">
                    {t("recent.matching.viewAll")}
                  </Link>
                </div>
                <div className="space-y-3">
                  {journey.recentHistory.matching.slice(0, 3).map((matching) => (
                    <div key={matching.id} className="rounded-xl bg-white p-3 border border-border-light">
                      <p className="text-xs font-bold text-text-primary line-clamp-1">
                        {matching.topRecommendation
                          ? t("recent.matching.recommendation", {
                              practitioner:
                                matching.topRecommendation.practitionerDisplayName ??
                                matching.topRecommendation.practitionerSlug,
                            })
                          : t("recent.matching.noRecommendation")}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-text-secondary">
                        {matching.completedAt && (
                          <span>
                            {t("recent.matching.completedAt", {
                              date: formatDate(matching.completedAt, numLocale),
                            })}
                          </span>
                        )}
                        <Link
                          href={`/patient/matching/${matching.id}` as any}
                          className="font-bold text-primary hover:underline"
                        >
                          {t("recent.matching.viewMatching")}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border-light bg-surface-tertiary p-4 text-center max-w-sm mx-auto my-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary mx-auto mb-2">
              <Zap className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-text-primary">
              {t("recent.empty.heading")}
            </h4>
            <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
              {t("recent.empty.note")}
            </p>
            <Link
              href={fallbackNextStep.href as any}
              className="mt-3 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
            >
              {t(fallbackNextStep.ctaKey as any)}
              <ArrowRight size={10} className="rtl:rotate-180" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
