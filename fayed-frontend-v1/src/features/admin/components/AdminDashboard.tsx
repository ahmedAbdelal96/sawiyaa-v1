"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  Headset,
  MessageSquareMore,
  ShieldAlert,
  Users,
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
import { ListStateSkeleton } from "@/components/shared/ContentStates";
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

type LocaleCopy = {
  hero: {
    title: string;
    subtitle: string;
    today: string;
  };
  common: {
    loading: string;
    noData: string;
    unknown: string;
    viewAll: string;
    viewDetails: string;
  };
  kpi: {
    sessionsToday: string;
    openSupport: string;
    pendingApplications: string;
    settlementsTotal: string;
    noDataYet: string;
  };
  attention: {
    heading: string;
    support: string;
    careQueue: string;
    applications: string;
    moderation: string;
    empty: string;
  };
  charts: {
    sessionsTrend: string;
    workload: string;
    settlementsTrend: string;
    noDataYet: string;
  };
  followUp: {
    heading: string;
    support: string;
    applications: string;
    noItems: string;
  };
  activity: {
    heading: string;
    recentNotifications: string;
    noRecent: string;
  };
};

// ─── Enum translation maps ───────────────────────────────────────────────────

const SUPPORT_PRIORITY: Record<string, { en: string; ar: string }> = {
  LOW: { en: "Low", ar: "منخفضة" },
  NORMAL: { en: "Normal", ar: "عادية" },
  MEDIUM: { en: "Medium", ar: "متوسطة" },
  HIGH: { en: "High", ar: "عالية" },
  URGENT: { en: "Urgent", ar: "عاجلة" },
};

const SUPPORT_CATEGORY: Record<string, { en: string; ar: string }> = {
  BOOKING: { en: "Booking", ar: "الحجز" },
  PAYMENT: { en: "Payment", ar: "الدفع" },
  SESSION: { en: "Session", ar: "الجلسة" },
  TECHNICAL: { en: "Technical", ar: "تقني" },
  ACCOUNT: { en: "Account", ar: "الحساب" },
  MATCHING: { en: "Matching", ar: "المطابقة" },
  GENERAL: { en: "General", ar: "عام" },
  CONTENT: { en: "Content", ar: "المحتوى" },
  CHAT: { en: "Chat", ar: "المحادثة" },
  OTHER: { en: "Other", ar: "أخرى" },
};

const SUPPORT_STATUS: Record<string, { en: string; ar: string }> = {
  OPEN: { en: "Open", ar: "مفتوح" },
  IN_PROGRESS: { en: "In progress", ar: "قيد المتابعة" },
  WAITING_FOR_USER: { en: "Waiting", ar: "في الانتظار" },
  ESCALATED: { en: "Escalated", ar: "متصاعد" },
  RESOLVED: { en: "Resolved", ar: "تم الحل" },
  CLOSED: { en: "Closed", ar: "مغلق" },
};

const PRACTITIONER_TYPE: Record<string, { en: string; ar: string }> = {
  PSYCHOLOGIST: { en: "Psychologist", ar: "أخصائي نفسي" },
  PSYCHIATRIST: { en: "Psychiatrist", ar: "طبيب نفسي" },
  NUTRITIONIST: { en: "Nutritionist", ar: "أخصائي تغذية" },
  WEIGHT_LOSS_SPECIALIST: { en: "Weight loss specialist", ar: "أخصائي إنقاص الوزن" },
  COUNSELOR: { en: "Counselor", ar: "مرشد" },
};

const PRACTITIONER_APPLICATION_STATUS: Record<string, { en: string; ar: string }> = {
  DRAFT: { en: "Draft", ar: "مسودة" },
  SUBMITTED: { en: "Submitted", ar: "مُرسل" },
  UNDER_REVIEW: { en: "Under review", ar: "قيد المراجعة" },
  CHANGES_REQUESTED: { en: "Changes requested", ar: "يُطلب تعديل" },
  APPROVED: { en: "Approved", ar: "مقبول" },
  REJECTED: { en: "Rejected", ar: "مرفوض" },
  ARCHIVED: { en: "Archived", ar: "مؤرشف" },
};

const NOTIFICATION_STATUS: Record<string, { en: string; ar: string }> = {
  UNREAD: { en: "Unread", ar: "غير مقروء" },
  READ: { en: "Read", ar: "مقروء" },
  ARCHIVED: { en: "Archived", ar: "مؤرشف" },
};

function tEnum<T extends Record<string, { en: string; ar: string }>>(
  map: T,
  raw: string,
  locale: string,
): string {
  const entry = map[raw];
  if (!entry) return raw;
  return locale === "ar" ? entry.ar : entry.en;
}

// ─────────────────────────────────────────────────────────────────────────────

function useHasHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const COPY: Record<"en" | "ar", LocaleCopy> = {
  en: {
    hero: {
      title: "Admin Dashboard",
      subtitle: "Quick overview of sessions, support, applications, and payments.",
      today: "Today",
    },
    common: {
      loading: "Loading...",
      noData: "No data",
      unknown: "Unknown",
      viewAll: "View all",
      viewDetails: "View details",
    },
    kpi: {
      sessionsToday: "Sessions today",
      openSupport: "Open support",
      pendingApplications: "Pending applications",
      settlementsTotal: "Settlements total",
      noDataYet: "Not enough data yet",
    },
    attention: {
      heading: "Needs attention",
      support: "Support queue",
      careQueue: "Care queue",
      applications: "Applications queue",
      moderation: "Moderation queue",
      empty: "No items need attention now.",
    },
    charts: {
      sessionsTrend: "Sessions trend (14 days)",
      workload: "Workload distribution",
      settlementsTrend: "Settlements trend",
      noDataYet: "Not enough data yet.",
    },
    followUp: {
      heading: "Requires follow-up",
      support: "Support",
      applications: "Applications",
      noItems: "No items require follow-up now.",
    },
    activity: {
      heading: "Recent activity",
      recentNotifications: "Latest notifications",
      noRecent: "No recent activity.",
    },
  },
  ar: {
    hero: {
      title: "لوحة الإدارة",
      subtitle: "متابعة سريعة للجلسات، الدعم، الطلبات، والمدفوعات.",
      today: "اليوم",
    },
    common: {
      loading: "جاري التحميل...",
      noData: "لا توجد بيانات",
      unknown: "غير معروف",
      viewAll: "عرض الكل",
      viewDetails: "عرض التفاصيل",
    },
    kpi: {
      sessionsToday: "جلسات اليوم",
      openSupport: "دعم مفتوح",
      pendingApplications: "طلبات معلقة",
      settlementsTotal: "إجمالي التسويات",
      noDataYet: "لا توجد بيانات كافية بعد",
    },
    attention: {
      heading: "يحتاج متابعة",
      support: "قائمة الدعم",
      careQueue: "قائمة الرعاية",
      applications: "قائمة الطلبات",
      moderation: "قائمة الإشراف",
      empty: "لا توجد عناصر تحتاج متابعة الآن.",
    },
    charts: {
      sessionsTrend: "اتجاه الجلسات (١٤ يوماً)",
      workload: "توزيع العبء",
      settlementsTrend: "اتجاه التسويات",
      noDataYet: "لا توجد بيانات كافية بعد.",
    },
    followUp: {
      heading: "يتطلب متابعة",
      support: "الدعم",
      applications: "الطلبات",
      noItems: "لا توجد عناصر تحتاج متابعة الآن.",
    },
    activity: {
      heading: "النشاط الأخير",
      recentNotifications: "آخر التنبيهات",
      noRecent: "لا توجد أحداث حديثة.",
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
  if (locale === "ar") return normalized;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function monthKeyValue(year: number, month: number) {
  return year * 100 + month;
}

/** Only show delta when baseline > 0 and comparison won't produce misleading values */
function safeDeltaText(
  current: number,
  previous: number,
  locale: string,
  copy: { upFromPrevious: string; downFromPrevious: string; unchanged: string },
): string | undefined {
  if (previous <= 0) return undefined;
  if (current === previous) return copy.unchanged;
  const diff = ((current - previous) / previous) * 100;
  const abs = Math.abs(Math.round(diff));
  const sign = diff > 0 ? "+" : "-";
  return `${sign}${abs}%`;
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
    { page: 1, limit: 5, status: "SUBMITTED" },
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
    (a, b) => monthKeyValue(a.periodYear, a.periodMonth) - monthKeyValue(b.periodYear, b.periodMonth),
  );
  const settlementLatest = settlementsSorted[settlementsSorted.length - 1];
  const settlementPrevious = settlementsSorted[settlementsSorted.length - 2];

  const settlementLatestValue = Number(settlementLatest?.totalAmount ?? "0") || 0;
  const settlementPreviousValue = Number(settlementPrevious?.totalAmount ?? "0") || 0;
  const settlementCurrency = settlementLatest?.currency ?? null;
  const hasSettlementData = settlementLatestValue > 0;

  const sessionsDeltaTone =
    sessionsToday > sessionsYesterday
      ? ("up" as const)
      : sessionsToday < sessionsYesterday
        ? ("down" as const)
        : ("neutral" as const);

  const settlementDeltaTone =
    settlementLatestValue > settlementPreviousValue
      ? ("up" as const)
      : settlementLatestValue < settlementPreviousValue
        ? ("down" as const)
        : ("neutral" as const);

  const sessionsTrendLabels = trendDates.map((date) =>
    date.toLocaleDateString(normalizeLocale(locale), { month: "numeric", day: "numeric" }),
  );
  const sessionsTrendSeries = sessionsTrendQueries.map((q) => q.data?.pagination.totalItems ?? 0);
  const sessionsMovingAverageSeries = sessionsTrendSeries.map((_, index, all) => {
    const startIndex = Math.max(0, index - 2);
    const window = all.slice(startIndex, index + 1);
    return Number((window.reduce((s, v) => s + v, 0) / window.length).toFixed(2));
  });
  const sessionsTrendLoading = sessionsTrendQueries.some((q) => q.isLoading);

  const settlementChartLabels = settlementsSorted.map((item) => {
    const date = new Date(item.periodYear, item.periodMonth - 1, 1);
    return date.toLocaleDateString(normalizeLocale(locale), { month: "short" });
  });
  const settlementChartSeries = settlementsSorted.map((item) => Number(item.totalAmount) || 0);

  const workloadSeries = [supportTotal, careTotal, applicationsTotal, moderationTotal];
  const hasWorkloadData = workloadSeries.some((v) => v > 0);

  // Support items — translated enums in subtitles and badges
  const supportItems = canReadSupport
    ? (supportQuery.data?.items ?? []).map((ticket) => ({
        id: ticket.id,
        title: ticket.subject,
        subtitle: `${tEnum(SUPPORT_CATEGORY, ticket.category, locale)} · ${formatDateLabel(locale, ticket.createdAt)}`,
        href: `/admin/support/${ticket.id}`,
        badge: (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            {tEnum(SUPPORT_PRIORITY, ticket.priority, locale)}
          </span>
        ),
      }))
    : [];

  // Application items — translated enums in subtitles and badges
  const applicationItems = canReadApplications
    ? (applicationsQuery.data?.applications ?? []).map((app) => ({
        id: app.applicationId,
        title: app.displayName ?? copy.common.unknown,
        subtitle: `${tEnum(PRACTITIONER_TYPE, app.practitionerType, locale)} · ${formatDateLabel(locale, app.submittedAt)}`,
        href: `/admin/practitioner-applications/${app.applicationId}`,
        badge: (
          <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-text-brand dark:bg-primary/15 dark:text-primary-light">
            {tEnum(PRACTITIONER_APPLICATION_STATUS, app.applicationStatus, locale)}
          </span>
        ),
      }))
    : [];

  // Recent activity — translated notification status in badges
  const recentActivityItems = canReadNotifications
    ? (notificationsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        title: humanizeEventSlug(item.typeSlug, locale),
        subtitle: `${item.category} · ${formatDateTimeLabel(locale, item.updatedAt)}`,
        href: `/admin/notifications/${item.id}`,
        badge: (
          <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-semibold text-text-muted dark:bg-white/10 dark:text-white/70">
            {tEnum(NOTIFICATION_STATUS, item.status, locale)}
          </span>
        ),
      }))
    : [];

  // Needs attention — only queues with count > 0
  const attentionItems = [
    ...(canReadSupport && supportTotal > 0
      ? [{ id: "support", title: copy.attention.support, count: supportTotal, href: "/admin/support", icon: <Headset className="h-4 w-4" />, tone: "amber" as const }]
      : []),
    ...(canReadCareChat && careTotal > 0
      ? [{ id: "care", title: copy.attention.careQueue, count: careTotal, href: "/admin/care-chat", icon: <MessageSquareMore className="h-4 w-4" />, tone: "violet" as const }]
      : []),
    ...(canReadApplications && applicationsTotal > 0
      ? [{ id: "applications", title: copy.attention.applications, count: applicationsTotal, href: "/admin/practitioner-applications", icon: <Users className="h-4 w-4" />, tone: "emerald" as const }]
      : []),
    ...(canReadModerationReports && moderationTotal > 0
      ? [{ id: "moderation", title: copy.attention.moderation, count: moderationTotal, href: "/admin/moderation/reports", icon: <ShieldAlert className="h-4 w-4" />, tone: "slate" as const }]
      : []),
  ].sort((a, b) => b.count - a.count);

  const ATTENTION_TONE: Record<string, { bg: string; text: string; icon: string }> = {
    amber: { bg: "bg-amber-50/85 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", icon: "text-amber-600 dark:text-amber-400" },
    violet: { bg: "bg-violet-50/85 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", icon: "text-violet-600 dark:text-violet-400" },
    emerald: { bg: "bg-emerald-50/85 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", icon: "text-emerald-600 dark:text-emerald-400" },
    slate: { bg: "bg-slate-100/85 dark:bg-white/[0.06]", text: "text-slate-700 dark:text-white/80", icon: "text-slate-500 dark:text-white/60" },
  };

  const hasAnyAttention = attentionItems.length > 0;

  const sessionsDeltaText = safeDeltaText(sessionsToday, sessionsYesterday, locale, {
    upFromPrevious: "+",
    downFromPrevious: "-",
    unchanged: "0%",
  });
  const settlementDeltaText = safeDeltaText(settlementLatestValue, settlementPreviousValue, locale, {
    upFromPrevious: "+",
    downFromPrevious: "-",
    unchanged: "0%",
  });

  return (
    <div className="space-y-5">
      {/* ── Section 1: Compact header ── */}
      <section className="app-panel rounded-[24px] px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-2xl">
              {copy.hero.title}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">{copy.hero.subtitle}</p>
          </div>
          {hasHydrated && (
            <span className="app-chip rounded-full bg-primary-light px-3.5 py-1.5 text-xs font-semibold text-text-brand dark:bg-primary/15 dark:text-primary-light rtl:ml-0">
              {copy.hero.today} · {now.toLocaleDateString(normalizeLocale(locale), { weekday: "short", month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </section>

      {/* ── Section 2: Needs attention — only shown when items exist ── */}
      {hasAnyAttention && (
        <section className="app-panel rounded-[24px] px-5 py-4 sm:px-6 sm:py-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {copy.attention.heading}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {attentionItems.map((item) => {
              const tone = ATTENTION_TONE[item.tone] ?? ATTENTION_TONE.slate;
              return (
                <Link
                  key={item.id}
                  href={buildLocalizedPath(locale, item.href) as never}
                  className="flex items-center gap-3 rounded-[20px] bg-white/80 px-4 py-3 transition hover:-translate-y-0.5 hover:bg-primary-light/35 dark:bg-white/[0.04] dark:hover:bg-primary/10"
                >
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone.bg} ${tone.icon}`}>
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {formatNumber(locale, item.count)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-text-muted rtl:rotate-180" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!hasAnyAttention && (
        <div className="app-panel-soft rounded-[20px] border border-dashed p-4 text-center text-sm text-text-muted">
          {copy.attention.empty}
        </div>
      )}

      {/* ── Section 3: KPI cards ── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminDashboardKpiCard
          label={copy.kpi.sessionsToday}
          value={formatNumber(locale, sessionsToday)}
          icon={<CalendarClock className="h-5 w-5" />}
          deltaText={sessionsDeltaText}
          deltaTone={sessionsDeltaTone}
          accentTone="blue"
        />
        <AdminDashboardKpiCard
          label={copy.kpi.openSupport}
          value={formatNumber(locale, supportTotal)}
          icon={<Headset className="h-5 w-5" />}
          accentTone="amber"
        />
        <AdminDashboardKpiCard
          label={copy.kpi.pendingApplications}
          value={formatNumber(locale, applicationsTotal)}
          icon={<Users className="h-5 w-5" />}
          accentTone="teal"
        />
        <AdminDashboardKpiCard
          label={copy.kpi.settlementsTotal}
          value={hasSettlementData
            ? formatFinanceMoney(locale, settlementLatestValue, settlementCurrency, {
                fallbackText: "-",
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })
            : "-"}
          icon={<WalletCards className="h-5 w-5" />}
          deltaText={settlementDeltaText}
          deltaTone={settlementDeltaTone}
          accentTone="blue"
        />
      </section>

      {/* ── Section 4: Charts ── */}
      <section>
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <AdminDashboardChartCard title={copy.charts.sessionsTrend}>
              {sessionsTrendLoading ? (
                <ListStateSkeleton items={1} heightClass="h-[240px]" />
              ) : (
                <AreaTrendChart
                  locale={locale}
                  categories={sessionsTrendLabels}
                  seriesName={isArabic ? "الجلسات" : "Sessions"}
                  values={sessionsTrendSeries}
                  comparisonSeriesName={isArabic ? "متوسط ٣ أيام" : "3-day avg"}
                  comparisonValues={sessionsMovingAverageSeries}
                  height={260}
                  color={chartPalette[0]}
                  comparisonColor={chartPalette[1]}
                />
              )}
            </AdminDashboardChartCard>
          </div>

          <div className="xl:col-span-4">
            <AdminDashboardChartCard title={copy.charts.workload}>
              {!hasWorkloadData ? (
                <div className="flex h-[240px] items-center justify-center rounded-[20px] border border-dashed border-border-light bg-surface-secondary/50 dark:border-white/10 dark:bg-white/[0.02]">
                  <p className="text-sm text-text-muted">{copy.charts.noDataYet}</p>
                </div>
              ) : (
                <DonutDistributionChart
                  locale={locale}
                  labels={[
                    copy.attention.support,
                    copy.attention.careQueue,
                    copy.attention.applications,
                    copy.attention.moderation,
                  ]}
                  values={workloadSeries}
                  height={260}
                  colors={[chartPalette[0], chartPalette[1], chartPalette[2], "#C6CED9"]}
                />
              )}
            </AdminDashboardChartCard>
          </div>
        </div>

        <div className="mt-4">
          <AdminDashboardChartCard title={copy.charts.settlementsTrend}>
            {!hasHydrated || settlementsQuery.isLoading ? (
              <ListStateSkeleton items={1} heightClass="h-[200px]" />
            ) : settlementChartSeries.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-[20px] border border-dashed border-border-light bg-surface-secondary/50 dark:border-white/10 dark:bg-white/[0.02]">
                <p className="text-sm text-text-muted">{copy.charts.noDataYet}</p>
              </div>
            ) : (
              <BarTrendChart
                locale={locale}
                categories={settlementChartLabels}
                seriesName={isArabic ? "التسويات" : "Settlements"}
                values={settlementChartSeries}
                currencyCode={settlementCurrency ?? undefined}
                height={200}
                distributed
                colors={chartPalette}
              />
            )}
          </AdminDashboardChartCard>
        </div>
      </section>

      {/* ── Section 5: Follow-up queues ── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          {copy.followUp.heading}
        </h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <AdminDashboardQueueCard
            title={copy.followUp.support}
            actionLabel={canReadSupport ? copy.common.viewAll : undefined}
            actionHref={canReadSupport ? "/admin/support" : undefined}
            emptyText={copy.followUp.noItems}
            items={supportItems}
          />
          <AdminDashboardQueueCard
            title={copy.followUp.applications}
            actionLabel={canReadApplications ? copy.common.viewAll : undefined}
            actionHref={canReadApplications ? "/admin/practitioner-applications" : undefined}
            emptyText={copy.followUp.noItems}
            items={applicationItems}
          />
        </div>
      </section>

      {/* ── Section 6: Recent activity ── */}
      <section>
        <AdminDashboardQueueCard
          title={copy.activity.heading}
          actionLabel={canReadNotifications ? copy.common.viewAll : undefined}
          actionHref={canReadNotifications ? "/admin/notifications" : undefined}
          emptyText={copy.activity.noRecent}
          items={recentActivityItems}
        />
      </section>
    </div>
  );
}