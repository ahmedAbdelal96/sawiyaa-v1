"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  Compass,
  Plus,
  RefreshCw,
  Search,
  TimerReset,
} from "lucide-react";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import DateTimeField from "@/components/form/input/DateTimeField";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { Drawer, ModalBody, ModalHeader } from "@/components/ui/modal";
import Pagination from "@/components/tables/Pagination";
import { cn } from "@/lib/utils";
import { formatUtcAuditDateTime, formatUtcAuditTime } from "@/lib/time-formatting";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import {
  AdminFilterCard,
  AdminMetricCard,
  AdminPageHeader,
  AdminStatsGrid,
  AdminStatusBadge,
  AdminTableSection,
  AdminTableTabs,
} from "@/components/shared/admin/AdminDashboardKit";
import SessionStatusBadge from "@/features/sessions/components/SessionStatusBadge";
import { useAdminSessions } from "../hooks/use-admin-sessions";
import { adminSessionsQueryKeys } from "../constants/query-keys";
import { listAdminSessions } from "../api/admin-sessions.api";
import type {
  AdminSessionListItem,
  ListAdminSessionsParams,
} from "../types/admin-sessions.types";
import type { SessionStatus } from "@/features/sessions/types/sessions.types";
import {
  useAdminSessionAttendance,
  useAdminSessionRuntimeInspection,
} from "@/features/admin/session-runtime/hooks/use-admin-session-runtime";
import AdminSessionRoomCloseEvidencePanel from "@/features/admin/session-runtime/components/AdminSessionRoomCloseEvidencePanel";
import AdminSessionPackageEntitlementPanel from "@/features/admin/session-runtime/components/AdminSessionPackageEntitlementPanel";

const STATUS_FILTERS: Array<SessionStatus | "ALL"> = [
  "ALL",
  "PENDING_PAYMENT",
  "UPCOMING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "PATIENT_NO_SHOW",
];

type SessionTabValue =
  | "ALL"
  | "PENDING_PAYMENT"
  | "IN_PROGRESS"
  | "UPCOMING"
  | "COMPLETED"
  | "CANCELLED"
  | "PATIENT_NO_SHOW";

function formatDateTime(value: string | null, locale: string, fallback = "-") {
  if (!value) return fallback;
  return `UTC: ${formatUtcAuditDateTime(value, { locale })}`;
}

function formatTimeOnly(value: string | null, locale: string, fallback = "-") {
  if (!value) return fallback;
  return `UTC: ${formatUtcAuditTime(value, { locale })}`;
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function getInitials(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getSafeText(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function getModeLabel(mode: AdminSessionListItem["sessionMode"]) {
  return mode === "VIDEO" ? "Video" : getSafeText(mode);
}

function getStatusLabel(status: SessionStatus, locale: string) {
  const labels: Record<string, string> = {
    DRAFT: locale === "ar" ? "مسودة" : "Draft",
    PENDING_PAYMENT: locale === "ar" ? "بانتظار الدفع" : "Pending Payment",
    PENDING_PRACTITIONER_CONFIRMATION:
      locale === "ar" ? "بانتظار رد المعالج" : "Pending Practitioner Response",
    CONFIRMED: locale === "ar" ? "مؤكدة" : "Confirmed",
    UPCOMING: locale === "ar" ? "قادمة" : "Upcoming",
    READY_TO_JOIN: locale === "ar" ? "جاهزة للانضمام" : "Ready to Join",
    IN_PROGRESS: locale === "ar" ? "مباشرة" : "Live",
    COMPLETED: locale === "ar" ? "مكتملة" : "Completed",
    CANCELLED: locale === "ar" ? "ملغاة" : "Cancelled",
    NO_SHOW: locale === "ar" ? "فاتت" : "Missed",
    EXPIRED: locale === "ar" ? "منتهية" : "Expired",
    REFUND_PENDING: locale === "ar" ? "استرداد قيد المعالجة" : "Refund Pending",
    REFUNDED: locale === "ar" ? "مستردة" : "Refunded",
  };

  labels.PATIENT_NO_SHOW = locale === "ar" ? "Patient did not attend" : "Patient did not attend";
  labels.PRACTITIONER_NO_SHOW = locale === "ar" ? "Practitioner did not attend" : "Practitioner did not attend";
  labels.BOTH_NO_SHOW = locale === "ar" ? "Neither participant attended" : "Neither participant attended";
  labels.AWAITING_COMPLETION_CONFIRMATION = locale === "ar" ? "Waiting for session confirmation" : "Waiting for session confirmation";
  return labels[status] ?? getSafeText(status);
}

function getRowClass(status: AdminSessionListItem["status"]) {
  if (status === "IN_PROGRESS" || status === "READY_TO_JOIN") {
    return "bg-error/5 shadow-[inset_4px_0_0_0_rgba(220,38,38,0.95)]";
  }
  if (status === "CANCELLED" || status === "PATIENT_NO_SHOW" || status === "EXPIRED") {
    return "opacity-70";
  }
  return "";
}

function getSessionModeDescription(mode: AdminSessionListItem["sessionMode"]) {
  return mode === "VIDEO" ? "In-app video" : "-";
}

export default function AdminSessionsListScreen() {
  const t = useTranslations("admin-sessions");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const status = parseEnumParam<SessionStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const query = parseTextParam(searchParams.get("query"), { maxLength: 64 });
  const lateOnly = parseBooleanParam(searchParams.get("late")) ?? false;
  const missingAttendanceOnly = parseBooleanParam(searchParams.get("missingAttendance")) ?? false;
  const scheduledFrom = parseTextParam(searchParams.get("scheduledFrom"), { maxLength: 40 });
  const scheduledTo = parseTextParam(searchParams.get("scheduledTo"), { maxLength: 40 });

  const hasFilters =
    Boolean(query) ||
    status !== "ALL" ||
    lateOnly ||
    missingAttendanceOnly ||
    Boolean(scheduledFrom) ||
    Boolean(scheduledTo);

  const params = useMemo<ListAdminSessionsParams>(() => {
    const next: ListAdminSessionsParams = { page, limit };
    if (status !== "ALL") next.status = status;
    if (lateOnly) next.late = true;
    if (missingAttendanceOnly) next.missingAttendance = true;
    if (scheduledFrom) next.scheduledFrom = new Date(scheduledFrom).toISOString();
    if (scheduledTo) next.scheduledTo = new Date(scheduledTo).toISOString();
    return next;
  }, [lateOnly, limit, missingAttendanceOnly, page, scheduledFrom, scheduledTo, status]);

  const sessions = useAdminSessions(params);
  const data = sessions.data;

  const runtime = useAdminSessionRuntimeInspection(selectedSessionId ?? undefined);
  const attendance = useAdminSessionAttendance(selectedSessionId ?? undefined);

  const countBaseParams = useMemo<ListAdminSessionsParams>(() => {
    return { page: 1, limit: 1 };
  }, []);

  const counts = useQueries({
    queries: [
      {
        queryKey: adminSessionsQueryKeys.list({ ...countBaseParams, status: "IN_PROGRESS" }),
        queryFn: () =>
          listAdminSessions({
            ...countBaseParams,
            status: "IN_PROGRESS",
          }),
        staleTime: 20_000,
      },
      {
        queryKey: adminSessionsQueryKeys.list({ ...countBaseParams, status: "UPCOMING" }),
        queryFn: () =>
          listAdminSessions({
            ...countBaseParams,
            status: "UPCOMING",
          }),
        staleTime: 20_000,
      },
      {
        queryKey: adminSessionsQueryKeys.list({ ...countBaseParams, late: true }),
        queryFn: () =>
          listAdminSessions({
            ...countBaseParams,
            late: true,
          }),
        staleTime: 20_000,
      },
      {
        queryKey: adminSessionsQueryKeys.list({ ...countBaseParams, missingAttendance: true }),
        queryFn: () =>
          listAdminSessions({
            ...countBaseParams,
            missingAttendance: true,
          }),
        staleTime: 20_000,
      },
    ],
  });

  const liveCount = counts[0]?.data?.pagination.totalItems;
  const upcomingCount = counts[1]?.data?.pagination.totalItems;
  const delayedCount = counts[2]?.data?.pagination.totalItems;
  const missingCount = counts[3]?.data?.pagination.totalItems;

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const activeTab: SessionTabValue =
    status === "PENDING_PAYMENT" ||
    status === "IN_PROGRESS" ||
    status === "UPCOMING" ||
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "PATIENT_NO_SHOW"
      ? status
      : "ALL";

  const tabs: Array<{ value: SessionTabValue; label: string }> = [
    { value: "ALL", label: locale === "ar" ? "الكل" : "All" },
    { value: "PENDING_PAYMENT", label: locale === "ar" ? "بانتظار الدفع" : "Pending Payment" },
    { value: "IN_PROGRESS", label: locale === "ar" ? "مباشر" : "Live" },
    { value: "UPCOMING", label: locale === "ar" ? "قادمة" : "Upcoming" },
    { value: "COMPLETED", label: locale === "ar" ? "مكتملة" : "Completed" },
    { value: "CANCELLED", label: locale === "ar" ? "ملغاة" : "Cancelled" },
    { value: "PATIENT_NO_SHOW", label: locale === "ar" ? "فاتت" : "Missed" },
  ];

  const metrics = [
    {
      label: locale === "ar" ? "إجمالي الجلسات" : "Total sessions",
      value: data?.pagination.totalItems ?? "...",
      hint: locale === "ar" ? "ضمن النتائج الحالية" : "Current result set",
      icon: <CalendarClock className="h-4 w-4" />,
      tone: "primary" as const,
    },
    {
      label: locale === "ar" ? "مباشرة الآن" : "Live now",
      value: liveCount ?? "...",
      hint: locale === "ar" ? "الجلسات النشطة" : "Active sessions",
      icon: <Clock3 className="h-4 w-4" />,
      tone: "danger" as const,
    },
    {
      label: locale === "ar" ? "قادمة" : "Upcoming",
      value: upcomingCount ?? "...",
      hint: locale === "ar" ? "قريباً" : "Scheduled ahead",
      icon: <CalendarClock className="h-4 w-4" />,
      tone: "success" as const,
    },
    {
      label: locale === "ar" ? "تنبيه تشغيلي" : "Operational alerts",
      value:
        typeof delayedCount === "number" && typeof missingCount === "number"
          ? delayedCount + missingCount
          : "...",
      hint: locale === "ar" ? "متأخرة أو ناقصة الحضور" : "Delayed or missing attendance",
      icon: <AlertTriangle className="h-4 w-4" />,
      tone: "warning" as const,
    },
  ];

  const searchTerm = query.trim().toLowerCase();
  const searchMode = searchTerm.length > 0;

  const allSessionsQuery = useQuery({
    queryKey: [
      "admin-sessions-search-all",
      {
        status,
        lateOnly,
        missingAttendanceOnly,
        scheduledFrom,
        scheduledTo,
      },
    ] as const,
    queryFn: async () => {
      const pageSize = 50;
      let pageCursor = 1;
      let totalPages = 1;
      const collected: AdminSessionListItem[] = [];

      do {
        const response = await listAdminSessions({
          page: pageCursor,
          limit: pageSize,
          status: status === "ALL" ? undefined : status,
          late: lateOnly || undefined,
          missingAttendance: missingAttendanceOnly || undefined,
          scheduledFrom: scheduledFrom ? new Date(scheduledFrom).toISOString() : undefined,
          scheduledTo: scheduledTo ? new Date(scheduledTo).toISOString() : undefined,
        });

        collected.push(...response.items);
        totalPages = response.pagination.totalPages;
        pageCursor += 1;
      } while (pageCursor <= totalPages);

      return collected;
    },
    enabled: searchMode,
    staleTime: 30_000,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const displayedItems = useMemo(() => {
    const baseItems = searchMode ? allSessionsQuery.data ?? [] : items;
    if (!searchTerm) return baseItems;

    return baseItems.filter((row) => {
      const values = [
        getSafeText(row.sessionCode),
        getSafeText(row.patient?.displayName),
        getSafeText(row.practitioner.displayName),
        getSafeText(row.practitioner.slug),
        getSafeText(row.patient?.id),
        getSafeText(row.practitioner.id),
      ];

      return values.some((value) => value?.toLowerCase().includes(searchTerm));
    });
  }, [allSessionsQuery.data, items, searchMode, searchTerm]);
  const selectedSession = useMemo(
    () => items.find((item) => item.id === selectedSessionId) ?? null,
    [items, selectedSessionId],
  );
  const runtimeItem = runtime.data?.item ?? null;
  const attendanceData = attendance.data ?? null;

  const activePage = page;
  const activeLimit = limit;
  const searchPaginationTotal = displayedItems.length;
  const searchPaginationPages = Math.max(1, Math.ceil(searchPaginationTotal / activeLimit));
  const pagedDisplayedItems = searchMode
    ? displayedItems.slice((activePage - 1) * activeLimit, activePage * activeLimit)
    : displayedItems;
  const paginationTotal = searchMode ? searchPaginationTotal : data?.pagination.totalItems ?? 0;
  const paginationTotalPages = searchMode
    ? searchPaginationPages
    : data?.pagination.totalPages ?? 1;
  const summaryStart = paginationTotal
    ? Math.min((activePage - 1) * activeLimit + 1, paginationTotal)
    : 0;
  const summaryEnd = paginationTotal
    ? Math.min(activePage * activeLimit, paginationTotal)
    : 0;

  const renderStatusChip = (statusValue: SessionStatus) => (
    <AdminStatusBadge tone="muted">{getStatusLabel(statusValue, locale)}</AdminStatusBadge>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={locale === "ar" ? "إدارة الجلسات" : "Sessions management"}
        title={t("header.title")}
        description={t("header.note")}
        actions={
          <>
            <Link
              href="/admin/sessions/cancellation-policies"
              className="inline-flex items-center justify-center rounded-xl border border-border-light bg-surface-secondary px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-tertiary"
            >
              {t("policy.actions.openEditor")}
            </Link>
            <button
              type="button"
              onClick={() => sessions.refetch()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-light bg-surface-secondary px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-tertiary"
            >
              <RefreshCw className="h-4 w-4" />
              {locale === "ar" ? "تحديث" : "Refresh"}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              {locale === "ar" ? "جلسة جديدة" : "New Session"}
            </button>
          </>
        }
      />

      <AdminStatsGrid>
        {metrics.map((metric) => (
          <AdminMetricCard key={metric.label} {...metric} />
        ))}
      </AdminStatsGrid>

      <AdminFilterCard
        title={locale === "ar" ? "الفلاتر والبحث" : "Filters & Search"}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-4">
              <AdminTableTabs
                value={activeTab}
                onChange={(nextValue) => {
                  updateListQuery({
                    status: nextValue === "ALL" ? null : nextValue,
                    page: 1,
                  });
                }}
                tabs={tabs}
                className="w-full xl:justify-self-end"
              />

              <div className="w-full xl:max-w-[32rem] xl:justify-self-start">
                <label className="relative block">
                  <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) =>
                      updateListQuery({
                        query: event.target.value || null,
                        page: 1,
                      })
                    }
                    className="app-control w-full rounded-full bg-surface-tertiary px-4 py-3 ps-11 text-sm shadow-theme-xs"
                    placeholder={
                      locale === "ar"
                        ? "ابحث باسم المريض أو المعالج أو رقم الجلسة..."
                        : "Search by beneficiary name, practitioner name, or session ID..."
                    }
                    aria-label={locale === "ar" ? "بحث الجلسات" : "Search sessions"}
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface-tertiary px-3 py-2 text-sm text-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {locale === "ar" ? "الفلاتر" : "Filters"}
              </div>

              <label className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-theme-xs cursor-pointer transition", lateOnly ? "bg-primary-light border-primary/30 text-text-brand" : "bg-surface-tertiary border-border-light text-text-secondary hover:text-text-primary")}>
                <input
                  type="checkbox"
                  checked={lateOnly}
                  onChange={(event) =>
                    updateListQuery({
                      late: event.target.checked ? "true" : null,
                      page: 1,
                    })
                  }
                  className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
                />
                {locale === "ar" ? "الجلسات المتأخرة" : "Delayed sessions"}
              </label>

              <label className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-theme-xs cursor-pointer transition", missingAttendanceOnly ? "bg-primary-light border-primary/30 text-text-brand" : "bg-surface-tertiary border-border-light text-text-secondary hover:text-text-primary")}>
                <input
                  type="checkbox"
                  checked={missingAttendanceOnly}
                  onChange={(event) =>
                    updateListQuery({
                      missingAttendance: event.target.checked ? "true" : null,
                      page: 1,
                    })
                  }
                  className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
                />
                {locale === "ar" ? "غياب الحضور" : "Missing attendance"}
              </label>

              <div className="min-w-[11rem] flex-1 sm:flex-[0_0_11rem]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {locale === "ar" ? "من" : "From"}
                </span>
                <DateTimeField
                  value={scheduledFrom}
                  onChange={(value) =>
                    updateListQuery({
                      scheduledFrom: value || null,
                      page: 1,
                    })
                  }
                />
              </div>

              <div className="min-w-[11rem] flex-1 sm:flex-[0_0_11rem]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {locale === "ar" ? "إلى" : "To"}
                </span>
                <DateTimeField
                  value={scheduledTo}
                  onChange={(value) =>
                    updateListQuery({
                      scheduledTo: value || null,
                      page: 1,
                    })
                  }
                />
              </div>

              <FilterClearButton
                disabled={!hasFilters}
                onClick={() =>
                  updateListQuery({
                    query: null,
                    status: null,
                    late: null,
                    missingAttendance: null,
                    scheduledFrom: null,
                    scheduledTo: null,
                    page: 1,
                  })
                }
              />
            </div>
          </div>
      </AdminFilterCard>

      <AdminTableSection
        subtitle={
          typeof data?.pagination.totalItems === "number"
            ? locale === "ar"
              ? `${data.pagination.totalItems} جلسة`
              : `${data.pagination.totalItems} sessions`
            : undefined
        }
        actions={
          <button
            type="button"
            onClick={() => sessions.refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-light bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary hover:text-text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {locale === "ar" ? "تحديث" : "Refresh"}
          </button>
        }
        flushContent
      >
            {sessions.isLoading || (searchMode && allSessionsQuery.isLoading) ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px]">
                  <thead className="border-b border-border-light bg-surface-secondary/80">
                    <tr>
                      {[
                        t("table.headers.scheduledStart"),
                        t("table.headers.patient"),
                        t("table.headers.practitioner"),
                        t("table.headers.mode"),
                        locale === "ar" ? "المدة" : "Duration",
                        t("table.headers.status"),
                        locale === "ar" ? "الإجراءات" : "Actions",
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:px-6"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light/80">
                    {Array.from({ length: 6 }).map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {Array.from({ length: 7 }).map((__, colIndex) => (
                          <td key={colIndex} className="px-4 py-4 sm:px-6">
                            <div
                              className="h-3.5 animate-pulse rounded-full bg-surface-tertiary"
                              style={{ width: `${64 + ((rowIndex + colIndex) % 4) * 8}%` }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : sessions.isError || (searchMode && allSessionsQuery.isError) ? (
              <div className="flex min-h-[18rem] items-center justify-center px-6 py-10">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-error-50 text-error-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary">{t("states.error.heading")}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {searchMode
                      ? locale === "ar"
                        ? "تعذّر تحميل كل الصفحات المطلوبة للبحث."
                        : "Could not load all pages needed for search."
                      : t("states.error.note")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      sessions.refetch();
                      if (searchMode) {
                        allSessionsQuery.refetch();
                      }
                    }}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("states.error.retry")}
                  </button>
                </div>
              </div>
            ) : pagedDisplayedItems.length === 0 ? (
              <div className="flex min-h-[18rem] items-center justify-center px-6 py-10">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-text-brand">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary">{t("states.empty.heading")}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{t("states.empty.note")}</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px]">
                  <thead className="border-b border-border-light bg-surface-secondary/80">
                    <tr>
                      <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:px-6">
                        {t("table.headers.scheduledStart")}
                      </th>
                      <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:px-6">
                        {t("table.headers.patient")}
                      </th>
                      <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:px-6">
                        {t("table.headers.practitioner")}
                      </th>
                      <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:px-6">
                        {t("table.headers.mode")}
                      </th>
                      <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:px-6">
                        {locale === "ar" ? "المدة" : "Duration"}
                      </th>
                      <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:px-6">
                        {t("table.headers.status")}
                      </th>
                      <th className="px-4 py-4 text-end text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:px-6">
                        {locale === "ar" ? "الإجراءات" : "Actions"}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border-light/80">
                    {pagedDisplayedItems.map((row) => (
                      <tr
                        key={row.id}
                        className={cn("group transition hover:bg-surface-secondary/55", getRowClass(row.status))}
                        onClick={() => setSelectedSessionId(row.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedSessionId(row.id);
                          }
                        }}
                      >
                        <td className="px-4 py-4 sm:px-6">
                          <div className="min-w-[11rem] space-y-1">
                            <p className="text-sm font-semibold text-text-primary">
                              {formatDateTime(row.scheduledStartAt, locale)}
                            </p>
                            <p className="text-sm text-text-secondary">
                              {formatTimeOnly(row.scheduledStartAt, locale)}
                            </p>
                            <p className="text-xs font-medium text-text-muted">{getSafeText(row.sessionCode)}</p>
                          </div>
                        </td>

                        <td className="px-4 py-4 sm:px-6">
                          <div className="flex min-w-[12rem] items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-light bg-primary-light text-xs font-semibold text-text-brand">
                              {getInitials(getSafeText(row.patient?.displayName, ""))}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-text-primary">
                                {getSafeText(row.patient?.displayName, t("table.fallback.noName"))}
                              </p>
                              <p className="truncate text-xs text-text-muted">
                                {getSafeText(row.patient?.id, locale === "ar" ? "غير متوفر" : "Unavailable")}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 sm:px-6">
                          <div className="min-w-[12rem]">
                            <p className="truncate text-sm font-semibold text-text-primary">
                              {getSafeText(row.practitioner.displayName, t("table.fallback.noName"))}
                            </p>
                            <p className="truncate text-xs text-text-muted">{getSafeText(row.practitioner.slug)}</p>
                          </div>
                        </td>

                        <td className="px-4 py-4 sm:px-6">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-text-primary">{getModeLabel(row.sessionMode)}</p>
                            <p className="text-xs text-text-muted">{getSessionModeDescription(row.sessionMode)}</p>
                          </div>
                        </td>

                        <td className="px-4 py-4 sm:px-6">
                          <p className="text-sm font-semibold text-text-primary">{getSafeText(row.durationMinutes)} min</p>
                        </td>

                        <td className="px-4 py-4 sm:px-6">
                          <div className="flex flex-wrap items-center gap-2">
                            <SessionStatusBadge
                              status={typeof row.status === "string" ? row.status : "DRAFT"}
                            />
                            {row.isDelayed ? (
                              <AdminStatusBadge tone="danger">
                                {locale === "ar" ? "متأخرة" : "Delayed"}
                              </AdminStatusBadge>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <ActionIconButton
                              intent="view"
                              label={locale === "ar" ? "فتح المعاينة" : "Open runtime"}
                              icon={<CalendarClock className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/admin/sessions/runtime-inspection?sessionId=${row.id}` as never);
                              }}
                            />
                            <ActionIconButton
                              intent="view"
                              label={locale === "ar" ? "فحص التشغيل التفصيلي" : "Open full inspector"}
                              icon={<Compass className="h-4 w-4" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/admin/sessions/runtime-inspector?sessionId=${row.id}` as never);
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!sessions.isLoading && !sessions.isError && (data || searchMode) ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-light px-4 py-4 sm:px-6">
                <p className="text-sm text-text-secondary">
                  {locale === "ar"
                    ? `عرض ${summaryStart} إلى ${summaryEnd} من ${paginationTotal}`
                    : `Showing ${summaryStart} to ${summaryEnd} of ${paginationTotal}`}
                </p>
                {paginationTotalPages > 1 ? (
                  <Pagination
                    currentPage={activePage}
                    totalPages={paginationTotalPages}
                    onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
                    prevLabel={locale === "ar" ? "السابق" : "Previous"}
                    nextLabel={locale === "ar" ? "التالي" : "Next"}
                  />
                ) : null}
              </div>
            ) : null}
      </AdminTableSection>

      <Drawer
        isOpen={Boolean(selectedSessionId)}
        onClose={() => setSelectedSessionId(null)}
        side="right"
        className="max-w-[42rem]"
      >
        <ModalHeader
          eyebrow={locale === "ar" ? "تفاصيل الجلسة" : "Session details"}
          title={
            selectedSession
              ? `${getSafeText(selectedSession.patient?.displayName, t("table.fallback.noName"))} · ${getSafeText(selectedSession.sessionCode)}`
              : locale === "ar"
                ? "تفاصيل الجلسة"
                : "Session details"
          }
          description={
            selectedSession
              ? `${formatDateTime(selectedSession.scheduledStartAt, locale)} · ${getSafeText(selectedSession.practitioner.displayName, getSafeText(selectedSession.practitioner.slug))}`
              : undefined
          }
        />
        <ModalBody className="space-y-5 overflow-y-auto">
          {selectedSession ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-border-light bg-surface-secondary/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {locale === "ar" ? "الحالة" : "Status"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <SessionStatusBadge
                      status={
                        typeof selectedSession.status === "string"
                          ? selectedSession.status
                          : "DRAFT"
                      }
                    />
                    {selectedSession.isDelayed ? (
                      <AdminStatusBadge tone="danger">
                        {locale === "ar" ? "متأخرة" : "Delayed"}
                      </AdminStatusBadge>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[22px] border border-border-light bg-surface-secondary/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {locale === "ar" ? "النوع" : "Mode"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    {getModeLabel(selectedSession.sessionMode)}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {getSessionModeDescription(selectedSession.sessionMode)}
                  </p>
                </div>

                <div className="rounded-[22px] border border-border-light bg-surface-tertiary p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {locale === "ar" ? "المستفيد" : "Beneficiary"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    {getSafeText(selectedSession.patient?.displayName, t("table.fallback.noName"))}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {getSafeText(selectedSession.patient?.id, locale === "ar" ? "غير متوفر" : "Unavailable")}
                  </p>
                </div>

                <div className="rounded-[22px] border border-border-light bg-surface-tertiary p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {locale === "ar" ? "المعالج" : "Practitioner"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    {getSafeText(selectedSession.practitioner.displayName, t("table.fallback.noName"))}
                  </p>
                  <p className="text-sm text-text-secondary">{getSafeText(selectedSession.practitioner.slug)}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-border-light bg-surface-tertiary p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {locale === "ar" ? "الموعد" : "Scheduled"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">
                      {formatDateTime(selectedSession.scheduledStartAt, locale)}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {selectedSession.scheduledEndAt
                        ? `${locale === "ar" ? "ينتهي" : "Ends"} ${formatTimeOnly(selectedSession.scheduledEndAt, locale)}`
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {locale === "ar" ? "المدة" : "Duration"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">
                      {selectedSession.durationMinutes} min
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-border-light bg-surface-secondary/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {locale === "ar" ? "فحص وقت التشغيل" : "Runtime inspection"}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {locale === "ar"
                        ? "البيانات الحالية من نافذة التشخيص."
                        : "Live data from the runtime inspection endpoint."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/admin/sessions/runtime-inspection?sessionId=${selectedSession.id}` as never,
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                    >
                      <CalendarClock className="h-4 w-4" />
                      {locale === "ar" ? "فتح الصفحة" : "Open page"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/admin/sessions/runtime-inspector?sessionId=${selectedSession.id}` as never,
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-light px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
                    >
                      <Compass className="h-4 w-4" />
                      {locale === "ar" ? "فحص التشغيل التفصيلي" : "Full inspector"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-border-light bg-surface-tertiary p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {locale === "ar" ? "المزوّد" : "Provider"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">{getSafeText(runtimeItem?.provider)}</p>
                  </div>

                  <div className="rounded-[20px] border border-border-light bg-surface-tertiary p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {locale === "ar" ? "يمكن الانضمام" : "Can join"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">
                      {runtimeItem ? (runtimeItem.canJoin ? "Yes" : "No") : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-border-light bg-surface-tertiary p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {locale === "ar" ? "الحضور" : "Attendance"}
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-border-light bg-surface-secondary/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {locale === "ar" ? "المريض انضم" : "Patient joined"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">
                      {attendanceData ? (attendanceData.summary.patientHasJoined ? "Yes" : "No") : "-"}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {attendanceData?.summary.patientJoinedAt
                        ? formatDateTime(attendanceData.summary.patientJoinedAt, locale)
                        : "-"}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-border-light bg-surface-secondary/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {locale === "ar" ? "المعالج انضم" : "Practitioner joined"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">
                      {attendanceData ? (attendanceData.summary.practitionerHasJoined ? "Yes" : "No") : "-"}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {attendanceData?.summary.practitionerJoinedAt
                        ? formatDateTime(attendanceData.summary.practitionerJoinedAt, locale)
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {attendanceData?.timeline?.length ? (
                    attendanceData.timeline.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[20px] border border-border-light bg-surface-secondary/40 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            {getSafeText(item.attendanceEventType)} · {getSafeText(item.participantRole)}
                          </p>
                          <p className="text-xs text-text-muted">{formatDateTime(item.occurredAt, locale)}</p>
                        </div>
                        <p className="mt-2 text-sm text-text-secondary">
                          {getSafeText(item.providerEventType)}
                          {getSafeText(item.providerEventRef) !== "-" ? ` · ${getSafeText(item.providerEventRef)}` : ""}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-secondary">
                      {locale === "ar" ? "لا توجد بيانات حضور حالياً." : "No attendance records yet."}
                    </p>
                  )}
                </div>

              </div>

              {attendanceData ? (
                <AdminSessionRoomCloseEvidencePanel
                  videoRoomClose={attendanceData.videoRoomClose}
                  relatedSupportTickets={attendanceData.relatedSupportTickets}
                />
              ) : null}

              {runtimeItem ? (
                <AdminSessionPackageEntitlementPanel item={runtimeItem} />
              ) : null}
            </>
          ) : (
            <div className="rounded-[24px] border border-border-light bg-surface-secondary/50 p-6 text-sm text-text-secondary">
              {locale === "ar" ? "جارٍ تحميل تفاصيل الجلسة..." : "Loading session details..."}
            </div>
          )}
        </ModalBody>
      </Drawer>
    </div>
  );
}
