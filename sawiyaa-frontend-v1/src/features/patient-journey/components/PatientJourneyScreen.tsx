"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Headphones,
  HeartHandshake,
  LifeBuoy,
  MessageSquare,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Tag,
  UserCheck,
  Users,
  Video,
  Wallet,
  Zap,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { ListStateSkeleton } from "@/components/shared/ContentStates";
import { Skeleton } from "@/components/shared/LoadingStates";
import { usePatientJourney } from "../hooks/use-patient-journey";
import { isPaymentExpired } from "@/features/payments/lib/payment-status";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import { usePatientWalletSummary } from "@/features/payments/hooks/use-payments";
import { useUnifiedUnreadBadge } from "@/features/messages-shell/hooks/use-unified-unread-badge";
import { formatPatientDateTime } from "@/lib/time-formatting";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";
import type {
  PatientJourney,
  PatientJourneyNextStepType,
} from "../types/patient-journey.types";

type StepConfig = {
  href: string | null;
  ctaKey: string | null;
  supported: boolean;
};

function resolveStepConfig(
  journey: PatientJourney,
  type: PatientJourneyNextStepType,
): StepConfig {
  switch (type) {
    case "COMPLETE_PAYMENT": {
      const pendingPaymentStep = journey.nextSteps.find(
        (step) => step.type === "COMPLETE_PAYMENT",
      );
      const actionSessionId =
        pendingPaymentStep?.action?.targetType === "SESSION"
          ? pendingPaymentStep.action.targetId
          : null;
      return {
        href: actionSessionId || journey.upcoming.pendingPayment?.sessionId
          ? `/patient/sessions/${actionSessionId ?? journey.upcoming.pendingPayment?.sessionId}/pay`
          : "/patient/payments",
        ctaKey: "nextSteps.types.COMPLETE_PAYMENT.cta",
        supported: true,
      };
    }
    case "JOIN_UPCOMING_SESSION":
      return {
        href: journey.upcoming.session
          ? `/patient/sessions/${journey.upcoming.session.id}`
          : null,
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

function JourneyLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <div className="rounded-3xl border border-border-light bg-white p-6 sm:p-8 shadow-xs">
        <Skeleton className="h-5 w-32 rounded-full mb-3" />
        <Skeleton className="h-8 w-64 rounded-xl mb-2" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
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

  // Authoritative Queries
  const { data: journey, isLoading, isError, refetch } = usePatientJourney();
  const patientProfileQuery = usePatientProfile();
  const { data: walletData } = usePatientWalletSummary();
  const unreadMessagesCount = useUnifiedUnreadBadge("patient");

  const patientProfile = patientProfileQuery.data?.profile;
  const patientTimeZone = patientProfile?.timezone;
  const patientName = patientProfile?.displayName || "";

  const walletSummary = walletData?.item ?? null;
  const walletCurrency = walletSummary?.currencyCode ?? "EGP";
  const walletBalance = Number(walletSummary?.availableBalance ?? "0");

  if (isLoading) {
    return <JourneyLoadingSkeleton />;
  }

  if (isError || !journey) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <div className="rounded-3xl border border-border-light bg-white p-8 shadow-xs space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-text-primary">
            {t("states.error.heading")}
          </h2>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            {t("states.error.note")}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
            {t("states.error.retry")}
          </Button>
        </div>
      </div>
    );
  }

  // --- Context & Priority Determination ---
  const upcomingSession = journey.upcoming.session;
  const pendingPayment = journey.upcoming.pendingPayment;
  const instantRequest = journey.upcoming.instantBookingRequest;
  const activePendingPayment = Boolean(
    pendingPayment && !isPaymentExpired(pendingPayment),
  );

  const isSessionJoinable = Boolean(
    upcomingSession &&
      (upcomingSession.operational?.actions?.canJoin === true ||
        upcomingSession.operational?.state === "READY_TO_JOIN"),
  );

  const hasUpcomingItems = Boolean(
    upcomingSession || activePendingPayment || instantRequest,
  );

  const hasRecentHistory =
    journey.recentHistory.sessions.length > 0 ||
    journey.recentHistory.assessments.length > 0 ||
    journey.recentHistory.matching.length > 0 ||
    journey.recentHistory.payments.length > 0;

  const recentSessionsExcludingUpcoming = journey.recentHistory.sessions.filter(
    (s) => s.id !== upcomingSession?.id,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-7">
      {/* ── 1. WARM HUMAN GREETING HEADER ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border-light/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 text-[11px] font-semibold text-text-brand dark:bg-primary/20">
              <Sparkles size={11} className="text-primary" />
              <span>{locale === "ar" ? "مرحباً بك" : "Welcome"}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white mt-1">
            {patientName
              ? locale === "ar"
                ? `أهلاً بك، ${patientName}`
                : `Welcome back, ${patientName}`
              : t("hero.title")}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5 max-w-xl">
            {locale === "ar"
              ? "نحن معك خطوة بخطوة في رحلتك نحو صحة نفسية أفضل وحياة أكثر توازناً."
              : t("hero.note")}
          </p>
        </div>

        {/* Live Context Pills */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto pt-1 sm:pt-0">
          {isSessionJoinable ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
              <span>{locale === "ar" ? "جلستك جاهزة الآن" : "Session Ready to Join"}</span>
            </span>
          ) : activePendingPayment ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <Clock size={13} className="text-amber-700" />
              <span>{locale === "ar" ? "دفعة بانتظار التأكيد" : "Pending Payment"}</span>
            </span>
          ) : upcomingSession?.scheduledStartAt ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light border border-primary/20 px-3 py-1 text-xs font-bold text-text-brand dark:bg-primary/20">
              <Calendar size={13} className="text-primary" />
              <span>
                {formatPatientDateTime(upcomingSession.scheduledStartAt, patientTimeZone, {
                  locale: numLocale,
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {/* ── 2. PRIMARY CONTEXT-AWARE HERO CARD ("إيه أهم حاجة دلوقتي؟") ── */}
      {isSessionJoinable && upcomingSession ? (
        /* CASE A: SESSION IS READY TO JOIN RIGHT NOW */
        <div className="rounded-3xl border-2 border-emerald-500/40 bg-linear-to-r from-emerald-50/80 via-white to-emerald-50/50 p-5 sm:p-7 shadow-sm dark:bg-surface-secondary dark:from-emerald-950/20 dark:to-transparent">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white shadow-xs">
                <Video size={13} />
                <span>{locale === "ar" ? "جلستك جاهزة — ادخل الآن" : "Your session is live — Join now"}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white">
                {locale === "ar"
                  ? `جلستك مع ${upcomingSession.practitioner.displayName ?? upcomingSession.practitioner.slug}`
                  : `Session with ${upcomingSession.practitioner.displayName ?? upcomingSession.practitioner.slug}`}
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                {locale === "ar"
                  ? "غرفة الجلسة المباشرة مفتوحة الآن بكامل الخصوصية والأمان. يمكنك الانضمام والتحدث مع المختص مباشرة."
                  : "The private video room is open. Click below to join your specialist directly."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <Link
                href={`/patient/sessions/${upcomingSession.id}` as any}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.99]"
              >
                <span>{locale === "ar" ? "ادخل الجلسة الآن" : "Join Session Now"}</span>
                <ArrowRight size={14} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      ) : activePendingPayment && pendingPayment ? (
        /* CASE B: PENDING PAYMENT ON A BOOKED SESSION */
        <div className="rounded-3xl border border-amber-300 bg-linear-to-r from-amber-50/90 via-white to-amber-50/50 p-5 sm:p-6 shadow-sm dark:bg-surface-secondary dark:from-amber-950/20 dark:to-transparent">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Clock size={13} />
                <span>{t("upcoming.pendingPayment.heading")}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
                {locale === "ar"
                  ? `لديك حجز بانتظار إتمام الدفع (${formatFinanceMoney(numLocale, pendingPayment.amount, pendingPayment.currency)})`
                  : `Booking pending payment (${formatFinanceMoney(numLocale, pendingPayment.amount, pendingPayment.currency)})`}
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                {locale === "ar"
                  ? "يُرجى سداد المبلغ المطلوب لتأكيد حجز جلستك وضمان تثبيت الموعد المحدد."
                  : "Complete payment to secure your scheduled session time."}
              </p>
            </div>

            <div className="shrink-0">
              <Link
                href={
                  pendingPayment.sessionId
                    ? (`/patient/sessions/${pendingPayment.sessionId}/pay` as any)
                    : "/patient/payments"
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.99]"
              >
                <span>{t("upcoming.pendingPayment.cta")}</span>
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      ) : upcomingSession ? (
        /* CASE C: CONFIRMED UPCOMING SESSION */
        <div className="rounded-3xl border border-border-light/80 bg-white p-5 sm:p-6 shadow-xs dark:bg-surface-secondary dark:border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-surface-secondary dark:bg-white/5">
                <PractitionerAvatar
                  src={null}
                  alt={upcomingSession.practitioner.displayName ?? upcomingSession.practitioner.slug}
                  initials={upcomingSession.practitioner.displayName?.slice(0, 2) ?? "DR"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-text-brand dark:bg-primary/15">
                    <Video size={11} className="text-primary" />
                    <span>{t("upcoming.session.heading")}</span>
                  </span>
                  <span className="inline-flex rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-medium text-text-secondary dark:bg-white/5">
                    {tSessions(`status.${upcomingSession.operational.state}` as any)}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary dark:text-white truncate">
                  {upcomingSession.practitioner.displayName ?? upcomingSession.practitioner.slug}
                </h2>
                {upcomingSession.scheduledStartAt && (
                  <p className="text-xs font-semibold text-text-secondary">
                    {formatPatientDateTime(upcomingSession.scheduledStartAt, patientTimeZone, {
                      locale: numLocale,
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2.5">
              <Link
                href={`/patient/sessions/${upcomingSession.id}` as any}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.99]"
              >
                <span>{t("upcoming.session.cta")}</span>
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      ) : instantRequest ? (
        /* CASE D: ACTIVE INSTANT BOOKING REQUEST */
        <div className="rounded-3xl border border-primary/30 bg-primary-light/30 p-5 sm:p-6 shadow-xs dark:bg-primary/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
                <Zap size={13} />
                <span>{t("upcoming.instantBooking.heading")}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary dark:text-white">
                {t("upcoming.instantBooking.note", {
                  practitioner: instantRequest.practitioner.displayName ?? instantRequest.practitioner.slug,
                })}
              </h2>
              <div className="flex items-center gap-3 text-xs text-text-secondary pt-1">
                <span>{t("upcoming.instantBooking.duration", { n: instantRequest.durationMinutes })}</span>
                <span>•</span>
                <span>{t("upcoming.instantBooking.expiresAt", {
                  date: formatPatientDateTime(instantRequest.expiresAt, patientTimeZone, { locale: numLocale, timeStyle: "short" })
                })}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CASE E: NO ACTIVE SESSIONS — CALM INVITATION */
        <div className="rounded-3xl border border-border-light/80 bg-linear-to-b from-[#FCFAF6] to-white p-6 sm:p-8 shadow-xs dark:from-white/5 dark:to-transparent">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-text-brand dark:bg-primary/15">
                <HeartHandshake size={13} className="text-primary" />
                <span>{locale === "ar" ? "ابدأ خطوتك الأولى" : "Start your journey"}</span>
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white">
                {locale === "ar"
                  ? "تحدث مع مختص نفسي موثوق في بيئة آمنة وسرية"
                  : "Connect with a certified specialist in complete privacy"}
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                {locale === "ar"
                  ? "سواء كنت ترغب في حجز جلسة مباشرة، أو تحتاج لمساعدتنا في اختيار المعالج الأنسب لحالتك، نحن هنا لمساندتك."
                  : "Whether you want to browse specialists or get guided matching, we are here to support you."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <Link
                href="/patient/practitioners"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.99]"
              >
                <span>{locale === "ar" ? "تصفح المختصين" : "Browse Specialists"}</span>
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
              <Link
                href="/patient/matching"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-light bg-white px-4 py-3 text-xs font-semibold text-text-secondary hover:bg-surface-tertiary transition dark:bg-white/5 dark:border-white/10"
              >
                <span>{locale === "ar" ? "ساعدني أختار" : "Help Me Choose"}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. CUSTOMER 360 QUICK PATHWAYS (4 CORE HUMAN DESTINATIONS) ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          {locale === "ar" ? "الوصول السريع إلى حسابك" : "Quick Access"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. المختصون */}
          <Link
            href="/patient/practitioners"
            className="group flex flex-col justify-between rounded-2xl border border-border-light/80 bg-white p-4.5 shadow-xs transition hover:border-primary/40 hover:shadow-sm dark:bg-surface-secondary dark:border-white/10"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary group-hover:scale-105 transition-transform dark:bg-primary/20">
                <Users size={18} />
              </div>
              <ArrowRight size={14} className="text-text-muted rtl:rotate-180 transition group-hover:text-primary group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                {t("quickLinks.practitioners")}
              </span>
              <span className="block text-[11px] text-text-secondary mt-0.5 leading-snug">
                {locale === "ar" ? "أطباء ومعالجون نفسيون معتمدون" : "Certified therapists and psychiatrists"}
              </span>
            </div>
          </Link>

          {/* 2. جلساتي */}
          <Link
            href="/patient/sessions"
            className="group flex flex-col justify-between rounded-2xl border border-border-light/80 bg-white p-4.5 shadow-xs transition hover:border-primary/40 hover:shadow-sm dark:bg-surface-secondary dark:border-white/10"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary group-hover:scale-105 transition-transform dark:bg-primary/20">
                <CalendarDays size={18} />
              </div>
              <ArrowRight size={14} className="text-text-muted rtl:rotate-180 transition group-hover:text-primary group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                {t("quickLinks.sessions")}
              </span>
              <span className="block text-[11px] text-text-secondary mt-0.5 leading-snug">
                {locale === "ar" ? "متابعة المواعيد والجلسات السابقة" : "Upcoming appointments & session history"}
              </span>
            </div>
          </Link>

          {/* 3. الرسائل */}
          <Link
            href="/patient/messages"
            className="group flex flex-col justify-between rounded-2xl border border-border-light/80 bg-white p-4.5 shadow-xs transition hover:border-primary/40 hover:shadow-sm dark:bg-surface-secondary dark:border-white/10 relative"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary group-hover:scale-105 transition-transform dark:bg-primary/20">
                <MessageSquare size={18} />
              </div>
              {unreadMessagesCount > 0 ? (
                <span className="inline-flex items-center justify-center rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
                  {unreadMessagesCount}
                </span>
              ) : (
                <ArrowRight size={14} className="text-text-muted rtl:rotate-180 transition group-hover:text-primary group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              )}
            </div>
            <div>
              <span className="block text-sm font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                {locale === "ar" ? "الرسائل والمحادثات" : "Messages"}
              </span>
              <span className="block text-[11px] text-text-secondary mt-0.5 leading-snug">
                {locale === "ar" ? "محادثات المختصين وفريق المتابعة" : "Direct chats with specialists & care"}
              </span>
            </div>
          </Link>

          {/* 4. المدفوعات والمحفظة */}
          <Link
            href="/patient/payments"
            className="group flex flex-col justify-between rounded-2xl border border-border-light/80 bg-white p-4.5 shadow-xs transition hover:border-primary/40 hover:shadow-sm dark:bg-surface-secondary dark:border-white/10"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary group-hover:scale-105 transition-transform dark:bg-primary/20">
                <Wallet size={18} />
              </div>
              <ArrowRight size={14} className="text-text-muted rtl:rotate-180 transition group-hover:text-primary group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                {locale === "ar" ? "المدفوعات والمحفظة" : "Payments & Wallet"}
              </span>
              <span className="block text-[11px] text-text-secondary mt-0.5 leading-snug">
                {walletBalance > 0
                  ? locale === "ar"
                    ? `رصيد المحفظة: ${formatFinanceMoney(numLocale, String(walletBalance), walletCurrency)}`
                    : `Wallet Balance: ${formatFinanceMoney(numLocale, String(walletBalance), walletCurrency)}`
                  : locale === "ar"
                    ? "سجل المعاملات ورصيد المحفظة"
                    : "Billing history & wallet balance"}
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 4. INSTANT BOOKING & GUIDED MATCHING SECTION ── */}
      <div className="grid gap-5 md:grid-cols-2 items-stretch">
        {/* Instant Booking Card */}
        <div className="rounded-3xl border border-border-light/80 bg-white p-5 sm:p-6 shadow-xs dark:bg-surface-secondary dark:border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                <span>{t("instantBooking.chips.availableNow")}</span>
              </span>
            </div>
            <h3 className="text-base font-bold text-text-primary dark:text-white">
              {t("instantBooking.title")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {locale === "ar"
                ? "تحدث اليوم مع مختص متاح مباشرة دون الحاجة لانتظار مواعيد لاحقة. جلسات مرنة مدتها 30 أو 60 دقيقة."
                : t("instantBooking.note")}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/patient/practitioners?onlineNow=true&instantBookingEnabled=true"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.99]"
            >
              <span>{t("instantBooking.cta")}</span>
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Guided Matching & Assessment Card */}
        <div className="rounded-3xl border border-border-light/80 bg-white p-5 sm:p-6 shadow-xs dark:bg-surface-secondary dark:border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-bold dark:bg-indigo-950/40 dark:text-indigo-300">
                <Sparkles size={11} className="text-indigo-600" />
                <span>{locale === "ar" ? "توجيه واختيار" : "Guided Care"}</span>
              </span>
            </div>
            <h3 className="text-base font-bold text-text-primary dark:text-white">
              {locale === "ar" ? "محتار تختار المختص الأنسب؟" : "Need help choosing the right specialist?"}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {locale === "ar"
                ? "أجب عن بعض الأسئلة البسيطة لنقترح عليك أفضل الأطباء والمعالجين المتخصصين في نوع التحدي الذي تواجهه."
                : "Answer simple questions to get personalized practitioner recommendations."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Link
              href="/patient/matching"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.99]"
            >
              <span>{locale === "ar" ? "ساعدني أختار" : "Guided Matching"}</span>
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
            <Link
              href="/patient/assessments"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-light bg-[#FCFAF6] px-3.5 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-tertiary transition dark:bg-white/5 dark:border-white/10"
            >
              <span>{t("nextSteps.types.TAKE_ASSESSMENT.cta")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 5. SUPPORT CHANNEL SECTION ── */}
      <div className="rounded-3xl border border-border-light/80 bg-white p-5 sm:p-6 shadow-xs dark:bg-surface-secondary dark:border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20">
              <Headphones size={18} />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-text-primary dark:text-white">
                {t("support.heading")}
              </h3>
              {journey.support.latestOpenTicket ? (
                <p className="text-xs text-text-secondary leading-relaxed">
                  {locale === "ar"
                    ? `لديك طلب دعم قيد المتابعة (${t(`support.categories.${journey.support.latestOpenTicket.category}` as any)} • ${t(`support.statuses.${journey.support.latestOpenTicket.status}` as any)})`
                    : t("support.openTicket")}
                </p>
              ) : (
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t("support.empty")}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {journey.support.latestOpenTicket ? (
              <Link
                href={`/patient/messages?lane=support&id=${journey.support.latestOpenTicket.id}&focusComposer=true` as any}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.99]"
              >
                <span>{t("support.sendMessage")}</span>
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            ) : (
              <Link
                href="/patient/messages?lane=support&new=true"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-light bg-[#FCFAF6] px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-primary-light hover:text-text-brand hover:border-primary/40 transition dark:bg-white/5 dark:border-white/10"
              >
                <span>{t("support.chatCta")}</span>
                <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. RECENT ACTIVITY & CONTEXT (ONLY IF AVAILABLE) ── */}
      {hasRecentHistory && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              {t("recent.heading")}
            </h3>
            <p className="text-[11px] text-text-muted">
              {t("recent.note")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Recent Sessions */}
            {recentSessionsExcludingUpcoming.length > 0 && (
              <div className="rounded-2xl border border-border-light/80 bg-white p-4 shadow-xs dark:bg-surface-secondary dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-border-light/40 pb-2">
                  <span className="text-xs font-bold text-text-primary dark:text-white">
                    {t("recent.sessions.heading")}
                  </span>
                  <Link href="/patient/sessions" className="text-[11px] font-semibold text-primary hover:underline">
                    {t("recent.sessions.viewAll")}
                  </Link>
                </div>
                <div className="space-y-2">
                  {recentSessionsExcludingUpcoming.slice(0, 2).map((s) => (
                    <Link
                      key={s.id}
                      href={`/patient/sessions/${s.id}` as any}
                      className="block rounded-xl bg-[#FCFAF6] p-2.5 transition hover:bg-primary-light/40 dark:bg-white/5"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-text-primary dark:text-white">
                        <span className="truncate">{s.practitioner.displayName ?? s.practitioner.slug}</span>
                        <span className="text-[10px] font-medium text-text-secondary">
                          {tSessions(`status.${s.operational.state}` as any)}
                        </span>
                      </div>
                      {s.scheduledStartAt && (
                        <p className="mt-0.5 text-[10px] text-text-secondary">
                          {formatPatientDateTime(s.scheduledStartAt, patientTimeZone, {
                            locale: numLocale,
                            dateStyle: "short",
                          })}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Payments */}
            {journey.recentHistory.payments.length > 0 && (
              <div className="rounded-2xl border border-border-light/80 bg-white p-4 shadow-xs dark:bg-surface-secondary dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-border-light/40 pb-2">
                  <span className="text-xs font-bold text-text-primary dark:text-white">
                    {t("recent.payments.heading")}
                  </span>
                  <Link href="/patient/payments" className="text-[11px] font-semibold text-primary hover:underline">
                    {t("recent.payments.viewAll")}
                  </Link>
                </div>
                <div className="space-y-2">
                  {journey.recentHistory.payments.slice(0, 2).map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl bg-[#FCFAF6] p-2.5 dark:bg-white/5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-text-primary dark:text-white">
                        <span>{formatFinanceMoney(numLocale, p.amount, p.currency)}</span>
                        <span className="text-[10px] font-medium text-text-secondary">
                          {tPayments(`history.status.${p.status}` as any)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-text-secondary">
                        <span>
                          {formatPatientDateTime(p.createdAt, patientTimeZone, {
                            locale: numLocale,
                            dateStyle: "short",
                          })}
                        </span>
                        {p.sessionId && (
                          <Link
                            href={`/patient/sessions/${p.sessionId}` as any}
                            className="font-semibold text-primary hover:underline"
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

            {/* Recent Assessments / Matching */}
            {(journey.recentHistory.assessments.length > 0 || journey.recentHistory.matching.length > 0) && (
              <div className="rounded-2xl border border-border-light/80 bg-white p-4 shadow-xs dark:bg-surface-secondary dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-border-light/40 pb-2">
                  <span className="text-xs font-bold text-text-primary dark:text-white">
                    {locale === "ar" ? "التقييمات والمطابقة" : "Assessments & Matching"}
                  </span>
                  <Link href="/patient/assessments" className="text-[11px] font-semibold text-primary hover:underline">
                    {t("recent.assessments.viewAll")}
                  </Link>
                </div>
                <div className="space-y-2">
                  {journey.recentHistory.assessments.slice(0, 1).map((a) => (
                    <div key={a.id} className="rounded-xl bg-[#FCFAF6] p-2.5 dark:bg-white/5 text-xs space-y-1">
                      <p className="font-bold text-text-primary dark:text-white truncate">{a.assessmentTitle}</p>
                      <div className="flex items-center justify-between text-[10px] text-text-secondary">
                        <span>
                          {a.completedAt &&
                            formatPatientDateTime(a.completedAt, patientTimeZone, {
                              locale: numLocale,
                              dateStyle: "short",
                            })}
                        </span>
                        <Link
                          href={`/patient/assessments/submissions/${a.id}` as any}
                          className="font-semibold text-primary hover:underline"
                        >
                          {t("recent.assessments.viewResult")}
                        </Link>
                      </div>
                    </div>
                  ))}
                  {journey.recentHistory.matching.slice(0, 1).map((m) => (
                    <div key={m.id} className="rounded-xl bg-[#FCFAF6] p-2.5 dark:bg-white/5 text-xs space-y-1">
                      <p className="font-bold text-text-primary dark:text-white truncate">
                        {m.topRecommendation
                          ? t("recent.matching.recommendation", {
                              practitioner:
                                m.topRecommendation.practitionerDisplayName ??
                                m.topRecommendation.practitionerSlug,
                            })
                          : t("recent.matching.noRecommendation")}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-text-secondary">
                        <Link
                          href={`/patient/matching/${m.id}` as any}
                          className="font-semibold text-primary hover:underline"
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
        </div>
      )}
    </div>
  );
}
