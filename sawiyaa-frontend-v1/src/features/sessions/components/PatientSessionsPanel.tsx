"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  History,
  Search,
  Sparkles,
} from "lucide-react";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { Modal, ModalBody } from "@/components/ui/modal";
import {
  usePatientSessionSummary,
  usePatientSessions,
} from "../hooks/use-sessions";
import { useAuthState } from "@/stores/auth-store";
import { usePendingPatientReviews, usePatientReviews } from "@/features/reviews";
import PatientSessionReviewCard from "./PatientSessionReviewCard";
import SessionStatusBadge from "./SessionStatusBadge";
import type {
  SessionListItem,
  SessionStatus,
} from "../types/sessions.types";
import type { PatientReviewItem } from "@/features/reviews/types/reviews.types";
import SessionCodeReference from "@/components/shared/SessionCodeReference";
import { StateCard } from "@/components/shared/ContentStates";
import {
  SurfaceCard,
  SurfaceToolbar,
} from "@/components/shared/SurfaceShell";
import { formatPatientDateTime } from "@/lib/time-formatting";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import Avatar from "@/components/ui/avatar/Avatar";
import { Skeleton } from "@/components/shared/LoadingStates";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";

type SessionReviewVisualState =
  | {
      kind: "rated";
      review: PatientReviewItem;
    }
  | {
      kind: "needs_rating";
    }
  | {
      kind: "not_available";
    };

function sortSessions(items: SessionListItem[], sortOrder: "newest" | "oldest") {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.scheduledStartAt ?? left.createdAt).getTime();
    const rightTime = new Date(right.scheduledStartAt ?? right.createdAt).getTime();

    if (leftTime !== rightTime) {
      return sortOrder === "newest" ? rightTime - leftTime : leftTime - rightTime;
    }

    return sortOrder === "newest"
      ? right.sessionCode.localeCompare(left.sessionCode)
      : left.sessionCode.localeCompare(right.sessionCode);
  });
}

function getCopy(t: ReturnType<typeof useTranslations>) {
  return {
    eyebrow: t("list.eyebrow"),
    title: t("list.title"),
    note: t("list.note"),
    paymentExpiredNote: t("list.paymentExpiredNote"),
    summaryLabel: t("list.summaryLabel"),
    sortLabel: t("list.sortLabel"),
    sortNewest: t("list.sortNewest"),
    sortOldest: t("list.sortOldest"),
    pageLabel: (page: number, totalPages: number) => t("list.pageLabel", { page, totalPages }),
    loading: t("list.loading"),
    emptyTitle: t("list.emptyHeading"),
    emptyNote: t("list.emptyNote"),
    emptyAction: t("list.emptyAction"),
    emptyTabTitle: t("list.emptyTabTitle"),
    emptyTabNote: t("list.emptyTabNote"),
    errorTitle: t("list.errorHeading"),
    errorNote: t("list.errorNote"),
    retry: t("list.retry"),
    rowsPerPage: t("list.rowsPerPage"),
    expiredPaymentBadge: t("list.expiredPaymentBadge"),
    table: {
      reference: t("list.table.reference"),
      practitioner: t("list.table.practitioner"),
      scheduledAt: t("list.table.scheduledAt"),
      duration: t("list.table.duration"),
      status: t("list.table.status"),
      actions: t("list.table.actions"),
      open: t("list.table.open"),
      noSchedule: t("list.table.noSchedule"),
    },
    tabs: {
      all: t("list.tabs.all"),
      needsRating: t("list.tabs.needsRating"),
      upcoming: t("list.tabs.upcoming"),
      completed: t("list.tabs.completed"),
      cancelled: t("list.tabs.cancelled"),
    },
    reviewStatus: {
      label: t("list.reviewStatus.label"),
      rated: t("list.reviewStatus.rated"),
      needsRating: t("list.reviewStatus.needsRating"),
      notAvailable: t("list.reviewStatus.notAvailable"),
      rateSession: t("list.reviewStatus.rateSession"),
      yourRating: (rating: string) => t("list.reviewStatus.yourRating", { rating }),
    },
    needsRatingEmptyHeading: t("list.needsRatingEmptyHeading"),
    needsRatingEmptyNote: t("list.needsRatingEmptyNote"),
    summary: {
      total: { label: t("list.summaryCards.total.label"), hint: t("list.summaryCards.total.hint") },
      action: { label: t("list.summaryCards.action.label"), hint: t("list.summaryCards.action.hint") },
      active: { label: t("list.summaryCards.active.label"), hint: t("list.summaryCards.active.hint") },
      expired: { label: t("list.summaryCards.expired.label"), hint: t("list.summaryCards.expired.hint") },
      history: { label: t("list.summaryCards.history.label"), hint: t("list.summaryCards.history.hint") },
    },
  };
}

function TablePagination({
  page,
  totalPages,
  onPageChange,
  pageLabel,
  locale,
}: {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  pageLabel: (page: number, totalPages: number) => string;
  locale: string;
}) {
  const isRtl = locale.startsWith("ar");

  return (
    <div className="flex flex-col gap-3 border-t border-border-light px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-text-secondary">{pageLabel(page, totalPages)}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border-light bg-white px-4 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5"
        >
          {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {isRtl ? "السابق" : "Previous"}
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border-light bg-white px-4 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5"
        >
          {isRtl ? "التالي" : "Next"}
          {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SessionsTimelineSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[26px] border border-border-light bg-surface-secondary p-5 shadow-theme-xs space-y-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="h-10 w-10 shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="h-px bg-border-light/60" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="h-px bg-border-light/60" />
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-9 w-28 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionsLoadingState({ locale }: { locale: string }) {
  const t = useTranslations("sessions");
  const isRtl = locale.startsWith("ar");
  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page" className="overflow-hidden">
        <div className="flex flex-col gap-5">
          <div className="space-y-3">
            <div className="h-3 w-28 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
            <div className="h-8 w-40 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
            <div className="h-4 w-full max-w-3xl rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[22px] border border-border-light bg-white p-4 dark:bg-white/5"
              >
                <div className="h-3 w-20 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
                <div className="mt-3 h-8 w-16 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
                <div className="mt-3 h-3 w-full rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </SurfaceCard>

      <SurfaceToolbar className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-4 w-60 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
          <div className="flex gap-2">
            <div className="h-3 w-24 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
            <div className="h-3 w-12 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
            <div className="h-3 w-28 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
          </div>
        </div>
        <div className="h-11 w-36 rounded-2xl bg-surface-tertiary/80 dark:bg-white/10" />
      </SurfaceToolbar>

      <SessionsTimelineSkeleton />

      <p className={`text-sm text-text-secondary ${isRtl ? "text-right" : ""}`}>
        {t("list.loading")}
      </p>
    </div>
  );
}



export default function PatientSessionsPanel() {
  const t = useTranslations("sessions");
  const reviewT = useTranslations("reviews");
  const locale = useLocale();
  const copy = useMemo(() => getCopy(t), [t]);
  const { user, isInitialized } = useAuthState();
  const reviewQueriesEnabled = isInitialized && Boolean(user);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_LIMIT);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [activeTab, setActiveTab] = useState<
    "all" | "needs-rating" | "upcoming" | "completed" | "cancelled"
  >("all");
  const [ratingSessionId, setRatingSessionId] = useState<string | null>(null);
  const ratingCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: summary } = usePatientSessionSummary();
  const patientProfileQuery = usePatientProfile();
  const patientTimezone = patientProfileQuery.data?.profile.timezone;
  const pendingReviewsQuery = usePendingPatientReviews(
    { page: 1, limit: 100 },
    reviewQueriesEnabled,
  );
  const reviewsQuery = usePatientReviews({ page: 1, limit: 100 }, reviewQueriesEnabled);

  const pendingReviews = pendingReviewsQuery.data?.items ?? [];
  const reviewItems = reviewsQuery.data?.items ?? [];

  const pendingReviewIds = useMemo(
    () => new Set(pendingReviews.map((item) => item.sessionId)),
    [pendingReviews],
  );

  const reviewMap = useMemo(
    () => new Map(reviewItems.map((item) => [item.sessionId, item] as const)),
    [reviewItems],
  );

  const queryParams = useMemo(() => {
    const params: any = {
      page,
      limit: pageSize,
    };

    if (activeTab === "upcoming") {
      params.presentationFilter = "upcoming";
    } else if (activeTab === "completed" || activeTab === "needs-rating") {
      params.presentationFilter = "finished";
    } else if (activeTab === "cancelled") {
      params.status = "CANCELLED";
    }

    return params;
  }, [activeTab, page, pageSize]);

  const { data, isLoading, isError, refetch } = usePatientSessions(queryParams);

  const sessions = useMemo(() => sortSessions(data?.items ?? [], sortOrder), [data?.items, sortOrder]);

  const visibleSessions = useMemo(() => {
    if (activeTab !== "needs-rating") {
      return sessions;
    }

    return sessions.filter((session) => pendingReviewIds.has(session.id));
  }, [activeTab, pendingReviewIds, sessions]);

  const pagination = data?.pagination;

  const handleTabChange = (
    tab: "all" | "needs-rating" | "upcoming" | "completed" | "cancelled",
  ) => {
    setActiveTab(tab);
    setPage(1);
    setRatingSessionId(null);
  };

  const pageSummary = useMemo(() => {
    const countState = (state: SessionStatus) =>
      (data?.items ?? []).filter((item) => item.operational?.state === state).length;
    const countBucket = (bucket: "PENDING" | "ACTIONABLE" | "COMPLETED" | "TERMINAL" | "OTHER") =>
      (data?.items ?? []).filter((item) => item.operational?.timelineBucket === bucket).length;

    return {
      pendingPayment: countState("PENDING_PAYMENT"),
      pendingPractitionerResponse: countState("PENDING_PRACTITIONER_CONFIRMATION"),
      readyToJoin: countState("READY_TO_JOIN"),
      confirmed: countState("UPCOMING"),
      upcoming: countBucket("ACTIONABLE"),
      inProgress: countState("IN_PROGRESS"),
      completed: countBucket("COMPLETED"),
      cancelled: countState("CANCELLED"),
      noShow: (data?.items ?? []).filter((item) => item.operational?.state === "PATIENT_NO_SHOW" || item.operational?.state === "PRACTITIONER_NO_SHOW" || item.operational?.state === "BOTH_NO_SHOW").length,
      expired: countState("EXPIRED"),
      refundPending: 0,
      refunded: 0,
    };
  }, [data?.items]);

  useEffect(() => {
    return () => {
      if (ratingCloseTimerRef.current) {
        clearTimeout(ratingCloseTimerRef.current);
      }
    };
  }, []);

  const selectedPendingReview = useMemo(
    () => pendingReviews.find((item) => item.sessionId === ratingSessionId) ?? null,
    [pendingReviews, ratingSessionId],
  );

  const openRatingModal = (sessionId: string) => {
    setRatingSessionId(sessionId);
  };

  const closeRatingModal = () => {
    if (ratingCloseTimerRef.current) {
      clearTimeout(ratingCloseTimerRef.current);
      ratingCloseTimerRef.current = null;
    }
    setRatingSessionId(null);
  };

  const handleReviewSubmitted = () => {
    if (ratingCloseTimerRef.current) {
      clearTimeout(ratingCloseTimerRef.current);
    }

    ratingCloseTimerRef.current = setTimeout(() => {
      ratingCloseTimerRef.current = null;
      setRatingSessionId(null);
    }, 1400);
  };

  const hasOverallSessions = (summary?.totalItems ?? 0) > 0;
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = summary?.totalItems ?? pagination?.totalItems ?? sessions.length;
  const totalAction =
    summary?.actionRequired ??
    pageSummary.pendingPayment + pageSummary.pendingPractitionerResponse + pageSummary.readyToJoin;
  const totalActive =
    summary?.active ??
    pageSummary.confirmed + pageSummary.upcoming + pageSummary.readyToJoin + pageSummary.inProgress;
  const totalExpired = summary?.paymentExpired ?? pageSummary.expired;
  const totalArchive =
    summary?.history ??
    pageSummary.completed +
      pageSummary.cancelled +
      pageSummary.noShow +
      pageSummary.expired +
      pageSummary.refundPending +
      pageSummary.refunded;

  const TABS = [
    { id: "all", label: copy.tabs.all },
    { id: "needs-rating", label: copy.tabs.needsRating },
    { id: "upcoming", label: copy.tabs.upcoming },
    { id: "completed", label: copy.tabs.completed },
    { id: "cancelled", label: copy.tabs.cancelled },
  ] as const;

  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const columns = useMemo<ColumnDef<SessionListItem>[]>(
    () => [
      {
        id: "sessionCode",
        align: "start",
        header: copy.table.reference,
        cell: (row) => (
          <SessionCodeReference sessionId={row.id} sessionCode={row.sessionCode} href={`/patient/sessions/${row.id}`} copyable />
        ),
      },
      {
        id: "practitioner",
        align: "start",
        header: copy.table.practitioner,
        cell: (row) => (
          <div className="flex items-center gap-3 text-start">
            <Avatar
              src={null}
              name={row.practitioner.displayName ?? row.practitioner.slug}
              size="small"
              className="shrink-0"
            />
            <span className="text-sm font-semibold text-text-primary dark:text-white/95">
              {row.practitioner.displayName ?? row.practitioner.slug}
            </span>
          </div>
        ),
      },
      {
        id: "scheduledStartAt",
        align: "start",
        header: copy.table.scheduledAt,
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {row.scheduledStartAt ? formatPatientDateTime(row.scheduledStartAt, patientTimezone, { locale: numLocale }) : copy.table.noSchedule}
          </span>
        ),
      },
      {
        id: "durationMinutes",
        align: "start",
        header: copy.table.duration,
        cell: (row) => (
          <span className="text-sm text-text-secondary">{t("card.duration", { n: row.durationMinutes })}</span>
        ),
      },
      {
        id: "status",
        align: "start",
        header: copy.table.status,
        cell: (row) => (
          <SessionStatusBadge
            status={row.status}
            operational={row.operational}
            labelOverride={row.status === "EXPIRED" ? copy.expiredPaymentBadge : undefined}
          />
        ),
      },
      {
        id: "reviewStatus",
        align: "start",
        header: copy.reviewStatus.label,
        cell: (row) => {
          const canReview =
            row.actions?.canReview === true && pendingReviewIds.has(row.id);
          const reviewState: SessionReviewVisualState = reviewMap.has(row.id)
            ? { kind: "rated", review: reviewMap.get(row.id)! }
            : canReview
              ? { kind: "needs_rating" }
              : { kind: "not_available" };

          if (reviewState.kind === "rated") {
            return (
              <div className="space-y-1">
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {copy.reviewStatus.rated}
                </span>
                <p className="text-xs text-text-secondary">
                  {copy.reviewStatus.yourRating(String(reviewState.review.overallRating))}
                </p>
              </div>
            );
          }

          if (reviewState.kind === "needs_rating") {
            return (
              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {copy.reviewStatus.needsRating}
              </span>
            );
          }

          return (
            <span className="inline-flex rounded-full bg-surface-tertiary px-2.5 py-1 text-[11px] font-semibold text-text-muted dark:bg-white/5 dark:text-white/60">
              {copy.reviewStatus.notAvailable}
            </span>
          );
        },
      },
      {
        id: "actions",
        align: "end",
        header: "",
        cell: (row) => {
          const needsRating =
            row.actions?.canReview === true &&
            pendingReviewIds.has(row.id) &&
            !reviewMap.has(row.id);

          return (
            <div className="flex items-center justify-end gap-2">
              {needsRating ? (
                <button
                  type="button"
                  onClick={() => openRatingModal(row.id)}
                  className="sawiyaa-btn-press inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                >
                  {copy.reviewStatus.rateSession}
                </button>
              ) : null}

              <Link
                href={`/patient/sessions/${row.id}` as never}
                className="sawiyaa-btn-press inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-surface-tertiary/20 hover:text-primary dark:bg-white/5 dark:text-white/90"
              >
                <span>{copy.table.open}</span>
                {locale === "ar" ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Link>
            </div>
          );
        },
      },
    ],
    [copy, locale, numLocale, pendingReviewIds, reviewMap, t],
  );

  if (isLoading) {
    return <SessionsLoadingState locale={locale} />;
  }

  if (isError) {
    return (
      <StateCard
        title={copy.errorTitle}
        note={copy.errorNote}
        action={{ label: copy.retry, onClick: () => refetch() }}
      />
    );
  }

  const paginationConfig = pagination
    ? {
        page: pagination.page,
        limit: pagination.limit,
        totalItems: pagination.totalItems,
        totalPages: pagination.totalPages,
        hasNextPage: pagination.page < pagination.totalPages,
        hasPrevPage: pagination.page > 1,
      }
    : undefined;

  const dataTableEmptyState =
    activeTab === "needs-rating"
      ? {
          title: copy.needsRatingEmptyHeading,
          description: copy.needsRatingEmptyNote,
        }
      : {
          title: copy.emptyTabTitle,
          description: copy.emptyTabNote,
        };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex items-start justify-between rounded-2xl border border-border-light bg-white p-4 text-start shadow-[0_8px_24px_rgba(36,86,79,0.04)] dark:bg-surface-secondary">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-muted">{copy.summary.total.label}</p>
            <p className="text-2xl font-bold text-text-primary dark:text-white">{totalItems}</p>
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-light">
            <CalendarDays className="h-4 w-4" />
          </span>
        </div>

        <div className="flex items-start justify-between rounded-2xl border border-border-light bg-white p-4 text-start shadow-[0_8px_24px_rgba(36,86,79,0.04)] dark:bg-surface-secondary">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-muted">{copy.summary.action.label}</p>
            <p className="text-2xl font-bold text-warning">{totalAction}</p>
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warning-light text-warning dark:bg-warning/20 dark:text-warning-light">
            <AlertCircle className="h-4 w-4" />
          </span>
        </div>

        <div className="flex items-start justify-between rounded-2xl border border-border-light bg-white p-4 text-start shadow-[0_8px_24px_rgba(36,86,79,0.04)] dark:bg-surface-secondary">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-muted">{copy.summary.active.label}</p>
            <p className="text-2xl font-bold text-success">{totalActive}</p>
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-success-light text-success dark:bg-success/20 dark:text-success-light">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        </div>

        <div className="flex items-start justify-between rounded-2xl border border-border-light bg-white p-4 text-start shadow-[0_8px_24px_rgba(36,86,79,0.04)] dark:bg-surface-secondary">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-muted">{copy.summary.history.label}</p>
            <p className="text-2xl font-bold text-text-primary dark:text-white">{totalArchive}</p>
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/40">
            <History className="h-4 w-4" />
          </span>
        </div>
      </div>

      <section className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary sm:p-6">
        {hasOverallSessions ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-light/60 pb-4">
              <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-tertiary p-1 dark:bg-white/5">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id)}
                      className={`sawiyaa-btn-press inline-flex shrink-0 items-center justify-center rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-white text-text-primary shadow-sm dark:bg-surface-secondary dark:text-white"
                          : "text-text-secondary hover:bg-white/40 hover:text-text-primary dark:hover:bg-white/5"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-text-secondary">
                    {t("list.toolbar.sort")}
                  </span>
                  <select
                    value={sortOrder}
                    onChange={(event) => {
                      setSortOrder(event.target.value as "newest" | "oldest");
                      setPage(1);
                    }}
                    className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-1.5 text-xs font-semibold text-text-primary focus:border-primary focus:ring-1 focus:ring-primary dark:bg-white/5 dark:text-white/90"
                    aria-label={copy.sortLabel}
                  >
                    <option value="newest">{copy.sortNewest}</option>
                    <option value="oldest">{copy.sortOldest}</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-text-secondary">
                    {t("list.toolbar.rows")}
                  </span>
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="rounded-xl border border-border-light bg-surface-tertiary px-3 py-1.5 text-xs font-semibold text-text-primary focus:border-primary focus:ring-1 focus:ring-primary dark:bg-white/5 dark:text-white/90"
                    aria-label={copy.rowsPerPage}
                  >
                    {[10, 20, 50].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
              <p className="font-medium text-text-primary dark:text-white/90">
                {copy.paymentExpiredNote} ( {copy.summary.expired.label}: {String(totalExpired)} )
              </p>
              {pagination?.totalPages && pagination.totalPages > 1 ? (
                <span>{copy.pageLabel(page, pagination.totalPages)}</span>
              ) : null}
            </div>

            <div className="mt-4">
              <DataTable
                data={visibleSessions}
                columns={columns}
                getRowId={(row) => row.id}
                loading={isLoading}
                pagination={paginationConfig}
                onPageChange={(newPage) => setPage(newPage)}
                emptyState={dataTableEmptyState}
              />
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-border-light/60 py-6 text-center">
              <HeartHandshake className="mx-auto mb-3 h-10 w-10 text-primary/80" />
              <h3 className="text-lg font-bold text-text-primary dark:text-white/95">
                {copy.emptyTitle}
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">
                {copy.emptyNote}
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[22px] border border-border-light bg-surface-tertiary/10 p-5 text-start dark:bg-white/5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-text-brand">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                      {t("list.emptyJourney.title")}
                    </p>
                    <p className="text-sm leading-6 text-text-secondary">
                      {t("list.emptyJourney.note")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {(t.raw("list.emptyJourney.steps") as string[]).map((step, index) => (
                    <div
                      key={step}
                      className="rounded-2xl border border-border-light bg-white px-4 py-3 text-sm font-medium text-text-primary dark:bg-gray-800/40"
                    >
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-[22px] border border-border-light bg-primary-light/20 p-5 text-start dark:bg-primary/10">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                    {t("list.emptyJourney.startTitle")}
                  </p>
                  <p className="text-sm leading-6 text-text-secondary">
                    {t("list.emptyJourney.startNote")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    href="/patient/matching"
                    className="sawiyaa-btn-press inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(68,161,148,0.4)] transition hover:-translate-y-0.5 hover:bg-primary-hover"
                  >
                    <Sparkles size={16} />
                    {t("list.emptyJourney.startBooking")}
                  </Link>
                  <Link
                    href="/patient/sessions"
                    className="sawiyaa-btn-press inline-flex items-center justify-center gap-2 rounded-2xl border border-border-light bg-white px-5 py-3 text-sm font-semibold text-text-primary transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:bg-white/5"
                  >
                    <Search size={16} />
                    {t("list.emptyJourney.explore")}
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <Modal
        isOpen={Boolean(selectedPendingReview)}
        onClose={closeRatingModal}
        size="md"
        ariaLabel={reviewT("patient.ratingModal.title")}
      >
        <ModalBody className="p-6 sm:p-7">
          {selectedPendingReview ? (
            <div className="space-y-5">
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold text-text-primary dark:text-white/95">
                  {reviewT("patient.ratingModal.title")}
                </h3>
                <p className="text-sm leading-6 text-[#6B7280] dark:text-gray-300">
                  {reviewT("patient.ratingModal.subtitle")}
                </p>
              </div>

              <PatientSessionReviewCard
                sessionId={selectedPendingReview.sessionId}
                practitionerName={selectedPendingReview.practitioner.displayName}
                completedAt={selectedPendingReview.completedAt}
                hideHeader={true}
                onSubmitted={handleReviewSubmitted}
                onCancel={closeRatingModal}
              />
            </div>
          ) : null}
        </ModalBody>
      </Modal>
    </div>
  );
}
