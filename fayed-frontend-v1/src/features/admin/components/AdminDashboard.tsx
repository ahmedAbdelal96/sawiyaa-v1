"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { useQueries } from "@tanstack/react-query";
import {
  Activity,
  BadgeDollarSign,
  CalendarClock,
  ClipboardCheck,
  Headset,
  MessageSquareMore,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { useAdminSessions } from "@/features/admin/sessions/hooks/use-admin-sessions";
import { listAdminSessions } from "@/features/admin/sessions/api/admin-sessions.api";
import { adminSessionsQueryKeys } from "@/features/admin/sessions/constants/query-keys";
import { useAdminSupportTickets } from "@/features/support/hooks/use-support";
import { useAdminCareChatRequests } from "@/features/care-chat/hooks/use-care-chat";
import { useAdminPractitionerApplications } from "@/features/admin/practitioner-applications/hooks/use-practitioner-applications";
import { useAdminSettlementBatches } from "@/features/admin/settlements/hooks/use-admin-settlements";
import { useAdminModerationReports } from "@/features/admin/moderation-reports/hooks/use-admin-moderation-reports";
import { useAdminNotifications } from "@/features/admin/notifications/hooks/use-admin-notifications";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import {
  AreaTrendChart,
  BarTrendChart,
  DonutDistributionChart,
} from "@/components/charts";
import { AdminDashboardChartCard } from "./dashboard/AdminDashboardChartCard";
import { AdminDashboardKpiCard } from "./dashboard/AdminDashboardKpiCard";
import { AdminDashboardQueueCard } from "./dashboard/AdminDashboardQueueCard";
import { AdminDashboardSectionHeader } from "./dashboard/AdminDashboardSectionHeader";

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
    totalLabel: string;
  };
  kpi: {
    sessions: string;
    support: string;
    care: string;
    revenue: string;
    sessionsHelper: string;
    supportHelper: string;
    careHelper: string;
    revenueHelper: string;
  };
  charts: {
    heading: string;
    subtitle: string;
    sessionsTitle: string;
    sessionsSubtitle: string;
    settlementsTitle: string;
    settlementsSubtitle: string;
    workloadTitle: string;
    workloadSubtitle: string;
    sessionsSeries: string;
    sessionsAverageSeries: string;
    settlementsSeries: string;
  };
  attention: {
    heading: string;
    subtitle: string;
    supportTitle: string;
    supportSubtitle: string;
    supportEmpty: string;
    careTitle: string;
    careSubtitle: string;
    careEmpty: string;
    applicationsTitle: string;
    applicationsSubtitle: string;
    applicationsEmpty: string;
    moderationTitle: string;
  };
  activity: {
    heading: string;
    subtitle: string;
    recentTitle: string;
    recentSubtitle: string;
    recentEmpty: string;
    snapshotTitle: string;
    snapshotSubtitle: string;
    snapshotEmpty: string;
  };
  delta: {
    upFromPrevious: string;
    downFromPrevious: string;
    unchanged: string;
    comparedToYesterday: string;
    comparedToPreviousBatch: string;
  };
};

function useHasHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const COPY: Record<"en" | "ar", LocaleCopy> = {
  en: {
    pageTitle: "Admin Ops Dashboard",
    pageSubtitle: "Business and operations snapshot for fast executive visibility.",
    pageNote:
      "Built from live queues and existing admin contracts to keep this screen accurate and actionable.",
    common: {
      loading: "Loading...",
      noData: "No data available",
      unknown: "Unknown",
      viewAll: "View all",
      updatedLabel: "Updated",
      totalLabel: "total",
    },
    kpi: {
      sessions: "Sessions today",
      support: "Open support workload",
      care: "Pending care requests",
      revenue: "Settlement snapshot",
      sessionsHelper: "Booked session volume in the current day.",
      supportHelper: "Open tickets waiting for admin follow-up.",
      careHelper: "Care-chat requests waiting for a decision.",
      revenueHelper: "Latest settlement batch amount.",
    },
    charts: {
      heading: "Performance trends",
      subtitle: "Two business trends and one workload distribution view.",
      sessionsTitle: "Session trend",
      sessionsSubtitle: "Daily sessions over the last 14 days.",
      settlementsTitle: "Settlement trend",
      settlementsSubtitle: "Latest settlement batches by period.",
      workloadTitle: "Current workload mix",
      workloadSubtitle: "How active queues are distributed right now.",
      sessionsSeries: "Sessions",
      sessionsAverageSeries: "3-day average",
      settlementsSeries: "Settlements",
    },
    attention: {
      heading: "Needs attention",
      subtitle: "Queues that usually require immediate operational action.",
      supportTitle: "Support queue",
      supportSubtitle: "Recent open tickets",
      supportEmpty: "No open support tickets right now.",
      careTitle: "Care queue",
      careSubtitle: "Pending care requests",
      careEmpty: "No pending care requests right now.",
      applicationsTitle: "Application queue",
      applicationsSubtitle: "Submitted practitioner applications",
      applicationsEmpty: "No pending applications right now.",
      moderationTitle: "Moderation queue",
    },
    activity: {
      heading: "Recent operations activity",
      subtitle: "Live operational movement from existing admin feeds.",
      recentTitle: "Recent notifications",
      recentSubtitle: "Latest high-signal operational updates.",
      recentEmpty: "No recent activity to show right now.",
      snapshotTitle: "Queue snapshot",
      snapshotSubtitle: "Fast view of current queue totals.",
      snapshotEmpty: "No queue movement available yet.",
    },
    delta: {
      upFromPrevious: "{value}% up",
      downFromPrevious: "{value}% down",
      unchanged: "No change",
      comparedToYesterday: "Compared to yesterday",
      comparedToPreviousBatch: "Compared to previous batch",
    },
  },
  ar: {
    pageTitle: "لوحة عمليات الإدارة",
    pageSubtitle: "لقطة تنفيذية سريعة للأعمال والتشغيل من شاشة واحدة.",
    pageNote:
      "هذه اللوحة مبنية على بيانات حية من مسارات الإدارة الحالية لضمان وضوح القرار وسرعة المتابعة.",
    common: {
      loading: "جاري التحميل...",
      noData: "لا توجد بيانات متاحة",
      unknown: "غير معروف",
      viewAll: "عرض الكل",
      updatedLabel: "آخر تحديث",
      totalLabel: "إجمالي",
    },
    kpi: {
      sessions: "جلسات اليوم",
      support: "عبء الدعم المفتوح",
      care: "طلبات الرعاية المعلقة",
      revenue: "ملخص التسويات",
      sessionsHelper: "إجمالي الجلسات المحجوزة خلال اليوم الحالي.",
      supportHelper: "تذاكر مفتوحة تحتاج متابعة من الإدارة.",
      careHelper: "طلبات محادثة رعاية بانتظار القرار.",
      revenueHelper: "إجمالي أحدث دفعة تسوية.",
    },
    charts: {
      heading: "اتجاهات الأداء",
      subtitle: "اتجاهان للأعمال مع توزيع واضح لعبء العمل الحالي.",
      sessionsTitle: "اتجاه الجلسات",
      sessionsSubtitle: "الجلسات اليومية خلال آخر 14 يوماً.",
      settlementsTitle: "اتجاه التسويات",
      settlementsSubtitle: "آخر دفعات التسوية حسب الفترة.",
      workloadTitle: "توزيع عبء العمل الحالي",
      workloadSubtitle: "صورة مباشرة لتوزيع القوائم النشطة الآن.",
      sessionsSeries: "الجلسات",
      sessionsAverageSeries: "متوسط 3 أيام",
      settlementsSeries: "التسويات",
    },
    attention: {
      heading: "يتطلب المتابعة",
      subtitle: "أهم القوائم التي تحتاج تدخل تشغيلي سريع.",
      supportTitle: "قائمة الدعم",
      supportSubtitle: "أحدث التذاكر المفتوحة",
      supportEmpty: "لا توجد تذاكر دعم مفتوحة حالياً.",
      careTitle: "قائمة الرعاية",
      careSubtitle: "طلبات الرعاية المعلقة",
      careEmpty: "لا توجد طلبات رعاية معلقة حالياً.",
      applicationsTitle: "قائمة الطلبات",
      applicationsSubtitle: "طلبات الممارسين المقدمة",
      applicationsEmpty: "لا توجد طلبات معلقة حالياً.",
      moderationTitle: "قائمة الإشراف",
    },
    activity: {
      heading: "النشاط التشغيلي الأخير",
      subtitle: "حركة تشغيلية مباشرة من قنوات الإدارة الحالية.",
      recentTitle: "أحدث التنبيهات",
      recentSubtitle: "آخر التحديثات التشغيلية المهمة.",
      recentEmpty: "لا توجد عناصر حديثة للعرض حالياً.",
      snapshotTitle: "ملخص القوائم",
      snapshotSubtitle: "نظرة سريعة على أحجام القوائم الحالية.",
      snapshotEmpty: "لا توجد حركة كافية لعرض الملخص حالياً.",
    },
    delta: {
      upFromPrevious: "ارتفاع {value}%",
      downFromPrevious: "انخفاض {value}%",
      unchanged: "بدون تغيير",
      comparedToYesterday: "مقارنة بالأمس",
      comparedToPreviousBatch: "مقارنة بالدفعة السابقة",
    },
  },
};

function toIsoRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatNumber(locale: string, value: number) {
  return new Intl.NumberFormat(normalizeLocale(locale)).format(value);
}

function formatPercent(locale: string, value: number) {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function parseMoney(value: string | null | undefined) {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(locale: string, amount: number, currency: string) {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateLabel(locale: string, iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(normalizeLocale(locale), {
    month: "short",
    day: "numeric",
  });
}

function formatDateTimeLabel(locale: string, iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(normalizeLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function humanizeEventSlug(slug: string, locale: string) {
  if (!slug) return locale === "ar" ? "حدث تشغيلي" : "Operational event";
  const normalized = slug.replace(/[._-]/g, " ").trim();
  if (locale === "ar") {
    return normalized;
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function monthKeyValue(year: number, month: number) {
  return year * 100 + month;
}

export default function AdminDashboard() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const copy = COPY[isArabic ? "ar" : "en"];
  const hasHydrated = useHasHydrated();
  const chartPalette = ["#2F2FE4", "#FF9013", "#8FA2FF"];

  const now = new Date();
  const today = toIsoRange(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayRange = toIsoRange(yesterday);

  const sessionsTodayQuery = useAdminSessions({
    page: 1,
    limit: 1,
    scheduledFrom: today.start,
    scheduledTo: today.end,
  });
  const sessionsYesterdayQuery = useAdminSessions({
    page: 1,
    limit: 1,
    scheduledFrom: yesterdayRange.start,
    scheduledTo: yesterdayRange.end,
  });

  const supportQuery = useAdminSupportTickets({
    page: 1,
    limit: 5,
    status: "OPEN",
  });
  const careQuery = useAdminCareChatRequests({
    page: 1,
    limit: 5,
    status: "PENDING",
  });
  const applicationsQuery = useAdminPractitionerApplications(
    {
      page: 1,
      limit: 5,
      status: "SUBMITTED",
    },
    true,
  );
  const moderationQuery = useAdminModerationReports({
    page: 1,
    limit: 5,
    status: "OPEN",
  });
  const settlementsQuery = useAdminSettlementBatches({
    page: 1,
    limit: 12,
  });
  const notificationsQuery = useAdminNotifications({
    page: 1,
    limit: 6,
  });

  const trendDates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (13 - index));
    return date;
  });

  const sessionsTrendQueries = useQueries({
    queries: trendDates.map((date) => {
      const range = toIsoRange(date);
      const params = {
        page: 1,
        limit: 1,
        scheduledFrom: range.start,
        scheduledTo: range.end,
      } as const;

      return {
        queryKey: [...adminSessionsQueryKeys.list(params), "trend"] as const,
        queryFn: () => listAdminSessions(params),
        staleTime: 30_000,
      };
    }),
  });

  const sessionsToday = sessionsTodayQuery.data?.pagination.totalItems ?? 0;
  const sessionsYesterday = sessionsYesterdayQuery.data?.pagination.totalItems ?? 0;

  const supportTotal = supportQuery.data?.pagination.totalItems ?? 0;
  const careTotal = careQuery.data?.pagination.totalItems ?? 0;
  const applicationsTotal = applicationsQuery.data?.pagination.total ?? 0;
  const moderationTotal = moderationQuery.data?.pagination.totalItems ?? 0;

  const settlementsSorted = [...(settlementsQuery.data?.items ?? [])].sort(
    (a, b) =>
      monthKeyValue(a.periodYear, a.periodMonth) - monthKeyValue(b.periodYear, b.periodMonth),
  );
  const settlementLatest = settlementsSorted[settlementsSorted.length - 1];
  const settlementPrevious = settlementsSorted[settlementsSorted.length - 2];

  const settlementLatestValue = parseMoney(settlementLatest?.totalAmount);
  const settlementPreviousValue = parseMoney(settlementPrevious?.totalAmount);
  const settlementCurrency = settlementLatest?.currency ?? "USD";

  const sessionsDeltaBase = sessionsYesterday <= 0 ? 1 : sessionsYesterday;
  const sessionsDeltaPercent = ((sessionsToday - sessionsYesterday) / sessionsDeltaBase) * 100;
  const sessionsDeltaTone =
    sessionsToday > sessionsYesterday
      ? ("up" as const)
      : sessionsToday < sessionsYesterday
        ? ("down" as const)
        : ("neutral" as const);

  const settlementDeltaBase = settlementPreviousValue <= 0 ? 1 : settlementPreviousValue;
  const settlementDeltaPercent =
    ((settlementLatestValue - settlementPreviousValue) / settlementDeltaBase) * 100;
  const settlementDeltaTone =
    settlementLatestValue > settlementPreviousValue
      ? ("up" as const)
      : settlementLatestValue < settlementPreviousValue
        ? ("down" as const)
        : ("neutral" as const);

  const sessionsTrendLabels = trendDates.map((date) =>
    date.toLocaleDateString(normalizeLocale(locale), {
      month: "numeric",
      day: "numeric",
    }),
  );
  const sessionsTrendSeries = sessionsTrendQueries.map(
    (query) => query.data?.pagination.totalItems ?? 0,
  );
  const sessionsMovingAverageSeries = sessionsTrendSeries.map((_, index, all) => {
    const startIndex = Math.max(0, index - 2);
    const window = all.slice(startIndex, index + 1);
    const average = window.reduce((sum, value) => sum + value, 0) / window.length;
    return Number(average.toFixed(2));
  });
  const sessionsTrendLoading = sessionsTrendQueries.some((query) => query.isLoading);

  const settlementChartLabels = settlementsSorted.map((item) => {
    const date = new Date(item.periodYear, item.periodMonth - 1, 1);
    return date.toLocaleDateString(normalizeLocale(locale), { month: "short" });
  });
  const settlementChartSeries = settlementsSorted.map((item) =>
    parseMoney(item.totalAmount),
  );

  const workloadSeries = [supportTotal, careTotal, applicationsTotal, moderationTotal];
  const hasWorkloadData = workloadSeries.some((value) => value > 0);

  const supportItems = (supportQuery.data?.items ?? []).map((ticket) => ({
    id: ticket.id,
    title: ticket.subject,
    subtitle: `${ticket.category} - ${formatDateLabel(locale, ticket.createdAt)}`,
    href: `/admin/support/${ticket.id}`,
    badge: (
      <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-text-brand dark:bg-primary/15 dark:text-primary-light">
        {ticket.priority}
      </span>
    ),
  }));

  const careItems = (careQuery.data?.items ?? []).map((request) => ({
    id: request.id,
    title: request.patient.displayName ?? copy.common.unknown,
    subtitle: `${request.practitioner.displayName ?? copy.common.unknown} - ${formatDateLabel(
      locale,
      request.requestedAt,
    )}`,
    href: `/admin/care-chat/${request.id}`,
    badge: (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
        {request.status}
      </span>
    ),
  }));

  const applicationItems = (applicationsQuery.data?.applications ?? []).map((app) => ({
    id: app.applicationId,
    title: app.displayName ?? copy.common.unknown,
    subtitle: `${app.practitionerType} - ${formatDateLabel(locale, app.submittedAt)}`,
    href: `/admin/practitioner-applications/${app.applicationId}`,
    badge: (
      <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-semibold text-text-muted dark:bg-white/10 dark:text-white/70">
        {app.applicationStatus}
      </span>
    ),
  }));

  const recentActivityItems = (notificationsQuery.data?.items ?? []).map((item) => ({
    id: item.id,
    title: humanizeEventSlug(item.typeSlug, locale),
    subtitle: `${item.category} - ${formatDateTimeLabel(locale, item.updatedAt)}`,
    href: `/admin/notifications/${item.id}`,
    badge: (
      <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-semibold text-text-muted dark:bg-white/10 dark:text-white/70">
        {item.status}
      </span>
    ),
  }));

  const queueSnapshotItems = [
    {
      id: "support-total",
      title: copy.attention.supportTitle,
      subtitle: `${formatNumber(locale, supportTotal)} ${copy.common.totalLabel}`,
    },
    {
      id: "care-total",
      title: copy.attention.careTitle,
      subtitle: `${formatNumber(locale, careTotal)} ${copy.common.totalLabel}`,
    },
    {
      id: "application-total",
      title: copy.attention.applicationsTitle,
      subtitle: `${formatNumber(locale, applicationsTotal)} ${copy.common.totalLabel}`,
    },
    {
      id: "moderation-total",
      title: copy.attention.moderationTitle,
      subtitle: `${formatNumber(locale, moderationTotal)} ${copy.common.totalLabel}`,
    },
  ];

  const sessionsDeltaText =
    sessionsDeltaTone === "neutral"
      ? copy.delta.unchanged
      : (sessionsDeltaTone === "up"
          ? copy.delta.upFromPrevious
          : copy.delta.downFromPrevious
        ).replace("{value}", formatPercent(locale, Math.abs(sessionsDeltaPercent)));

  const settlementDeltaText =
    settlementDeltaTone === "neutral"
      ? copy.delta.unchanged
      : (settlementDeltaTone === "up"
          ? copy.delta.upFromPrevious
          : copy.delta.downFromPrevious
        ).replace("{value}", formatPercent(locale, Math.abs(settlementDeltaPercent)));

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-3xl px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          {copy.common.updatedLabel}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95">
          {copy.pageTitle}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{copy.pageSubtitle}</p>
        <p className="mt-3 text-sm text-text-muted">{copy.pageNote}</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <AdminDashboardKpiCard
          label={copy.kpi.sessions}
          value={formatNumber(locale, sessionsToday)}
          icon={<CalendarClock className="h-5 w-5" />}
          helper={copy.kpi.sessionsHelper}
          deltaText={`${sessionsDeltaText} - ${copy.delta.comparedToYesterday}`}
          deltaTone={sessionsDeltaTone}
          accentTone="blue"
        />
        <AdminDashboardKpiCard
          label={copy.kpi.support}
          value={formatNumber(locale, supportTotal)}
          icon={<Headset className="h-5 w-5" />}
          helper={copy.kpi.supportHelper}
          accentTone="amber"
        />
        <AdminDashboardKpiCard
          label={copy.kpi.care}
          value={formatNumber(locale, careTotal)}
          icon={<MessageSquareMore className="h-5 w-5" />}
          helper={copy.kpi.careHelper}
          accentTone="violet"
        />
        <AdminDashboardKpiCard
          label={copy.kpi.revenue}
          value={formatMoney(locale, settlementLatestValue, settlementCurrency)}
          icon={<WalletCards className="h-5 w-5" />}
          helper={copy.kpi.revenueHelper}
          deltaText={`${settlementDeltaText} - ${copy.delta.comparedToPreviousBatch}`}
          deltaTone={settlementDeltaTone}
          accentTone="teal"
        />
      </section>

      <section>
        <AdminDashboardSectionHeader
          title={copy.charts.heading}
          subtitle={copy.charts.subtitle}
        />
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <AdminDashboardChartCard
              title={copy.charts.sessionsTitle}
              subtitle={copy.charts.sessionsSubtitle}
              actionLabel={copy.common.viewAll}
              actionHref="/admin/sessions"
            >
              {sessionsTrendLoading ? (
                <ListStateSkeleton items={1} heightClass="h-[280px]" />
              ) : (
                <AreaTrendChart
                  locale={locale}
                  categories={sessionsTrendLabels}
                  seriesName={copy.charts.sessionsSeries}
                  values={sessionsTrendSeries}
                  comparisonSeriesName={copy.charts.sessionsAverageSeries}
                  comparisonValues={sessionsMovingAverageSeries}
                  height={300}
                  color={chartPalette[0]}
                  comparisonColor={chartPalette[1]}
                />
              )}
            </AdminDashboardChartCard>
          </div>

          <div className="xl:col-span-5">
            <AdminDashboardChartCard
              title={copy.charts.workloadTitle}
              subtitle={copy.charts.workloadSubtitle}
            >
              {!hasWorkloadData ? (
                <StateCard
                  centered
                  title={copy.common.noData}
                  note={copy.activity.snapshotEmpty}
                  className="border-dashed"
                />
              ) : (
                <DonutDistributionChart
                  locale={locale}
                  labels={[
                    copy.attention.supportTitle,
                    copy.attention.careTitle,
                    copy.attention.applicationsTitle,
                    copy.attention.moderationTitle,
                  ]}
                  values={workloadSeries}
                  height={300}
                  colors={[chartPalette[0], chartPalette[1], chartPalette[2], "#C6CED9"]}
                />
              )}
            </AdminDashboardChartCard>
          </div>
        </div>

        <div className="mt-5">
          <AdminDashboardChartCard
            title={copy.charts.settlementsTitle}
            subtitle={copy.charts.settlementsSubtitle}
            actionLabel={copy.common.viewAll}
            actionHref="/admin/settlements"
          >
            {!hasHydrated || settlementsQuery.isLoading ? (
              <ListStateSkeleton items={1} heightClass="h-[240px]" />
            ) : settlementChartSeries.length === 0 ? (
              <StateCard
                centered
                title={copy.common.noData}
                note={copy.charts.settlementsSubtitle}
                className="border-dashed"
              />
            ) : (
              <BarTrendChart
                locale={locale}
                categories={settlementChartLabels}
                seriesName={copy.charts.settlementsSeries}
                values={settlementChartSeries}
                currencyCode={settlementCurrency}
                height={260}
                distributed
                colors={chartPalette}
              />
            )}
          </AdminDashboardChartCard>
        </div>
      </section>

      <section>
        <AdminDashboardSectionHeader
          title={copy.attention.heading}
          subtitle={copy.attention.subtitle}
        />
        <div className="grid gap-5 xl:grid-cols-3">
          <AdminDashboardQueueCard
            title={copy.attention.supportTitle}
            subtitle={copy.attention.supportSubtitle}
            actionLabel={copy.common.viewAll}
            actionHref="/admin/support"
            emptyText={copy.attention.supportEmpty}
            items={supportItems}
          />
          <AdminDashboardQueueCard
            title={copy.attention.careTitle}
            subtitle={copy.attention.careSubtitle}
            actionLabel={copy.common.viewAll}
            actionHref="/admin/care-chat"
            emptyText={copy.attention.careEmpty}
            items={careItems}
          />
          <AdminDashboardQueueCard
            title={copy.attention.applicationsTitle}
            subtitle={copy.attention.applicationsSubtitle}
            actionLabel={copy.common.viewAll}
            actionHref="/admin/practitioner-applications"
            emptyText={copy.attention.applicationsEmpty}
            items={applicationItems}
          />
        </div>
      </section>

      <section>
        <AdminDashboardSectionHeader
          title={copy.activity.heading}
          subtitle={copy.activity.subtitle}
        />
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <AdminDashboardQueueCard
              title={copy.activity.recentTitle}
              subtitle={copy.activity.recentSubtitle}
              actionLabel={copy.common.viewAll}
              actionHref="/admin/notifications"
              emptyText={copy.activity.recentEmpty}
              items={recentActivityItems}
            />
          </div>
          <div className="xl:col-span-5">
            <article className="app-panel rounded-3xl p-5">
              <AdminDashboardSectionHeader
                title={copy.activity.snapshotTitle}
                subtitle={copy.activity.snapshotSubtitle}
                actionLabel={copy.common.viewAll}
                actionHref="/admin/moderation/reports"
              />
              <ul className="space-y-2">
                {queueSnapshotItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-border-light bg-surface px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <span className="text-sm font-medium text-text-primary dark:text-white/95">
                      {item.title}
                    </span>
                    <span className="text-sm text-text-secondary">{item.subtitle}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border-light bg-primary-light/70 p-3 dark:border-primary/20 dark:bg-primary/10">
                  <div className="flex items-center gap-2 text-text-brand dark:text-primary-light">
                    <ClipboardCheck className="h-4 w-4" />
                    <p className="text-xs font-semibold">{copy.attention.applicationsTitle}</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-text-primary dark:text-white/95">
                    {formatNumber(locale, applicationsTotal)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border-light bg-surface-tertiary p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <ShieldAlert className="h-4 w-4" />
                    <p className="text-xs font-semibold">{copy.attention.moderationTitle}</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-text-primary dark:text-white/95">
                    {formatNumber(locale, moderationTotal)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border-light bg-surface-tertiary p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Activity className="h-4 w-4" />
                    <p className="text-xs font-semibold">{copy.attention.supportTitle}</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-text-primary dark:text-white/95">
                    {formatNumber(locale, supportTotal)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border-light bg-surface-tertiary p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <BadgeDollarSign className="h-4 w-4" />
                    <p className="text-xs font-semibold">{copy.kpi.revenue}</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-text-primary dark:text-white/95">
                    {formatMoney(locale, settlementLatestValue, settlementCurrency)}
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
