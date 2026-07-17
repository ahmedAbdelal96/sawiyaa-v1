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
  SessionPresentationStatus,
  SessionStatus,
} from "../types/sessions.types";
import type { PatientReviewItem } from "@/features/reviews/types/reviews.types";
import { StateCard } from "@/components/shared/ContentStates";
import {
  SurfaceCard,
  SurfaceToolbar,
} from "@/components/shared/SurfaceShell";
import { formatViewerDateTime } from "@/lib/time-formatting";
import Avatar from "@/components/ui/avatar/Avatar";
import { Skeleton } from "@/components/shared/LoadingStates";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";

function formatScheduledAt(isoString: string | null, numLocale: string): string {
  return formatViewerDateTime(isoString, { locale: numLocale });
}

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

function getCopy(locale: string) {
  if (locale === "ar") {
    return {
      eyebrow: "جدول الجلسات",
      title: "جلساتي",
      note: "الترتيب الافتراضي يظهر الجلسات الأحدث أولاً، ويمكنك تغيير الترتيب من القائمة.",
      paymentExpiredNote: "الجلسات التي انتهت مهلة دفعها تظهر كحالة مستقلة، وليست جلسات منتهية.",
      summaryLabel: "إجمالي الجلسات",
      sortLabel: "ترتيب الجلسات",
      sortNewest: "الأحدث أولاً",
      sortOldest: "الأقدم أولاً",
      pageLabel: (page: number, totalPages: number) => `الصفحة ${page} من ${totalPages}`,
      loading: "جارٍ تحميل الجلسات...",
      emptyTitle: "لا توجد جلسات بعد",
      emptyNote: "ابدأ بالمطابقة الموجهة أو احجز جلسة مع أحد المختصين، وستظهر هنا.",
      emptyAction: "تواصل للمختص المناسب",
      emptyTabTitle: "لا توجد جلسات في هذا القسم",
      emptyTabNote: "لا توجد جلسات تطابق هذا التصنيف حالياً.",
      errorTitle: "تعذّر تحميل الجلسات",
      errorNote: "يرجى تحديث الصفحة والمحاولة مجددًا.",
      retry: "إعادة المحاولة",
      rowsPerPage: "الجلسات في الصفحة",
      expiredPaymentBadge: "انتهت مهلة الدفع",
      table: {
        reference: "المرجع",
        practitioner: "المعالج",
        scheduledAt: "الموعد",
        duration: "المدة",
        status: "الحالة",
        actions: "الإجراء",
        open: "عرض التفاصيل",
        noSchedule: "لم يُحدد الموعد بعد",
      },
      tabs: {
        all: "الكل",
        needsRating: "تحتاج تقييم",
        upcoming: "النشطة والقادمة",
        completed: "المكتملة",
        cancelled: "الملغاة",
      },
      reviewStatus: {
        label: "حالة التقييم",
        rated: "تم التقييم",
        needsRating: "تحتاج تقييم",
        notAvailable: "غير متاح",
        rateSession: "قيّم الجلسة",
        yourRating: "تقييمك: {rating} من 5",
      },
      needsRatingEmptyHeading: "لا توجد جلسات تحتاج تقييم الآن",
      needsRatingEmptyNote: "ستظهر هنا الجلسات المكتملة التي ما زالت تنتظر تقييمك.",
      summary: {
        total: {
          label: "الإجمالي",
          hint: "كل الجلسات المرتبطة بحسابك.",
        },
        action: {
          label: "بحاجة إجراء",
          hint: "انتظار دفع أو تأكيد أو فتح الجلسة.",
        },
        active: {
          label: "نشطة",
          hint: "جلسات مؤكدة أو قريبة أو جارية.",
        },
        expired: {
          label: "مهلة الدفع انتهت",
          hint: "حجز لم يكتمل في الوقت المحدد.",
        },
        history: {
          label: "الأرشيف",
          hint: "الجلسات المنتهية وغير النشطة.",
        },
      },
    };
  }

  return {
    eyebrow: "Session dashboard",
    title: "My Sessions",
    note: "A clear layout that defaults to newest sessions first, while letting you change the order from the toolbar.",
    paymentExpiredNote: "Sessions with expired payment windows appear as their own state, not as finished sessions.",
    summaryLabel: "Total sessions",
    sortLabel: "Sort sessions",
    sortNewest: "Newest first",
    sortOldest: "Oldest first",
    pageLabel: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
    loading: "Loading sessions...",
    emptyTitle: "No sessions yet",
    emptyNote: "Start with guided matching or book a session with a practitioner, and it will appear here.",
    emptyAction: "Start guided matching",
    emptyTabTitle: "No sessions in this section",
    emptyTabNote: "There are no sessions matching this category right now.",
    errorTitle: "Could not load sessions",
    errorNote: "Please try refreshing the page.",
    retry: "Try again",
    rowsPerPage: "Sessions per page",
    expiredPaymentBadge: "Payment time expired",
    table: {
      reference: "Reference",
      practitioner: "Practitioner",
      scheduledAt: "Scheduled",
      duration: "Duration",
      status: "Status",
      actions: "Actions",
      open: "View details",
      noSchedule: "Not scheduled yet",
    },
    tabs: {
      all: "All",
      needsRating: "Needs rating",
      upcoming: "Active & Upcoming",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    reviewStatus: {
      label: "Review status",
      rated: "Rated",
      needsRating: "Not rated yet",
      notAvailable: "Not available",
      rateSession: "Rate session",
      yourRating: "Your rating: {rating}/5",
    },
    needsRatingEmptyHeading: "No sessions need a rating right now",
    needsRatingEmptyNote: "Completed sessions that are still waiting for your feedback will appear here.",
    summary: {
      total: {
        label: "Total",
        hint: "All sessions linked to your account.",
      },
      action: {
        label: "Needs action",
        hint: "Waiting for payment, confirmation, or entry.",
      },
      active: {
        label: "Active",
        hint: "Confirmed, upcoming, or live sessions.",
      },
      expired: {
        label: "Payment expired",
        hint: "The booking did not complete in time.",
      },
      history: {
        label: "Archive",
        hint: "Finished and inactive sessions.",
      },
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
        {isRtl ? "جارٍ تجهيز جلساتك..." : "Preparing your sessions..."}
      </p>
    </div>
  );
}



export default function PatientSessionsPanel() {
  const t = useTranslations("sessions");
  const reviewT = useTranslations("reviews");
  const locale = useLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
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
    const countStatus = (statuses: SessionStatus[]) => {
      const statusSet = new Set(statuses);
      return (data?.items ?? []).filter((item) => statusSet.has(item.status)).length;
    };
    const countPres = (statuses: SessionPresentationStatus[]) => {
      const statusSet = new Set(statuses);
      return (data?.items ?? []).filter((item) => statusSet.has(item.presentationStatus)).length;
    };

    return {
      pendingPayment: countStatus(["PENDING_PAYMENT"]),
      pendingPractitionerResponse: countStatus(["PENDING_PRACTITIONER_CONFIRMATION"]),
      readyToJoin: countPres(["READY_TO_JOIN"]),
      confirmed: countStatus(["UPCOMING"]),
      upcoming: countStatus(["UPCOMING"]),
      inProgress: countStatus(["IN_PROGRESS"]),
      completed: countStatus(["COMPLETED"]),
      cancelled: countStatus(["CANCELLED"]),
      noShow: countStatus(["PATIENT_NO_SHOW", "PRACTITIONER_NO_SHOW", "BOTH_NO_SHOW"]),
      expired: countStatus(["EXPIRED"]),
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
          <span className="rounded bg-surface-tertiary/60 px-2 py-0.5 font-mono text-xs font-semibold text-text-muted">
            {row.sessionCode}
          </span>
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
            {row.scheduledStartAt ? formatScheduledAt(row.scheduledStartAt, numLocale) : copy.table.noSchedule}
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
            presentationStatus={row.presentationStatus}
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
                  {copy.reviewStatus.yourRating.replace(
                    "{rating}",
                    String(reviewState.review.overallRating),
                  )}
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
                    {locale === "ar" ? "الترتيب:" : "Sort:"}
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
                    {locale === "ar" ? "عدد الصفوف:" : "Rows:"}
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
                {locale === "ar" ? "لا توجد جلسات بعد" : "No sessions yet"}
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">
                {locale === "ar"
                  ? "ابدأ بالحجز أو ابحث عن مختص مناسب، وستظهر جلساتك هنا."
                  : "Book your first session or find the right practitioner, and your timeline will appear here."}
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
                      {locale === "ar" ? "كيف تبدأ" : "How to get started"}
                    </p>
                    <p className="text-sm leading-6 text-text-secondary">
                      {locale === "ar"
                        ? "ابحث عن مختص مناسب، راجع التفاصيل، واحجز في خطوة واحدة."
                        : "Find the right practitioner, review the details, and book in one step."}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    locale === "ar" ? "بحث" : "Search",
                    locale === "ar" ? "مقارنة" : "Compare",
                    locale === "ar" ? "حجز" : "Book",
                  ].map((step, index) => (
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
                    {locale === "ar" ? "ابدأ من هنا" : "Start here"}
                  </p>
                  <p className="text-sm leading-6 text-text-secondary">
                    {locale === "ar"
                      ? "ستظهر أولى جلساتك هنا، ثم يمكنك متابعة كل حالة في مكان واحد."
                      : "Your first session will appear here, then you can track every status in one place."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    href="/patient/matching"
                    className="sawiyaa-btn-press inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(68,161,148,0.4)] transition hover:-translate-y-0.5 hover:bg-primary-hover"
                  >
                    <Sparkles size={16} />
                    {locale === "ar" ? "ابدأ الحجز" : "Start booking"}
                  </Link>
                  <Link
                    href="/patient/sessions"
                    className="sawiyaa-btn-press inline-flex items-center justify-center gap-2 rounded-2xl border border-border-light bg-white px-5 py-3 text-sm font-semibold text-text-primary transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:bg-white/5"
                  >
                    <Search size={16} />
                    {locale === "ar" ? "استعرض الجلسات" : "Explore sessions"}
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
