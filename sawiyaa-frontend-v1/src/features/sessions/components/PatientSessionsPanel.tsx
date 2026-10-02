"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  User,
  Video,
  X,
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
} from "../types/sessions.types";
import SessionCodeReference from "@/components/shared/SessionCodeReference";
import { StateCard } from "@/components/shared/ContentStates";
import { formatPatientDateTime } from "@/lib/time-formatting";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";
import { Skeleton } from "@/components/shared/LoadingStates";

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
    <div className="flex flex-col gap-3 border-t border-border-light/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-text-secondary">{pageLabel(page, totalPages)}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-light bg-white px-3.5 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-secondary cursor-pointer"
        >
          {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          <span>{isRtl ? "السابق" : "Previous"}</span>
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-light bg-white px-3.5 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-secondary cursor-pointer"
        >
          <span>{isRtl ? "التالي" : "Next"}</span>
          {isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function SessionsLoadingState() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 py-6">
      <div className="flex flex-col gap-2 border-b border-border-light/60 pb-4">
        <Skeleton className="h-6 w-36 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function PatientSessionsPanel() {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const { user, isInitialized } = useAuthState();
  const reviewQueriesEnabled = isInitialized && Boolean(user);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_LIMIT);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [activeTab, setActiveTab] = useState<
    "all" | "needs-rating" | "upcoming" | "completed" | "cancelled"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL");
  const [ratingSessionId, setRatingSessionId] = useState<string>(null!);
  const ratingCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: summary } = usePatientSessionSummary();
  const patientProfileQuery = usePatientProfile();
  const patientTimezone = patientProfileQuery.data?.profile.timezone;
  const pendingReviewsQuery = usePendingPatientReviews(
    { page: 1, limit: 100 },
    reviewQueriesEnabled,
  );
  const reviewsQuery = usePatientReviews({ page: 1, limit: 100 }, reviewQueriesEnabled);

  const pendingReviews = useMemo(
    () => pendingReviewsQuery.data?.items ?? [],
    [pendingReviewsQuery.data?.items],
  );
  const reviewItems = useMemo(
    () => reviewsQuery.data?.items ?? [],
    [reviewsQuery.data?.items],
  );

  const pendingReviewIds = useMemo(
    () => new Set(pendingReviews.map((item) => item.sessionId)),
    [pendingReviews],
  );

  const reviewMap = useMemo(
    () => new Map(reviewItems.map((item) => [item.sessionId, item] as const)),
    [reviewItems],
  );

  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      page,
      limit: pageSize,
    };

    if (activeTab === "upcoming") {
      params.presentationFilter = "upcoming";
    } else if (activeTab === "completed") {
      params.status = "COMPLETED";
    } else if (activeTab === "needs-rating") {
      params.presentationFilter = "finished";
    } else if (activeTab === "cancelled") {
      params.status = "CANCELLED";
    }

    return params;
  }, [activeTab, page, pageSize]);

  const { data, isLoading, isError, refetch } = usePatientSessions(queryParams);

  // Extract unique practitioners for filter dropdown
  const uniquePractitioners = useMemo(() => {
    const list = data?.items ?? [];
    const map = new Map<string, string>();
    list.forEach((s) => {
      if (s.practitioner?.id) {
        map.set(s.practitioner.id, s.practitioner.displayName ?? s.practitioner.slug);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data?.items]);

  const sortedSessions = useMemo(() => sortSessions(data?.items ?? [], sortOrder), [data?.items, sortOrder]);

  // Client-side multi-filter: Search + Practitioner + Period + Tab
  const visibleSessions = useMemo(() => {
    let result = sortedSessions;

    if (activeTab === "needs-rating") {
      result = result.filter((session) => pendingReviewIds.has(session.id));
    } else if (activeTab === "completed") {
      result = result.filter((session) => session.operational?.state === "COMPLETED");
    } else if (activeTab === "cancelled") {
      result = result.filter((session) => session.operational?.state === "CANCELLED");
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((session) => {
        const practitionerName = (session.practitioner?.displayName ?? "").toLowerCase();
        const sessionCode = (session.sessionCode ?? "").toLowerCase();
        return practitionerName.includes(q) || sessionCode.includes(q);
      });
    }

    // Practitioner filter
    if (selectedPractitioner !== "ALL") {
      result = result.filter((session) => session.practitioner?.id === selectedPractitioner);
    }

    // Period filter
    if (selectedPeriod !== "ALL") {
      const now = new Date().getTime();
      result = result.filter((session) => {
        const sessionTime = new Date(session.scheduledStartAt ?? session.createdAt).getTime();
        if (selectedPeriod === "THIS_WEEK") {
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          return Math.abs(now - sessionTime) <= sevenDaysMs;
        }
        if (selectedPeriod === "THIS_MONTH") {
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
          return Math.abs(now - sessionTime) <= thirtyDaysMs;
        }
        if (selectedPeriod === "PAST") {
          return sessionTime < now;
        }
        if (selectedPeriod === "FUTURE") {
          return sessionTime >= now;
        }
        return true;
      });
    }

    return result;
  }, [sortedSessions, activeTab, pendingReviewIds, searchQuery, selectedPractitioner, selectedPeriod]);

  const pagination = data?.pagination;

  const handleTabChange = (
    tab: "all" | "needs-rating" | "upcoming" | "completed" | "cancelled",
  ) => {
    setActiveTab(tab);
    setPage(1);
    setRatingSessionId(null!);
  };

  const hasActiveFilters = searchQuery.trim() !== "" || selectedPractitioner !== "ALL" || selectedPeriod !== "ALL";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedPractitioner("ALL");
    setSelectedPeriod("ALL");
  };

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
    setRatingSessionId(null!);
  };

  const handleReviewSubmitted = () => {
    if (ratingCloseTimerRef.current) {
      clearTimeout(ratingCloseTimerRef.current);
    }
    ratingCloseTimerRef.current = setTimeout(() => {
      ratingCloseTimerRef.current = null;
      setRatingSessionId(null!);
    }, 1400);
  };

  const totalPages = pagination?.totalPages ?? 1;

  const TABS: Array<{
    id: "all" | "needs-rating" | "upcoming" | "completed" | "cancelled";
    label: string;
    count?: number | null;
  }> = [
    { id: "all", label: t("list.tabs.all"), count: summary?.totalItems ?? null },
    { id: "upcoming", label: t("list.tabs.upcoming"), count: summary?.upcoming ?? null },
    { id: "needs-rating", label: t("list.tabs.needsRating"), count: pendingReviews.length > 0 ? pendingReviews.length : null },
    { id: "completed", label: t("list.tabs.completed"), count: summary?.completed ?? null },
    { id: "cancelled", label: t("list.tabs.cancelled"), count: summary?.cancelled ?? null },
  ];

  if (isLoading) {
    return <SessionsLoadingState />;
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <StateCard
          title={t("list.errorHeading")}
          note={t("list.errorNote")}
          action={{ label: t("list.retry"), onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:py-7 space-y-5 text-start">
      {/* Header & Quick Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-light/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
            {t("list.title")}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {locale === "ar"
              ? "متابعة مواعيدك القادمة، الانضمام للجلسات المباشرة، وسجل استشاراتك السابقة."
              : t("list.note")}
          </p>
        </div>

        <Link
          href="/patient/practitioners"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.98] self-start sm:self-auto cursor-pointer"
        >
          <Plus size={14} />
          <span>{locale === "ar" ? "حجز جلسة جديدة" : "Book New Session"}</span>
        </Link>
      </div>

      {/* Primary Status Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                isActive
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface-tertiary text-text-secondary hover:bg-border-light hover:text-text-primary dark:bg-white/5"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && tab.count !== undefined && tab.count > 0 ? (
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold font-mono ${
                    isActive
                      ? "bg-white text-primary"
                      : tab.id === "needs-rating"
                        ? "bg-amber-500 text-white"
                        : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Advanced Filter & Search Bar */}
      <div className="rounded-2xl border border-border-light/80 bg-white p-3 sm:p-4 shadow-2xs dark:bg-surface-secondary dark:border-border-dark space-y-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Live Search */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === "ar" ? "ابحث باسم المختص أو كود الجلسة..." : "Search by doctor or code..."}
              className="w-full rounded-xl border border-border-light bg-surface-tertiary/40 py-2 ps-9 pe-8 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Practitioner Filter */}
          <div className="relative">
            <User className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            <select
              value={selectedPractitioner}
              onChange={(e) => setSelectedPractitioner(e.target.value)}
              className="w-full rounded-xl border border-border-light bg-surface-tertiary/40 py-2 ps-9 pe-3 text-xs font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer appearance-none"
            >
              <option value="ALL">{locale === "ar" ? "جميع المختصين" : "All Specialists"}</option>
              {uniquePractitioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="relative">
            <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full rounded-xl border border-border-light bg-surface-tertiary/40 py-2 ps-9 pe-3 text-xs font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer appearance-none"
            >
              <option value="ALL">{locale === "ar" ? "جميع الفترات" : "All Time"}</option>
              <option value="THIS_WEEK">{locale === "ar" ? "خلال هذا الأسبوع" : "This Week"}</option>
              <option value="THIS_MONTH">{locale === "ar" ? "خلال هذا الشهر" : "This Month"}</option>
              <option value="FUTURE">{locale === "ar" ? "المواعيد القادمة فقط" : "Future Only"}</option>
              <option value="PAST">{locale === "ar" ? "الجلسات السابقة فقط" : "Past Only"}</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
              className="w-full rounded-xl border border-border-light bg-surface-tertiary/40 py-2 px-3 text-xs font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer"
            >
              <option value="newest">{t("list.sortNewest")}</option>
              <option value="oldest">{t("list.sortOldest")}</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips & Reset Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-light/60 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-text-muted text-[11px] font-semibold">
                {locale === "ar" ? "الفلاتر النشطة:" : "Active Filters:"}
              </span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  <span>بحث: {searchQuery}</span>
                  <button type="button" onClick={() => setSearchQuery("")} className="hover:opacity-75">
                    <X size={11} />
                  </button>
                </span>
              )}
              {selectedPractitioner !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  <span>المختص: {uniquePractitioners.find((p) => p.id === selectedPractitioner)?.name}</span>
                  <button type="button" onClick={() => setSelectedPractitioner("ALL")} className="hover:opacity-75">
                    <X size={11} />
                  </button>
                </span>
              )}
              {selectedPeriod !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  <span>الفترة المحددة</span>
                  <button type="button" onClick={() => setSelectedPeriod("ALL")} className="hover:opacity-75">
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>{locale === "ar" ? "إعادة ضبط الفلاتر" : "Reset Filters"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Sessions Cards List */}
      {visibleSessions.length > 0 ? (
        <div className="space-y-3">
          {visibleSessions.map((session) => {
            const isJoinable =
              session.actions?.canJoin === true ||
              session.operational?.state === "READY_TO_JOIN";
            const isPayable =
              session.actions?.canPay === true ||
              session.operational?.state === "PENDING_PAYMENT";
            const needsRating =
              session.actions?.canReview === true &&
              pendingReviewIds.has(session.id) &&
              !reviewMap.has(session.id);
            const userReview = reviewMap.get(session.id);

            return (
              <article
                key={session.id}
                className={`group relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 shadow-2xs hover:shadow-xs ${
                  isJoinable
                    ? "border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-700"
                    : isPayable
                      ? "border-amber-300 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-700"
                      : "border-border-light/80 bg-white hover:border-primary/30 dark:bg-surface-secondary dark:border-border-dark"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left Column: Doctor Profile & Schedule Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-surface-secondary shadow-2xs dark:bg-white/5">
                      <PractitionerAvatar
                        src={null}
                        alt={session.practitioner.displayName ?? session.practitioner.slug}
                        initials={session.practitioner.displayName?.slice(0, 2) ?? "DR"}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 dir="auto" className="text-sm sm:text-base font-bold text-text-primary dark:text-white truncate">
                          {session.practitioner.displayName ?? session.practitioner.slug}
                        </h3>
                        <SessionCodeReference
                          sessionId={session.id}
                          sessionCode={session.sessionCode}
                          href={`/patient/sessions/${session.id}`}
                          copyable
                        />
                      </div>

                      {/* Detailed Meta Tags */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-tertiary/60 px-2 py-0.5 font-semibold text-text-primary dark:bg-white/5 dark:text-white/90">
                          <CalendarDays size={12} className="text-primary shrink-0" />
                          <span>
                            {session.scheduledStartAt
                              ? formatPatientDateTime(session.scheduledStartAt, patientTimezone, {
                                  locale: numLocale,
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : t("list.table.noSchedule")}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-tertiary/60 px-2 py-0.5 text-text-muted dark:bg-white/5">
                          <Clock size={11} className="text-primary shrink-0" />
                          <span>{t("card.duration", { n: session.durationMinutes })}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-tertiary/60 px-2 py-0.5 text-text-muted dark:bg-white/5">
                          <Video size={11} className="text-primary shrink-0" />
                          <span>{locale === "ar" ? "فيديو مباشر" : "Live Video"}</span>
                        </span>
                      </div>

                      {/* Rating / Review note if submitted */}
                      {userReview ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 pt-0.5">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          <span>
                            {t("list.reviewStatus.yourRating", { rating: String(userReview.overallRating) })}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Right Column: Status Badge & CTAs */}
                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-border-light/40">
                    <SessionStatusBadge
                      status={session.status}
                      operational={session.operational}
                    />

                    <div className="flex items-center gap-2">
                      {isJoinable ? (
                        <Link
                          href={`/patient/sessions/${session.id}` as any}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-[0.98] animate-pulse"
                        >
                          <Video size={13} />
                          <span>{locale === "ar" ? "ادخل الجلسة الآن" : "Join Now"}</span>
                        </Link>
                      ) : isPayable ? (
                        <Link
                          href={`/patient/sessions/${session.id}/pay` as any}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.98]"
                        >
                          <span>{locale === "ar" ? "إتمام الدفع" : "Complete Payment"}</span>
                        </Link>
                      ) : needsRating ? (
                        <button
                          type="button"
                          onClick={() => openRatingModal(session.id)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200 cursor-pointer"
                        >
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span>{t("list.reviewStatus.rateSession")}</span>
                        </button>
                      ) : null}

                      <Link
                        href={`/patient/sessions/${session.id}` as any}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-border-light bg-[#FCFAF6] px-3.5 py-2 text-xs font-bold text-text-secondary hover:border-primary/40 hover:bg-white hover:text-text-primary transition dark:bg-white/5 dark:border-white/10"
                      >
                        <span>{t("list.table.open")}</span>
                        {locale === "ar" ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={(nextPage) => setPage(nextPage)}
              pageLabel={(p, total) => t("list.pageLabel", { page: p, totalPages: total })}
              locale={locale}
            />
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-border-light/80 bg-white p-8 text-center shadow-xs dark:bg-surface-secondary dark:border-white/10 max-w-lg mx-auto space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20">
            <CalendarDays size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-primary dark:text-white">
              {hasActiveFilters
                ? (locale === "ar" ? "لا توجد جلسات مطابقة للفلاتر المحددة" : "No sessions match the selected filters")
                : activeTab === "needs-rating"
                  ? t("list.needsRatingEmptyHeading")
                  : activeTab === "upcoming"
                    ? t("list.emptyHeading")
                    : t("list.emptyTabTitle")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {hasActiveFilters
                ? (locale === "ar" ? "جرب تغيير مصطلح البحث أو مسح الفلاتر لعرض كافة الجلسات." : "Try clearing or changing your search criteria.")
                : activeTab === "needs-rating"
                  ? t("list.needsRatingEmptyNote")
                  : activeTab === "upcoming"
                    ? t("list.emptyNote")
                    : t("list.emptyTabNote")}
            </p>
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-light bg-white px-4 py-2 text-xs font-bold text-text-primary hover:border-primary transition dark:bg-surface-secondary cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>{locale === "ar" ? "مسح الفلاتر المحددة" : "Clear Filters"}</span>
            </button>
          ) : activeTab === "upcoming" || activeTab === "all" ? (
            <Link
              href="/patient/practitioners"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.98]"
            >
              <span>{locale === "ar" ? "تصفح المختصين وحجز موعد" : "Browse Specialists"}</span>
            </Link>
          ) : null}
        </div>
      )}

      {/* Rating / Review Modal */}
      {selectedPendingReview ? (
        <Modal
          isOpen={Boolean(ratingSessionId)}
          onClose={closeRatingModal}
          size="md"
        >
          <ModalBody className="p-0">
            <PatientSessionReviewCard
              sessionId={selectedPendingReview.sessionId}
              completedAt={selectedPendingReview.completedAt}
              practitionerName={selectedPendingReview.practitioner?.displayName}
              onSubmitted={handleReviewSubmitted}
              onCancel={closeRatingModal}
            />
          </ModalBody>
        </Modal>
      ) : null}
    </div>
  );
}
