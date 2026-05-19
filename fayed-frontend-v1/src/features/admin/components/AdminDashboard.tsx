"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { useQueries } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  ClipboardCheck,
  Headset,
  MessageSquareMore,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSessionRole } from "@/lib/auth/use-session-role";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
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
import { PermissionKey } from "@/lib/auth/permissions";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
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
  hero: {
    prioritiesTitle: string;
    prioritiesSubtitle: string;
    quickActionsTitle: string;
    quickActionsSubtitle: string;
    countSuffix: string;
  };
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
    hero: {
      prioritiesTitle: "Operational priorities",
      prioritiesSubtitle: "Open the queues that are building pressure right now.",
      quickActionsTitle: "Jump to active workstreams",
      quickActionsSubtitle: "Shortcuts into the queues and finance views most teams reopen during the day.",
      countSuffix: "items",
    },
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
    hero: {
      prioritiesTitle: "أولويات التشغيل",
      prioritiesSubtitle: "افتح القوائم التي تحتاج متابعة مباشرة الآن.",
      quickActionsTitle: "الانتقال السريع لمسارات العمل",
      quickActionsSubtitle: "اختصارات لأكثر المسارات التي تعود إليها فرق الإدارة خلال اليوم.",
      countSuffix: "عنصر",
    },
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

function buildLocalizedPath(locale: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return locale === "ar" ? `/ar${normalizedPath}` : `/en${normalizedPath}`;
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
  const role = useSessionRole();
  const hasHydrated = useHasHydrated();
  const { data: permissionData } = useCurrentUserPermissions(true);
  const permissionSet = new Set(permissionData?.permissions ?? []);
  const hasPermission = (permission: string) => permissionSet.has(permission);
  const canReadSessions = hasPermission(PermissionKey.SESSIONS_READ_ADMIN);
  const canReadSupport = hasPermission(PermissionKey.SUPPORT_TICKET_ASSIGN) || hasPermission(PermissionKey.SUPPORT_TICKET_NOTE_INTERNAL);
  const canReadCareChat =
    hasPermission(PermissionKey.CARE_CHAT_REQUEST_READ_ADMIN) ||
    hasPermission(PermissionKey.CARE_CHAT_CONVERSATION_READ_ADMIN) ||
    hasPermission(PermissionKey.CARE_CHAT_REQUEST_DECIDE);
  const canReadApplications = hasPermission(PermissionKey.PRACTITIONER_APPLICATIONS_READ);
  const canReadSettlements =
    hasPermission(PermissionKey.SETTLEMENTS_READ) ||
    hasPermission(PermissionKey.FINANCE_EVENTS_READ) ||
    hasPermission(PermissionKey.ACCOUNTING_READ) ||
    hasPermission(PermissionKey.PRACTITIONER_PAYOUTS_READ);
  const canReadNotifications = hasPermission(PermissionKey.NOTIFICATION_OPS_READ);
  const canReadModerationReports =
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "SUPPORT_AGENT" ||
    role === "CONTENT_REVIEWER";
  const chartPalette = ["#44A194", "#F39A35", "#7C8AA5"];

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
  }, { enabled: canReadSessions });
  const sessionsYesterdayQuery = useAdminSessions({
    page: 1,
    limit: 1,
    scheduledFrom: yesterdayRange.start,
    scheduledTo: yesterdayRange.end,
  }, { enabled: canReadSessions });

  const supportQuery = useAdminSupportTickets({
    page: 1,
    limit: 5,
    status: "OPEN",
  }, { enabled: canReadSupport });
  const careQuery = useAdminCareChatRequests({
    page: 1,
    limit: 5,
    status: "PENDING",
  }, { enabled: canReadCareChat });
  const applicationsQuery = useAdminPractitionerApplications(
    {
      page: 1,
      limit: 5,
      status: "SUBMITTED",
    },
    canReadApplications,
  );
  const moderationQuery = useAdminModerationReports({
    page: 1,
    limit: 5,
    status: "OPEN",
  }, { enabled: canReadModerationReports });
  const settlementsQuery = useAdminSettlementBatches({
    page: 1,
    limit: 12,
  }, { enabled: canReadSettlements });
  const notificationsQuery = useAdminNotifications({
    page: 1,
    limit: 6,
  }, { enabled: canReadNotifications });

  const trendDates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (13 - index));
    return date;
  });

  const sessionsTrendQueries = useQueries({
    queries: canReadSessions
      ? trendDates.map((date) => {
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
        })
      : [],
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
  const settlementCurrency = settlementLatest?.currency ?? null;

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

  const supportItems = canReadSupport
    ? (supportQuery.data?.items ?? []).map((ticket) => ({
        id: ticket.id,
        title: ticket.subject,
        subtitle: `${ticket.category} - ${formatDateLabel(locale, ticket.createdAt)}`,
        href: `/admin/support/${ticket.id}`,
        badge: (
          <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-text-brand dark:bg-primary/15 dark:text-primary-light">
            {ticket.priority}
          </span>
        ),
      }))
    : [];

  const careItems = canReadCareChat
    ? (careQuery.data?.items ?? []).map((request) => ({
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
      }))
    : [];

  const applicationItems = canReadApplications
    ? (applicationsQuery.data?.applications ?? []).map((app) => ({
        id: app.applicationId,
        title: app.displayName ?? copy.common.unknown,
        subtitle: `${app.practitionerType} - ${formatDateLabel(locale, app.submittedAt)}`,
        href: `/admin/practitioner-applications/${app.applicationId}`,
        badge: (
          <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-semibold text-text-muted dark:bg-white/10 dark:text-white/70">
            {app.applicationStatus}
          </span>
        ),
      }))
    : [];

  const recentActivityItems = canReadNotifications
    ? (notificationsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        title: humanizeEventSlug(item.typeSlug, locale),
        subtitle: `${item.category} - ${formatDateTimeLabel(locale, item.updatedAt)}`,
        href: `/admin/notifications/${item.id}`,
        badge: (
          <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-semibold text-text-muted dark:bg-white/10 dark:text-white/70">
            {item.status}
          </span>
        ),
      }))
    : [];

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

  const headerSnapshotItems = [
    {
      id: "support",
      label: copy.attention.supportTitle,
      value: formatNumber(locale, supportTotal),
    },
    {
      id: "care",
      label: copy.attention.careTitle,
      value: formatNumber(locale, careTotal),
    },
    {
      id: "applications",
      label: copy.attention.applicationsTitle,
      value: formatNumber(locale, applicationsTotal),
    },
  ];

  const priorityItems = [
    ...(canReadSupport
      ? [
          {
            id: "support-priority",
            title: copy.attention.supportTitle,
            count: supportTotal,
            subtitle: copy.attention.supportSubtitle,
            href: "/admin/support",
            icon: <Headset className="h-4 w-4" />,
            toneClass: "bg-amber-50/85 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
          },
        ]
      : []),
    ...(canReadCareChat
      ? [
          {
            id: "care-priority",
            title: copy.attention.careTitle,
            count: careTotal,
            subtitle: copy.attention.careSubtitle,
            href: "/admin/care-chat",
            icon: <MessageSquareMore className="h-4 w-4" />,
            toneClass: "bg-violet-50/85 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
          },
        ]
      : []),
    ...(canReadApplications
      ? [
          {
            id: "applications-priority",
            title: copy.attention.applicationsTitle,
            count: applicationsTotal,
            subtitle: copy.attention.applicationsSubtitle,
            href: "/admin/practitioner-applications",
            icon: <ClipboardCheck className="h-4 w-4" />,
            toneClass: "bg-primary-light/75 text-text-brand dark:bg-primary/10 dark:text-primary-light",
          },
        ]
      : []),
    ...(canReadModerationReports
      ? [
          {
            id: "moderation-priority",
            title: copy.attention.moderationTitle,
            count: moderationTotal,
            subtitle: copy.activity.snapshotSubtitle,
            href: "/admin/moderation/reports",
            icon: <ShieldAlert className="h-4 w-4" />,
            toneClass: "bg-slate-100/85 text-slate-700 dark:bg-white/[0.06] dark:text-white/80",
          },
        ]
      : []),
  ].sort((first, second) => second.count - first.count);

  const quickActionItems = [
    ...(canReadSessions
      ? [
          {
            id: "sessions",
            title: copy.kpi.sessions,
            subtitle: copy.kpi.sessionsHelper,
            href: "/admin/sessions",
            icon: <CalendarClock className="h-4 w-4" />,
            value: formatNumber(locale, sessionsToday),
          },
        ]
      : []),
    ...(canReadSupport
      ? [
          {
            id: "support",
            title: copy.attention.supportTitle,
            subtitle: copy.attention.supportSubtitle,
            href: "/admin/support",
            icon: <Headset className="h-4 w-4" />,
            value: formatNumber(locale, supportTotal),
          },
        ]
      : []),
    ...(canReadCareChat
      ? [
          {
            id: "care",
            title: copy.attention.careTitle,
            subtitle: copy.attention.careSubtitle,
            href: "/admin/care-chat",
            icon: <MessageSquareMore className="h-4 w-4" />,
            value: formatNumber(locale, careTotal),
          },
        ]
      : []),
    ...(canReadSettlements
      ? [
          {
            id: "settlements",
            title: copy.charts.settlementsTitle,
            subtitle: copy.kpi.revenueHelper,
            href: "/admin/settlements",
            icon: <WalletCards className="h-4 w-4" />,
            value: formatFinanceMoney(locale, settlementLatestValue, settlementCurrency, {
              fallbackText: copy.common.noData,
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            }),
          },
        ]
      : []),
  ];

  const strongestPriority = priorityItems[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[34px] px-6 py-6 sm:px-7 sm:py-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {copy.common.updatedLabel}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {copy.pageTitle}
            </h1>
            <p className="mt-2 max-w-[68ch] text-sm leading-6 text-text-secondary sm:text-base">
              {copy.pageSubtitle}
            </p>
            <p className="mt-3 max-w-[70ch] text-sm leading-6 text-text-muted">{copy.pageNote}</p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {headerSnapshotItems.map((item) => (
                <div
                  key={item.id}
                  className="app-chip rounded-full px-3.5 py-2 text-sm text-text-secondary dark:text-white/80"
                >
                  <span className="font-semibold text-text-primary dark:text-white/95">{item.value}</span>{" "}
                  {item.label}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {copy.hero.quickActionsTitle}
                  </h2>
                  <p className="mt-1 max-w-[56ch] text-sm text-text-secondary">
                    {copy.hero.quickActionsSubtitle}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {quickActionItems.map((item) => (
                  <Link
                    key={item.id}
                    href={buildLocalizedPath(locale, item.href) as never}
                    className="app-panel-soft block rounded-[26px] p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary-light/35 dark:hover:bg-primary/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light">
                        {item.icon}
                      </span>
                      <span className="text-sm font-semibold text-text-primary dark:text-white/95">
                        {item.value}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-text-primary dark:text-white/95">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">{item.subtitle}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <aside className="app-panel-soft rounded-[30px] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-text-primary dark:text-white/95">
                  {copy.hero.prioritiesTitle}
                </h2>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {copy.hero.prioritiesSubtitle}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {priorityItems.map((item) => (
                <Link
                  key={item.id}
                  href={buildLocalizedPath(locale, item.href) as never}
                  className="flex items-center justify-between gap-3 rounded-[22px] bg-white/88 px-4 py-3 transition hover:bg-primary-light/45 dark:bg-white/[0.04] dark:hover:bg-primary/10"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.toneClass}`}>
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-secondary">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-text-secondary dark:text-white/75">
                    <div className="text-end">
                      <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                        {formatNumber(locale, item.count)}
                      </p>
                      <p className="text-[11px]">{copy.hero.countSuffix}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
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
          value={formatFinanceMoney(locale, settlementLatestValue, settlementCurrency, {
            fallbackText: copy.common.noData,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
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
              actionHref={canReadSessions ? "/admin/sessions" : undefined}
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
            actionHref={canReadSettlements ? "/admin/settlements" : undefined}
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
            currencyCode={settlementCurrency ?? undefined}
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
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="grid gap-5 lg:grid-cols-2">
              <AdminDashboardQueueCard
                title={copy.attention.supportTitle}
                subtitle={copy.attention.supportSubtitle}
                actionLabel={canReadSupport ? copy.common.viewAll : undefined}
                actionHref={canReadSupport ? "/admin/support" : undefined}
                emptyText={copy.attention.supportEmpty}
                items={supportItems}
              />
              <AdminDashboardQueueCard
                title={copy.attention.careTitle}
                subtitle={copy.attention.careSubtitle}
                actionLabel={canReadCareChat ? copy.common.viewAll : undefined}
                actionHref={canReadCareChat ? "/admin/care-chat" : undefined}
                emptyText={copy.attention.careEmpty}
                items={careItems}
              />
            </div>
          </div>

          <div className="xl:col-span-4">
            <article className="app-panel rounded-[30px] p-5 sm:p-6">
              <AdminDashboardSectionHeader
                title={copy.attention.applicationsTitle}
                subtitle={copy.attention.applicationsSubtitle}
                actionLabel={canReadApplications ? copy.common.viewAll : undefined}
                actionHref={canReadApplications ? "/admin/practitioner-applications" : undefined}
              />

              <div className="rounded-[24px] bg-primary-light/45 p-4 dark:bg-primary/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-brand dark:text-primary-light">
                  {copy.common.totalLabel}
                </p>
                <p className="mt-2 text-[2rem] font-semibold tracking-tight text-text-primary dark:text-white/95">
                  {formatNumber(locale, applicationsTotal)}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {applicationsTotal >= strongestPriority && applicationsTotal > 0
                    ? copy.attention.subtitle
                    : copy.attention.applicationsSubtitle}
                </p>
              </div>

              <div className="mt-4">
                {applicationItems.length === 0 ? (
                  <div className="app-panel-soft rounded-[24px] border border-dashed p-4 text-sm text-text-muted dark:border-white/10">
                    {copy.attention.applicationsEmpty}
                  </div>
                ) : (
                  <ul className="overflow-hidden rounded-[24px] divide-y divide-border-light/80 bg-surface-secondary/75 dark:divide-white/10 dark:bg-white/[0.03]">
                    {applicationItems.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href as never}
                          className="flex items-start justify-between gap-3 px-4 py-3.5 transition hover:bg-primary-light/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:hover:bg-primary/10"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary dark:text-white/95">
                              {item.title}
                            </p>
                            {item.subtitle ? (
                              <p className="mt-0.5 text-xs text-text-muted">{item.subtitle}</p>
                            ) : null}
                          </div>
                          {item.badge ? <div className="shrink-0">{item.badge}</div> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </div>
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
              actionLabel={canReadNotifications ? copy.common.viewAll : undefined}
              actionHref={canReadNotifications ? "/admin/notifications" : undefined}
              emptyText={copy.activity.recentEmpty}
              items={recentActivityItems}
            />
          </div>
          <div className="xl:col-span-5">
            <article className="app-panel rounded-[30px] p-5 sm:p-6">
              <AdminDashboardSectionHeader
                title={copy.activity.snapshotTitle}
                subtitle={copy.activity.snapshotSubtitle}
                actionLabel={canReadModerationReports ? copy.common.viewAll : undefined}
                actionHref={canReadModerationReports ? "/admin/moderation/reports" : undefined}
              />
              <ul className="space-y-2.5">
                {queueSnapshotItems.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[22px] bg-surface-secondary/80 px-4 py-3 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-text-primary dark:text-white/95">
                        {item.title}
                      </span>
                      <span className="text-sm text-text-secondary">{item.subtitle}</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3 rounded-[22px] bg-slate-100/80 px-4 py-3 dark:bg-white/[0.04]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {copy.common.updatedLabel}
                    </p>
                    <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/95">
                      {hasHydrated
                        ? formatDateTimeLabel(locale, new Date().toISOString())
                        : copy.common.loading}
                    </p>
                  </div>
                  <span className="app-chip rounded-full px-3 py-1.5 text-xs text-text-secondary dark:text-white/80">
                    {formatNumber(locale, supportTotal + careTotal + applicationsTotal + moderationTotal)} {copy.hero.countSuffix}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-[22px] bg-primary-light/70 p-3 dark:bg-primary/10">
                  <div className="flex items-center gap-2 text-text-brand dark:text-primary-light">
                    <ClipboardCheck className="h-4 w-4" />
                    <p className="text-xs font-semibold">{copy.attention.applicationsTitle}</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-text-primary dark:text-white/95">
                    {formatNumber(locale, applicationsTotal)}
                  </p>
                </div>

                <div className="rounded-[22px] bg-surface-secondary/85 p-3 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <ShieldAlert className="h-4 w-4" />
                    <p className="text-xs font-semibold">{copy.attention.moderationTitle}</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-text-primary dark:text-white/95">
                    {formatNumber(locale, moderationTotal)}
                  </p>
                </div>

                <div className="rounded-[22px] bg-surface-secondary/85 p-3 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Activity className="h-4 w-4" />
                    <p className="text-xs font-semibold">{copy.attention.supportTitle}</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-text-primary dark:text-white/95">
                    {formatNumber(locale, supportTotal)}
                  </p>
                </div>

                <div className="rounded-[22px] bg-surface-secondary/85 p-3 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <BadgeDollarSign className="h-4 w-4" />
                    <p className="text-xs font-semibold">{copy.kpi.revenue}</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-text-primary dark:text-white/95">
                    {formatFinanceMoney(locale, settlementLatestValue, settlementCurrency, {
                      fallbackText: copy.common.noData,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
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
