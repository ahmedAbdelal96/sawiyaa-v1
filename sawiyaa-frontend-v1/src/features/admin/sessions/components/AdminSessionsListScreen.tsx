"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  Compass,
  RefreshCw,
  Search,
} from "lucide-react";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import DateTimeField from "@/components/form/input/DateTimeField";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import Pagination from "@/components/tables/Pagination";
import { cn } from "@/lib/utils";
import { formatEffectiveViewerDateTime, formatEffectiveViewerTime } from "@/lib/time-formatting";
import { useMySettings } from "@/features/settings/hooks/use-settings";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import {
  AdminFilterCard,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTableSection,
} from "@/components/shared/admin/AdminDashboardKit";
import SessionStatusBadge from "@/features/sessions/components/SessionStatusBadge";
import { useAdminSessions } from "../hooks/use-admin-sessions";
import type {
  AdminSessionListItem,
  ListAdminSessionsParams,
} from "../types/admin-sessions.types";
import type { SessionStatus } from "@/features/sessions/types/sessions.types";
import AdminSessionReference from "@/components/shared/admin/AdminSessionReference";

const STATUS_FILTERS: Array<SessionStatus | "ALL"> = [
  "ALL",
  "PENDING_PAYMENT",
  "UPCOMING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "PATIENT_NO_SHOW",
];

function formatDateTime(value: string | null, locale: string, timeZone: string | null | undefined, fallback = "-") {
  if (!value) return fallback;
  return formatEffectiveViewerDateTime(value, timeZone, { locale });
}

function formatTimeOnly(value: string | null, locale: string, timeZone: string | null | undefined, fallback = "-") {
  if (!value) return fallback;
  return formatEffectiveViewerTime(value, timeZone, { locale });
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

  labels.PATIENT_NO_SHOW = locale === "ar" ? "غياب المريض" : "Patient did not attend";
  labels.PRACTITIONER_NO_SHOW = locale === "ar" ? "غياب المعالج" : "Practitioner did not attend";
  labels.BOTH_NO_SHOW = locale === "ar" ? "غياب الطرفين" : "Neither participant attended";
  labels.AWAITING_COMPLETION_CONFIRMATION = locale === "ar" ? "بانتظار تأكيد الجلسة" : "Waiting for session confirmation";
  return labels[status] ?? getSafeText(status);
}

function getRowClass(status: AdminSessionListItem["operational"]["state"]) {
  if (status === "IN_PROGRESS" || status === "READY_TO_JOIN") {
    return "bg-error/5 shadow-[inset_4px_0_0_0_rgba(220,38,38,0.95)]";
  }
  if (status === "CANCELLED" || status === "PATIENT_NO_SHOW" || status === "EXPIRED") {
    return "opacity-70";
  }
  return "";
}

export default function AdminSessionsListScreen() {
  const t = useTranslations("admin-sessions");
  const locale = useLocale();
  const isAr = locale === "ar";
  const settingsQuery = useMySettings(true);
  const viewerTimeZone = settingsQuery.data?.item.preferences.timezone;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const view = parseEnumParam<"all" | "review">(searchParams.get("view"), ["all", "review"], "review");
  const complaintParam = searchParams.get("complaint");
  const complaint: "active" | "none" | undefined = complaintParam === "active" || complaintParam === "none" ? complaintParam : undefined;
  const resolutionParam = searchParams.get("resolution");
  const resolution: "open" | "none" | undefined = resolutionParam === "open" || resolutionParam === "none" ? resolutionParam : undefined;
  const lateOnly = parseBooleanParam(searchParams.get("late")) ?? false;
  const missingAttendanceOnly = parseBooleanParam(searchParams.get("missingAttendance")) ?? false;
  const scheduledFrom = parseTextParam(searchParams.get("scheduledFrom"), { maxLength: 40 });
  const scheduledTo = parseTextParam(searchParams.get("scheduledTo"), { maxLength: 40 });

  const hasFilters =
    Boolean(query) ||
    view !== "review" ||
    Boolean(complaint) ||
    Boolean(resolution) ||
    status !== "ALL" ||
    lateOnly ||
    missingAttendanceOnly ||
    Boolean(scheduledFrom) ||
    Boolean(scheduledTo);

  const params = useMemo<ListAdminSessionsParams>(() => {
    const next: ListAdminSessionsParams = {
      page,
      limit,
      query: query || undefined,
      view,
      sort: view === "review" ? "oldest" : "newest",
      complaint: complaint || undefined,
      resolution: resolution || undefined,
    };
    if (status !== "ALL") next.status = status;
    if (lateOnly) next.late = true;
    if (missingAttendanceOnly) next.missingAttendance = true;
    if (scheduledFrom) next.scheduledFrom = new Date(scheduledFrom).toISOString();
    if (scheduledTo) next.scheduledTo = new Date(scheduledTo).toISOString();
    return next;
  }, [complaint, lateOnly, limit, missingAttendanceOnly, page, query, resolution, scheduledFrom, scheduledTo, status, view]);

  const sessions = useAdminSessions(params);
  const data = sessions.data;
  const pagedDisplayedItems = useMemo(() => data?.items ?? [], [data?.items]);

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const activePage = page;
  const activeLimit = limit;
  const paginationTotal = data?.pagination.totalItems ?? 0;
  const paginationTotalPages = data?.pagination.totalPages ?? 1;
  const summaryStart = paginationTotal
    ? Math.min((activePage - 1) * activeLimit + 1, paginationTotal)
    : 0;
  const summaryEnd = paginationTotal
    ? Math.min(activePage * activeLimit, paginationTotal)
    : 0;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow={isAr ? "إدارة الجلسات" : "Sessions management"}
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
              {isAr ? "تحديث" : "Refresh"}
            </button>
          </>
        }
      />

      <AdminFilterCard title={isAr ? "الفلاتر والبحث" : "Filters & Search"}>
        <div className="space-y-3">
          <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-4">
            <div className="flex flex-wrap items-center gap-2" aria-label="Review queue filters">
              {[
                { label: isAr ? "الكل" : "All", complaint: null, resolution: null },
                { label: isAr ? "شكاوى نشطة" : "Active complaints", complaint: "active", resolution: null },
                { label: isAr ? "بدون شكاوى" : "No active complaint", complaint: "none", resolution: null },
                { label: isAr ? "تحتاج قرار" : "Needs resolution", complaint: null, resolution: "open" },
              ].map((filter) => {
                const selected = complaint === filter.complaint && resolution === filter.resolution;
                return (
                  <button
                    key={filter.label}
                    type="button"
                    onClick={() => updateListQuery({ view: "review", complaint: filter.complaint, resolution: filter.resolution, status: null, page: 1 })}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-border-light bg-surface-secondary text-text-secondary hover:bg-surface-tertiary",
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="w-full xl:max-w-[28rem]">
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
                  className="app-control w-full rounded-full bg-surface-tertiary px-4 py-2 ps-11 text-sm shadow-theme-xs"
                  placeholder={
                    isAr
                      ? "ابحث باسم المريض أو المعالج أو كود الجلسة..."
                      : "Search by session code, patient name, or practitioner..."
                  }
                  aria-label={isAr ? "بحث الجلسات" : "Search sessions"}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-light/60 text-xs">
            <label className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-theme-xs cursor-pointer transition", lateOnly ? "bg-primary-light border-primary/30 text-text-brand" : "bg-surface-tertiary border-border-light text-text-secondary hover:text-text-primary")}>
              <input
                type="checkbox"
                checked={lateOnly}
                onChange={(event) =>
                  updateListQuery({
                    late: event.target.checked ? "true" : null,
                    page: 1,
                  })
                }
                className="h-3.5 w-3.5 rounded border-border-light text-primary focus:ring-primary"
              />
              {isAr ? "الجلسات المتأخرة" : "Delayed sessions"}
            </label>

            <label className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-theme-xs cursor-pointer transition", missingAttendanceOnly ? "bg-primary-light border-primary/30 text-text-brand" : "bg-surface-tertiary border-border-light text-text-secondary hover:text-text-primary")}>
              <input
                type="checkbox"
                checked={missingAttendanceOnly}
                onChange={(event) =>
                  updateListQuery({
                    missingAttendance: event.target.checked ? "true" : null,
                    page: 1,
                  })
                }
                className="h-3.5 w-3.5 rounded border-border-light text-primary focus:ring-primary"
              />
              {isAr ? "غياب الحضور" : "Missing attendance"}
            </label>

            <div className="flex items-center gap-1.5 ms-auto">
              <span className="text-[11px] font-semibold text-text-muted">{isAr ? "من:" : "From:"}</span>
              <DateTimeField
                value={scheduledFrom}
                onChange={(value) =>
                  updateListQuery({
                    scheduledFrom: value || null,
                    page: 1,
                  })
                }
              />
              <span className="text-[11px] font-semibold text-text-muted">{isAr ? "إلى:" : "To:"}</span>
              <DateTimeField
                value={scheduledTo}
                onChange={(value) =>
                  updateListQuery({
                    scheduledTo: value || null,
                    page: 1,
                  })
                }
              />
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
        </div>
      </AdminFilterCard>

      <AdminTableSection
        subtitle={
          typeof data?.pagination.totalItems === "number"
            ? isAr
              ? `${data.pagination.totalItems} جلسة`
              : `${data.pagination.totalItems} sessions`
            : undefined
        }
        flushContent
      >
        {sessions.isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px]">
              <thead className="border-b border-border-light bg-surface-secondary/80">
                <tr>
                  {[
                    t("table.headers.scheduledStart"),
                    t("table.headers.patient"),
                    t("table.headers.practitioner"),
                    isAr ? "الحضور والتداخل" : "Attendance & Overlap",
                    isAr ? "الشكوى والتوصية" : "Complaint / Recommendation",
                    t("table.headers.status"),
                    isAr ? "الإجراءات" : "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:px-6"
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
        ) : sessions.isError ? (
          <div className="flex min-h-[16rem] items-center justify-center px-6 py-8">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-error-50 text-error-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">{t("states.error.heading")}</h3>
              <p className="mt-1 text-xs text-text-secondary">{t("states.error.note")}</p>
              <button
                type="button"
                onClick={() => sessions.refetch()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("states.error.retry")}
              </button>
            </div>
          </div>
        ) : pagedDisplayedItems.length === 0 ? (
          <div className="flex min-h-[16rem] items-center justify-center px-6 py-8">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-text-brand">
                <CalendarClock className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">{t("states.empty.heading")}</h3>
              <p className="mt-1 text-xs text-text-secondary">{t("states.empty.note")}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px]">
              <thead className="border-b border-border-light bg-surface-secondary/80">
                <tr>
                  <th className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-text-muted sm:px-4">
                    {t("table.headers.scheduledStart")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-text-muted sm:px-4">
                    {t("table.headers.patient")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-text-muted sm:px-4">
                    {t("table.headers.practitioner")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-text-muted sm:px-4">
                    {isAr ? "الحضور والتداخل" : "Attendance & Overlap"}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-text-muted sm:px-4">
                    {isAr ? "الشكوى والتوصية" : "Complaint / Recommendation"}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-text-muted sm:px-4">
                    {t("table.headers.status")}
                  </th>
                  <th className="px-3 py-2 text-end text-[11px] font-bold uppercase tracking-wider text-text-muted sm:px-4">
                    {isAr ? "الإجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border-light/80">
                {pagedDisplayedItems.map((row) => (
                  <tr
                    key={row.id}
                    className={cn("group transition hover:bg-surface-secondary/55 cursor-pointer", getRowClass(row.operational.state))}
                    onClick={() => router.push(`/admin/sessions/${row.id}/review` as never)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/admin/sessions/${row.id}/review` as never);
                      }
                    }}
                  >
                    <td className="px-3 py-2 sm:px-4">
                      <div className="min-w-[10rem] space-y-0.5">
                        <p className="text-xs font-bold text-text-primary">
                          {formatDateTime(row.scheduledStartAt, locale, viewerTimeZone)}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-text-secondary">
                          <span>{formatTimeOnly(row.scheduledStartAt, locale, viewerTimeZone)}</span>
                          <span>·</span>
                          <AdminSessionReference sessionId={row.id} sessionCode={row.sessionCode} variant="table" copyable />
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2 sm:px-4">
                      <div className="flex min-w-[10rem] items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-light bg-primary-light text-[11px] font-bold text-text-brand">
                          {getInitials(getSafeText(row.patient?.displayName, ""))}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-text-primary">
                            {getSafeText(row.patient?.displayName, t("table.fallback.noName"))}
                          </p>
                          <p className="truncate text-[10px] text-text-muted">
                            {getSafeText(row.patient?.id, isAr ? "غير متوفر" : "Unavailable")}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2 sm:px-4">
                      <div className="min-w-[10rem]">
                        <p className="truncate text-xs font-bold text-text-primary">
                          {getSafeText(row.practitioner.displayName, t("table.fallback.noName"))}
                        </p>
                        <p className="truncate text-[10px] text-text-muted">{getSafeText(row.practitioner.slug)}</p>
                      </div>
                    </td>

                    <td className="px-3 py-2 sm:px-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-text-primary">
                          {isAr
                            ? `تداخل ${row.attendance.overlapMinutes} د (${row.attendance.overlapPercent}%)`
                            : `${row.attendance.overlapMinutes} min overlap (${row.attendance.overlapPercent}%)`}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {isAr
                            ? `مريض ${row.attendance.patientMinutes} د / معالج ${row.attendance.practitionerMinutes} د`
                            : `${row.attendance.patientMinutes}/${row.attendance.practitionerMinutes} min`}
                        </p>
                      </div>
                    </td>

                    <td className="px-3 py-2 sm:px-4">
                      <div className="space-y-0.5">
                        <AdminStatusBadge tone={row.hasActiveComplaint ? "danger" : "muted"}>
                          {row.hasActiveComplaint
                            ? isAr
                              ? "شكوى نشطة"
                              : "Active complaint"
                            : isAr
                              ? "بدون شكاوى"
                              : "No active complaint"}
                        </AdminStatusBadge>
                        <p className="text-[10px] text-text-muted truncate max-w-[12rem]">
                          {row.recommendation ?? (isAr ? "لا تتوفر توصية" : "No recommendation")}
                        </p>
                      </div>
                    </td>

                    <td className="px-3 py-2 sm:px-4">
                      <div className="flex flex-wrap items-center gap-1">
                        <SessionStatusBadge
                          status={typeof row.status === "string" ? row.status : "DRAFT"}
                        />
                        {row.isDelayed ? (
                          <AdminStatusBadge tone="danger">
                            {isAr ? "متأخرة" : "Delayed"}
                          </AdminStatusBadge>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-3 py-2 sm:px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/admin/sessions/${row.id}/review` as never);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-95"
                        >
                          <Compass className="h-3 w-3" />
                          <span>{isAr ? "مراجعة" : "Review"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!sessions.isLoading && !sessions.isError && data ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-light px-4 py-3 sm:px-6">
            <p className="text-xs text-text-secondary">
              {isAr
                ? `عرض ${summaryStart} إلى ${summaryEnd} من ${paginationTotal}`
                : `Showing ${summaryStart} to ${summaryEnd} of ${paginationTotal}`}
            </p>
            {paginationTotalPages > 1 ? (
              <Pagination
                currentPage={activePage}
                totalPages={paginationTotalPages}
                onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
                prevLabel={isAr ? "السابق" : "Previous"}
                nextLabel={isAr ? "التالي" : "Next"}
              />
            ) : null}
          </div>
        ) : null}
      </AdminTableSection>
    </div>
  );
}
