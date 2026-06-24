"use client";

import { useMemo, useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  Clock3,
  WalletCards,
  Zap,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceActionLink, SurfaceCard } from "@/components/shared/SurfaceShell";
import {
  AreaTrendChart,
  BarTrendChart,
} from "@/components/charts";
import {
  PractitionerDashboardChartCard,
  PractitionerDashboardKpiCard,
  PractitionerDashboardQueueCard,
  PractitionerDashboardSectionHeader,
} from "./dashboard";
import { useNowTick } from "@/features/instant-booking/hooks/use-now-tick";
import { usePractitionerPendingBookingRequests } from "@/features/instant-booking/hooks/use-instant-booking";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import { usePractitionerProfile } from "../hooks/use-practitioners";
import { usePractitionerSessions } from "@/features/sessions/hooks/use-sessions";
import { usePractitionerSettlements, usePractitionerWallet } from "@/features/financial-operations/hooks/use-financial-operations";
import {
  formatPractitionerOrViewerDate,
  formatPractitionerOrViewerDateTime,
  formatTimeZoneLabel,
} from "@/lib/time-formatting";
import type { SessionListItem } from "@/features/sessions/types/sessions.types";

type LocaleCopy = {
  pageTitle: string;
  pageSubtitle: string;
  pageNote: string;
  common: {
    loading: string;
    noData: string;
    unknown: string;
    viewAll: string;
    updatedLabel: string;
  };
  kpi: {
    sessionsToday: string;
    joinableNow: string;
    walletAvailable: string;
    lastSettlement: string;
    sessionsTodayHelper: string;
    joinableNowHelper: string;
    walletHelper: string;
    lastSettlementHelper: string;
  };
  charts: {
    heading: string;
    subtitle: string;
    sessionsTitle: string;
    sessionsSubtitle: string;
    sessionsSeries: string;
    sessionsAverageSeries: string;
    settlementsTitle: string;
    settlementsSubtitle: string;
    settlementsSeries: string;
  };
  activity: {
    heading: string;
    subtitle: string;
    upcomingSessionsTitle: string;
    upcomingSessionsSubtitle: string;
    upcomingSessionsEmpty: string;
    quickActionsTitle: string;
    quickActionsSubtitle: string;
  };
  delta: {
    upFromYesterday: string;
    downFromYesterday: string;
    unchanged: string;
  };
  actions: {
    sessions: string;
    wallet: string;
    settlements: string;
  };
  pendingBalanceLabel: string;
  timezoneLabel: string;
};

const COPY: Record<"en" | "ar", LocaleCopy> = {
  en: {
    pageTitle: "Practitioner Operations Dashboard",
    pageSubtitle:
      "A focused snapshot of your sessions and financial movement.",
    pageNote:
      "Powered by your live practitioner contracts to keep this screen accurate and actionable.",
    common: {
      loading: "Loading...",
      noData: "No data available",
      unknown: "Unknown",
      viewAll: "View all",
      updatedLabel: "Updated",
    },
    kpi: {
      sessionsToday: "Sessions today",
      joinableNow: "Joinable sessions now",
      walletAvailable: "Projected wallet balance",
      lastSettlement: "Latest settlement",
      sessionsTodayHelper: "Sessions scheduled for today.",
      joinableNowHelper: "Sessions currently ready to join or in progress.",
      walletHelper: "Derived from recorded accounting entries, not a bank balance.",
      lastSettlementHelper: "Most recent settlement amount recorded.",
    },
    charts: {
      heading: "Trends",
      subtitle: "A compact view of sessions and settlements over time.",
      sessionsTitle: "Sessions trend (last 14 days)",
      sessionsSubtitle: "Daily sessions versus rolling 3-day average.",
      sessionsSeries: "Sessions",
      sessionsAverageSeries: "3-day average",
      settlementsTitle: "Settlement trend",
      settlementsSubtitle: "Latest settlement batches by time.",
      settlementsSeries: "Settlements",
    },
    activity: {
      heading: "Upcoming sessions",
      subtitle: "Your next scheduled sessions.",
      upcomingSessionsTitle: "Next sessions",
      upcomingSessionsSubtitle: "Sorted by date, earliest first.",
      upcomingSessionsEmpty: "No upcoming sessions right now.",
      quickActionsTitle: "Quick actions",
      quickActionsSubtitle: "Fast shortcuts to your key workflows.",
    },
    delta: {
      upFromYesterday: "{value}% up vs yesterday",
      downFromYesterday: "{value}% down vs yesterday",
      unchanged: "No change vs yesterday",
    },
    actions: {
      sessions: "Sessions",
      wallet: "Wallet",
      settlements: "Settlements",
    },
    pendingBalanceLabel: "Pending from ledger",
    timezoneLabel: "Times shown in your timezone",
  },
  ar: {
    pageTitle: "لوحة المعالج",
    pageSubtitle: "ملخص سريع لأهم أرقام الجلسات والتسويات.",
    pageNote: "تعتمد هذه الصفحة على بياناتك الفعلية لتقديم أرقام دقيقة ومباشرة.",
    common: {
      loading: "جاري التحميل...",
      noData: "لا توجد بيانات متاحة",
      unknown: "غير معروف",
      viewAll: "عرض الكل",
      updatedLabel: "آخر تحديث",
    },
    kpi: {
      sessionsToday: "جلسات اليوم",
      joinableNow: "جلسات جاهزة الآن",
      walletAvailable: "الرصيد التقديري بالمحفظة",
      lastSettlement: "آخر تسوية",
      sessionsTodayHelper: "عدد الجلسات المقررة اليوم.",
      joinableNowHelper: "جلسات جاهزة للدخول الآن أو قيد التنفيذ.",
      walletHelper: "مستنتج من القيود المالية المسجلة، وليس رصيدًا بنكيًا.",
      lastSettlementHelper: "قيمة آخر تسوية مسجلة.",
    },
    charts: {
      heading: "الاتجاهات",
      subtitle: "اتجاه الجلسات والتسويات خلال الفترات الأخيرة.",
      sessionsTitle: "اتجاه الجلسات (آخر 14 يومًا)",
      sessionsSubtitle: "الجلسات اليومية مقارنة بمتوسط متحرك 3 أيام.",
      sessionsSeries: "الجلسات",
      sessionsAverageSeries: "متوسط 3 أيام",
      settlementsTitle: "اتجاه التسويات",
      settlementsSubtitle: "آخر دفعات التسوية عبر الفترات.",
      settlementsSeries: "التسويات",
    },
    activity: {
      heading: "الجلسات القادمة",
      subtitle: "أقرب الجلسات المجدولة لديك.",
      upcomingSessionsTitle: "الجلسات القادمة",
      upcomingSessionsSubtitle: "مرتبة حسب التاريخ (الأقرب أولًا).",
      upcomingSessionsEmpty: "لا توجد جلسات قادمة حاليًا.",
      quickActionsTitle: "اختصارات سريعة",
      quickActionsSubtitle: "وصول سريع لأهم المسارات.",
    },
    delta: {
      upFromYesterday: "ارتفاع {value}% مقارنة بالأمس",
      downFromYesterday: "انخفاض {value}% مقارنة بالأمس",
      unchanged: "بدون تغيير مقارنة بالأمس",
    },
    actions: {
      sessions: "الجلسات",
      wallet: "المحفظة",
      settlements: "التسويات",
    },
    pendingBalanceLabel: "الرصيد المعلق من الدفتر",
    timezoneLabel: "الأوقات معروضة بوقتك المحلي",
  },
};

const INDIGO = "#2F2FE4";
const ORANGE = "#FF9013";
const SKY = "#72B7FF";

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatNumber(locale: string, value: number) {
  return new Intl.NumberFormat(normalizeLocale(locale)).format(value);
}

function formatDateTime(locale: string, iso: string | null, timeZone?: string | null) {
  if (!iso) return "-";
  return formatPractitionerOrViewerDateTime(iso, timeZone ?? null, {
    locale: locale === "ar" ? "ar-SA" : "en-US",
    fallbackText: "-",
  });
}

function formatTimeLeft(iso: string, locale: string, nowMs: number) {
  const diffMs = new Date(iso).getTime() - nowMs;
  if (diffMs <= 0) {
    return locale === "ar" ? "انتهت صلاحية الطلب" : "Request expired";
  }

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const numberFormat = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (locale === "ar") {
      return `أقرب انتهاء خلال ${numberFormat.format(hours)} س ${numberFormat.format(remainingMinutes)} د`;
    }
    return `Nearest expiry in ${numberFormat.format(hours)}h ${numberFormat.format(remainingMinutes)}m`;
  }

  if (locale === "ar") {
    return `أقرب انتهاء خلال ${numberFormat.format(minutes)} د ${numberFormat.format(seconds)} ث`;
  }

  return `Nearest expiry in ${numberFormat.format(minutes)}m ${numberFormat.format(seconds)}s`;
}

function formatShortDate(locale: string, iso: string | null, timeZone?: string | null) {
  if (!iso) return "-";
  return formatPractitionerOrViewerDate(iso, timeZone ?? null, {
    locale: locale === "ar" ? "ar-SA" : "en-US",
    fallbackText: "-",
  });
}

function buildLast14DaysSeries(locale: string, sessions: SessionListItem[], timeZone?: string | null) {
  const now = new Date();
  const dayStarts: Date[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(0, 0, 0, 0);
    dayStarts.push(day);
  }

  const labels = dayStarts.map((day) =>
    formatPractitionerOrViewerDate(day.toISOString(), timeZone ?? null, {
      locale: locale === "ar" ? "ar-SA" : "en-US",
      fallbackText: "-",
    }),
  );

  const values = dayStarts.map((day) => {
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return sessions.filter((session) => {
      if (!session.scheduledStartAt) return false;
      const scheduled = new Date(session.scheduledStartAt);
      return scheduled >= day && scheduled <= dayEnd;
    }).length;
  });

  const movingAverage = values.map((_, index) => {
    const from = Math.max(0, index - 2);
    const segment = values.slice(from, index + 1);
    const avg = segment.reduce((sum, value) => sum + value, 0) / segment.length;
    return Number(avg.toFixed(2));
  });

  return { labels, values, movingAverage };
}

function calculateTodayDelta(currentValues: number[]) {
  if (currentValues.length < 2) {
    return { deltaValue: 0, tone: "neutral" as const };
  }

  const today = currentValues[currentValues.length - 1];
  const yesterday = currentValues[currentValues.length - 2];
  if (yesterday === 0) {
    if (today === 0) {
      return { deltaValue: 0, tone: "neutral" as const };
    }
    return { deltaValue: 100, tone: "up" as const };
  }

  const raw = ((today - yesterday) / yesterday) * 100;
  if (Math.abs(raw) < 0.1) {
    return { deltaValue: 0, tone: "neutral" as const };
  }
  return { deltaValue: Math.abs(Number(raw.toFixed(1))), tone: raw > 0 ? ("up" as const) : ("down" as const) };
}

function safeText(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

const TERMINAL_SESSION_STATUSES = new Set<SessionListItem["status"]>([
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
]);

function formatSessionStatus(status: string, locale: string): string {
  const isAr = locale === "ar";
  const STATUS_MAP: Record<string, { en: string; ar: string }> = {
    READY_TO_JOIN: { en: "Ready to join", ar: "جاهزة للانضمام" },
    SCHEDULED: { en: "Scheduled", ar: "مجدولة" },
    COMPLETED: { en: "Completed", ar: "مكتملة" },
    CANCELLED: { en: "Cancelled", ar: "ملغاة" },
    IN_PROGRESS: { en: "In progress", ar: "قيد التنفيذ" },
    NO_SHOW: { en: "No show", ar: "عدم حضور" },
    EXPIRED: { en: "Expired", ar: "منتهية" },
  };
  const entry = STATUS_MAP[status?.toUpperCase()];
  if (!entry) return status;
  return isAr ? entry.ar : entry.en;
}

export default function PractitionerDashboard() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const copy = COPY[locale === "ar" ? "ar" : "en"];
  const t = useTranslations("sessions.practitioner.instantBooking");
  const nowMs = useNowTick(1000);
  const pendingInstantBookingQuery = usePractitionerPendingBookingRequests();

  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const profileQuery = usePractitionerProfile();
  const sessionsQuery = usePractitionerSessions({ page: 1, limit: 50 });
  const readySessionsQuery = usePractitionerSessions({
    page: 1,
    limit: 1,
    status: "READY_TO_JOIN",
  });
  const inProgressSessionsQuery = usePractitionerSessions({
    page: 1,
    limit: 1,
    status: "IN_PROGRESS",
  });
  const walletQuery = usePractitionerWallet();
  const settlementsQuery = usePractitionerSettlements({ page: 1, limit: 8 });
  const pendingInstantRequests = pendingInstantBookingQuery.data ?? [];
  const nearestPendingRequest = [...pendingInstantRequests].sort(
    (left, right) => new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime(),
  )[0];

  const isLoadingCore =
    profileQuery.isLoading ||
    sessionsQuery.isLoading ||
    readySessionsQuery.isLoading ||
    inProgressSessionsQuery.isLoading ||
    walletQuery.isLoading ||
    settlementsQuery.isLoading;

  const profile = profileQuery.data?.profile;
  const profileTimeZone = profile?.timezone ?? null;
  const profileTimeZoneLabel = profileTimeZone ? formatTimeZoneLabel(profileTimeZone, { locale }) : null;
  const greetingName = safeText(profile?.displayName ?? null, copy.common.unknown);

  const sessions = sessionsQuery.data?.items ?? [];
  const trend = buildLast14DaysSeries(locale, sessions, profileTimeZone);
  const sessionsDelta = calculateTodayDelta(trend.values);
  const sessionsToday = trend.values.at(-1) ?? 0;
  const sessionsLast14DaysTotal = trend.values.reduce((sum, value) => sum + value, 0);

  const readyNowCount =
    (readySessionsQuery.data?.pagination.totalItems ?? 0) +
    (inProgressSessionsQuery.data?.pagination.totalItems ?? 0);

  const wallet = walletQuery.data;
  const availableBalance = wallet?.availableBalance ?? "0";
  const pendingBalance = wallet?.pendingBalance ?? "0";

  const settlements = [...(settlementsQuery.data?.items ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const settlementCategories = settlements.map((item) =>
    formatShortDate(locale, item.createdAt, profileTimeZone),
  );
  const settlementValues = settlements.map((item) => Number(item.amountNet) || 0);
  const settlementCurrency = settlements[0]?.currency ?? wallet?.currency ?? null;
  const latestSettlementAmount = settlementValues.at(-1) ?? 0;

  const upcomingSessions = [...sessions]
    .filter((session) => {
      if (!session.scheduledStartAt) return false;
      return !TERMINAL_SESSION_STATUSES.has(session.status);
    })
    .sort((a, b) => {
      const aValue = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
      const bValue = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
      return aValue - bValue;
    })
    .slice(0, 6);

  const sessionDeltaText =
    sessionsDelta.tone === "neutral"
      ? copy.delta.unchanged
      : sessionsDelta.tone === "up"
        ? copy.delta.upFromYesterday.replace("{value}", formatNumber(locale, sessionsDelta.deltaValue))
        : copy.delta.downFromYesterday.replace("{value}", formatNumber(locale, sessionsDelta.deltaValue));

  if (isLoadingCore) {
    return <ListStateSkeleton items={8} heightClass="h-28" />;
  }

  if (profileQuery.isError) {
    return (
      <StateCard
        icon={<Activity className="h-5 w-5 text-primary" />}
        title={copy.common.noData}
        note={copy.pageNote}
        action={{ label: copy.common.viewAll, onClick: () => profileQuery.refetch() }}
        className="rounded-[28px]"
      />
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-5 sm:px-6 lg:px-8 space-y-4">
      {/* ── Section 1: Command Header Card ── */}
      <section className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-white/5 dark:bg-white/[0.03] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-brand dark:text-primary-light mb-1">
              {locale === "ar" ? "لوحة المعالج" : "Practitioner Dashboard"}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-text-primary dark:text-white/95 sm:text-2xl">
              {profile ? `${greetingName}` : copy.pageTitle}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">{copy.pageSubtitle}</p>
            {profileTimeZoneLabel ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary dark:bg-white/5 dark:text-white/80">
                <span className="font-semibold text-text-primary dark:text-white/95">
                  {copy.timezoneLabel}
                </span>
                <span>{profileTimeZoneLabel}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:self-center">
            {hasHydrated && (
              <span className="app-chip rounded-full bg-primary-light px-3.5 py-1.5 text-xs font-semibold text-text-brand dark:bg-primary/15 dark:text-primary-light">
                {copy.common.updatedLabel}: {formatDateTime(locale, new Date().toISOString(), profileTimeZone)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Compact KPI Grid ── */}
      {pendingInstantRequests.length > 0 ? (
        <SurfaceCard
          variant="compact"
          className="border-amber-200/70 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70 dark:bg-white/10 dark:text-amber-100 dark:ring-amber-500/20">
                <Zap className="h-3.5 w-3.5" />
                {t("queue.eyebrow")}
              </div>
              <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                {t("queue.dashboardTitle", {
                  count: pendingInstantRequests.length,
                })}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-text-secondary">
                {nearestPendingRequest
                  ? formatTimeLeft(nearestPendingRequest.expiresAt, locale, nowMs)
                  : t("queue.summary.noPending")}
              </p>
            </div>

            <SurfaceActionLink
              href="/practitioner/instant-booking"
              variant="primary"
              className="sm:self-center"
            >
              {t("queue.dashboardLink")}
            </SurfaceActionLink>
          </div>
        </SurfaceCard>
      ) : null}

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <PractitionerDashboardKpiCard
          label={copy.kpi.sessionsToday}
          value={formatNumber(locale, sessionsToday)}
          helper={copy.kpi.sessionsTodayHelper}
          deltaText={sessionDeltaText}
          deltaTone={sessionsDelta.tone}
          accentTone="indigo"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <PractitionerDashboardKpiCard
          label={copy.kpi.joinableNow}
          value={formatNumber(locale, readyNowCount)}
          helper={copy.kpi.joinableNowHelper}
          accentTone="sky"
          icon={<Activity className="h-4 w-4" />}
        />
        <PractitionerDashboardKpiCard
          label={copy.kpi.walletAvailable}
          value={formatFinanceMoney(normalizeLocale(locale), availableBalance, wallet?.currency ?? null)}
          helper={copy.kpi.walletHelper}
          accentTone="teal"
          icon={<WalletCards className="h-4 w-4" />}
        />
        <PractitionerDashboardKpiCard
          label={copy.kpi.lastSettlement}
          value={formatFinanceMoney(normalizeLocale(locale), latestSettlementAmount, settlementCurrency)}
          helper={copy.kpi.lastSettlementHelper}
          accentTone="orange"
          icon={<Clock3 className="h-4 w-4" />}
        />
      </section>

      {/* ── Section 3: Analytics Row 1 (Sessions Trend + Upcoming Sessions) ── */}
      <section className="grid gap-4 grid-cols-1 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8">
          <PractitionerDashboardChartCard
            title={copy.charts.sessionsTitle}
            subtitle={`${copy.charts.sessionsSubtitle} · ${formatNumber(locale, sessionsLast14DaysTotal)} ${copy.charts.sessionsSeries}`}
            actionLabel={copy.common.viewAll}
            actionHref="/practitioner/sessions"
          >
            <AreaTrendChart
              locale={locale}
              categories={trend.labels}
              seriesName={copy.charts.sessionsSeries}
              values={trend.values}
              comparisonSeriesName={copy.charts.sessionsAverageSeries}
              comparisonValues={trend.movingAverage}
              color={INDIGO}
              comparisonColor={ORANGE}
              height={260}
            />
          </PractitionerDashboardChartCard>
        </div>

        <div className="lg:col-span-4">
          <PractitionerDashboardQueueCard
            title={copy.activity.upcomingSessionsTitle}
            subtitle={copy.activity.upcomingSessionsSubtitle}
            actionLabel={copy.common.viewAll}
            actionHref="/practitioner/sessions"
            emptyText={copy.activity.upcomingSessionsEmpty}
            items={upcomingSessions.map((session) => ({
              id: session.id,
              title: safeText(session.patient?.displayName, copy.common.unknown),
              subtitle: `${formatDateTime(locale, session.scheduledStartAt, profileTimeZone)} · ${session.durationMinutes}m`,
              href: `/practitioner/sessions/${session.id}`,
              badge: (() => {
                const statusLabel = formatSessionStatus(session.status, locale);
                const isReady = session.status === "READY_TO_JOIN" || session.status === "IN_PROGRESS";
                return (
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide",
                    isReady 
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400"
                      : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70"
                  )}>
                    {statusLabel}
                  </span>
                );
              })(),
            }))}
          />
        </div>
      </section>

      {/* ── Section 4: Analytics Row 2 (Settlements Trend + Quick Shortcuts) ── */}
      <section className="grid gap-4 grid-cols-1 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8">
          <PractitionerDashboardChartCard
            title={copy.charts.settlementsTitle}
            subtitle={copy.charts.settlementsSubtitle}
            actionLabel={copy.common.viewAll}
            actionHref="/practitioner/settlements"
          >
            <BarTrendChart
              locale={locale}
              categories={
                settlementCategories.length > 0 ? settlementCategories : [copy.common.noData]
              }
              seriesName={copy.charts.settlementsSeries}
              values={settlementValues.length > 0 ? settlementValues : [0]}
              currencyCode={settlementCurrency}
              colors={[INDIGO, ORANGE, SKY, INDIGO, ORANGE, SKY, INDIGO, ORANGE]}
              distributed
              height={260}
            />
          </PractitionerDashboardChartCard>
        </div>

        <div className="lg:col-span-4">
          <article className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-white/5 dark:bg-white/[0.03] shadow-sm sm:p-6 min-h-[350px]">
            <div className="flex-1 flex flex-col">
              <PractitionerDashboardSectionHeader
                title={copy.activity.quickActionsTitle}
                subtitle={copy.activity.quickActionsSubtitle}
              />
              <div className="grid gap-2 grid-cols-1 mt-2">
                {[
                  { href: "/practitioner/sessions", label: copy.actions.sessions, icon: <CalendarClock className="h-4 w-4" />, helper: locale === "ar" ? "عرض وإدارة الجلسات" : "View and manage sessions" },
                  { href: "/practitioner/wallet", label: copy.actions.wallet, icon: <WalletCards className="h-4 w-4" />, helper: locale === "ar" ? "تفاصيل الأرباح والمحفظة" : "Wallet details and balances" },
                  { href: "/practitioner/settlements", label: copy.actions.settlements, icon: <Clock3 className="h-4 w-4" />, helper: locale === "ar" ? "سجل دفعات التسوية" : "Settlement batch history" },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href as never}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/30 px-4 py-3 transition duration-150 hover:border-primary/20 hover:bg-primary-light/10 dark:border-white/5 dark:bg-white/[0.01]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                        {action.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                          {action.label}
                        </p>
                        <p className="text-[10px] text-text-secondary dark:text-slate-400">
                          {action.helper}
                        </p>
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-text-muted rtl:rotate-180" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
              <span className="text-text-secondary dark:text-slate-400 font-medium">{copy.pendingBalanceLabel}:</span>
              <span className="font-bold text-text-primary dark:text-white">
                {formatFinanceMoney(normalizeLocale(locale), pendingBalance, wallet?.currency ?? null)}
              </span>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
