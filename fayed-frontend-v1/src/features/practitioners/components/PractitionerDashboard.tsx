"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import {
  Activity,
  CalendarClock,
  Clock3,
  WalletCards,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import {
  AreaTrendChart,
  BarTrendChart,
} from "@/components/charts";
import {
  DashboardChartCard,
  DashboardKpiCard,
  DashboardQueueCard,
  DashboardSectionHeader,
} from "@/components/dashboard";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import { usePractitionerProfile } from "../hooks/use-practitioners";
import { usePractitionerSessions } from "@/features/sessions/hooks/use-sessions";
import { usePractitionerSettlements, usePractitionerWallet } from "@/features/financial-operations/hooks/use-financial-operations";
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

function formatDateTime(locale: string, iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: locale !== "ar",
  });
}

function formatShortDate(locale: string, iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

function buildLast14DaysSeries(locale: string, sessions: SessionListItem[]) {
  const now = new Date();
  const dayStarts: Date[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(0, 0, 0, 0);
    dayStarts.push(day);
  }

  const labels = dayStarts.map((day) =>
    day.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      month: "short",
      day: "numeric",
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

export default function PractitionerDashboard() {
  const locale = useLocale();
  const copy = COPY[locale === "ar" ? "ar" : "en"];

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

  const isLoadingCore =
    profileQuery.isLoading ||
    sessionsQuery.isLoading ||
    readySessionsQuery.isLoading ||
    inProgressSessionsQuery.isLoading ||
    walletQuery.isLoading ||
    settlementsQuery.isLoading;

  const profile = profileQuery.data?.profile;
  const greetingName = safeText(profile?.displayName ?? null, copy.common.unknown);

  const sessions = sessionsQuery.data?.items ?? [];
  const trend = buildLast14DaysSeries(locale, sessions);
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
    formatShortDate(locale, item.createdAt),
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
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {copy.pageTitle}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {profile ? `${greetingName}` : copy.pageTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
              {copy.pageSubtitle}
            </p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {copy.common.updatedLabel}: {formatDateTime(locale, new Date().toISOString())}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          label={copy.kpi.sessionsToday}
          value={formatNumber(locale, sessionsToday)}
          helper={copy.kpi.sessionsTodayHelper}
          deltaText={sessionDeltaText}
          deltaTone={sessionsDelta.tone}
          accentTone="indigo"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <DashboardKpiCard
          label={copy.kpi.joinableNow}
          value={formatNumber(locale, readyNowCount)}
          helper={copy.kpi.joinableNowHelper}
          accentTone="sky"
          icon={<Activity className="h-4 w-4" />}
        />
        <DashboardKpiCard
          label={copy.kpi.walletAvailable}
          value={formatFinanceMoney(normalizeLocale(locale), availableBalance, wallet?.currency ?? null)}
          helper={copy.kpi.walletHelper}
          accentTone="teal"
          icon={<WalletCards className="h-4 w-4" />}
        />
        <DashboardKpiCard
          label={copy.kpi.lastSettlement}
          value={formatFinanceMoney(normalizeLocale(locale), latestSettlementAmount, settlementCurrency)}
          helper={copy.kpi.lastSettlementHelper}
          accentTone="orange"
          icon={<Clock3 className="h-4 w-4" />}
        />
      </section>

      <section className="space-y-4">
        <DashboardSectionHeader title={copy.charts.heading} subtitle={copy.charts.subtitle} />
        <DashboardChartCard
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
            height={290}
          />
        </DashboardChartCard>

        <DashboardChartCard
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
            height={300}
          />
        </DashboardChartCard>
      </section>

      <section className="space-y-4">
        <DashboardSectionHeader title={copy.activity.heading} subtitle={copy.activity.subtitle} />
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <DashboardQueueCard
              title={copy.activity.upcomingSessionsTitle}
              subtitle={copy.activity.upcomingSessionsSubtitle}
              actionLabel={copy.common.viewAll}
              actionHref="/practitioner/sessions"
              emptyText={copy.activity.upcomingSessionsEmpty}
              items={upcomingSessions.map((session) => ({
                id: session.id,
                title: safeText(session.patient?.displayName, copy.common.unknown),
                subtitle: `${formatDateTime(locale, session.scheduledStartAt)} · ${session.status}`,
                href: `/practitioner/sessions/${session.id}`,
                badge: (
                  <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-semibold text-text-secondary dark:bg-white/10 dark:text-white/80">
                    {session.durationMinutes}m
                  </span>
                ),
              }))}
            />
          </div>

          <article className="app-panel rounded-3xl p-5">
            <DashboardSectionHeader
              title={copy.activity.quickActionsTitle}
              subtitle={copy.activity.quickActionsSubtitle}
            />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {[
                { href: "/practitioner/sessions", label: copy.actions.sessions, icon: <CalendarClock className="h-4 w-4" /> },
                { href: "/practitioner/wallet", label: copy.actions.wallet, icon: <WalletCards className="h-4 w-4" /> },
                { href: "/practitioner/settlements", label: copy.actions.settlements, icon: <Clock3 className="h-4 w-4" /> },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href as never}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-light bg-surface px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:border-primary/30 hover:bg-primary-light hover:text-text-brand dark:border-white/10 dark:bg-white/[0.03] dark:text-white/85 dark:hover:bg-primary/10 dark:hover:text-primary-light"
                >
                  {action.icon}
                  {action.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-border-light bg-surface-tertiary/50 p-3 text-xs text-text-muted dark:border-white/10 dark:bg-white/[0.04]">
              {copy.pendingBalanceLabel}: {formatFinanceMoney(normalizeLocale(locale), pendingBalance, wallet?.currency ?? null)}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
