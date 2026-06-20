"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  History,
  Search,
  Sparkles,
} from "lucide-react";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import {
  usePatientSessionSummary,
  usePatientSessions,
} from "../hooks/use-sessions";
import SessionStatusBadge from "./SessionStatusBadge";
import type {
  SessionListItem,
  SessionPresentationStatus,
  SessionStatus,
} from "../types/sessions.types";
import { StateCard } from "@/components/shared/ContentStates";
import {
  SurfaceCard,
  SurfaceHeader,
  SurfaceStatCard,
  SurfaceToolbar,
} from "@/components/shared/SurfaceShell";
import { formatViewerDateTime } from "@/lib/time-formatting";
import Avatar from "@/components/ui/avatar/Avatar";
import { Skeleton } from "@/components/shared/LoadingStates";

function formatScheduledAt(isoString: string | null, numLocale: string): string {
  return formatViewerDateTime(isoString, { locale: numLocale });
}

function getBucket(presentationStatus: SessionPresentationStatus) {
  if (presentationStatus === "JOINABLE" || presentationStatus === "IN_PROGRESS") return "live";
  if (presentationStatus === "UPCOMING" || presentationStatus === "UNAVAILABLE") return "action";
  return "archive";
}

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
        upcoming: "النشطة والقادمة",
        completed: "المكتملة",
        cancelled: "الملغاة",
      },
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
      upcoming: "Active & Upcoming",
      completed: "Completed",
      cancelled: "Cancelled",
    },
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

function SessionsEmptyState({ locale }: { locale: string }) {
  const isRtl = locale.startsWith("ar");
  const primaryCta = (
    <Link
      href="/patient/matching"
      className="sawiyaa-btn-press inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(68,161,148,0.4)] transition hover:bg-primary-hover hover:-translate-y-0.5"
    >
      <Sparkles size={16} />
      {locale === "ar" ? "ابدأ الحجز" : "Start booking"}
    </Link>
  );

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page" className="overflow-hidden">
        <SurfaceHeader
          eyebrow={locale === "ar" ? "جدول الجلسات" : "Session dashboard"}
          title={locale === "ar" ? "لا توجد جلسات بعد" : "No sessions yet"}
          description={
            locale === "ar"
              ? "ابدأ جلسة جديدة أو ابحث عن مختص مناسب، وستبدأ هنا بتسلسل واضح بالجلسات والارشيف."
              : "Book your first session or find the right practitioner, and your timeline will appear here."
          }
          meta={
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SurfaceStatCard
                label={locale === "ar" ? "الإجمالي" : "Total"}
                value="0"
                hint={locale === "ar" ? "لا يوجد اي جلسات مبكرة" : "No bookings yet."}
                tone="neutral"
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={locale === "ar" ? "بحاجة إجراء" : "Needs action"}
                value="0"
                hint={locale === "ar" ? "لا يوجد أي سداد قائم" : "Nothing pending."}
                tone="warning"
                icon={<AlertCircle className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={locale === "ar" ? "نشطة" : "Active"}
                value="0"
                hint={locale === "ar" ? "ستظهر هنا الجلسات المؤكدة" : "Confirmed sessions will appear here."}
                tone="success"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={locale === "ar" ? "الأرشيف" : "Archive"}
                value="0"
                hint={locale === "ar" ? "السبل والمنتهية" : "Past sessions will collect here."}
                tone="neutral"
                icon={<History className="h-4 w-4" />}
              />
            </div>
          }
        />
      </SurfaceCard>

      <SurfaceToolbar className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[22px] border border-border-light bg-white p-5 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-text-brand">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                {locale === "ar" ? "كيف تبدأ بسرعة" : "How to get started"}
              </p>
              <p className="text-sm leading-6 text-text-secondary">
                {locale === "ar"
                  ? "ابحث عن الممارس المناسب، راجع التفاصيل، ثم احجز في خطوة واحدة."
                  : "Find the right practitioner, review the details, and book in one step."}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              locale === "ar" ? "ابحث" : "Search",
              locale === "ar" ? "قارن" : "Compare",
              locale === "ar" ? "احجز" : "Book",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-border-light bg-surface-tertiary/40 px-4 py-3 text-sm font-medium text-text-primary dark:bg-white/5"
              >
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-[22px] border border-border-light bg-primary-light/40 p-5 dark:bg-primary/10">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
              {locale === "ar" ? "ابدأ من هنا" : "Start here"}
            </p>
            <p className="text-sm leading-6 text-text-secondary">
              {locale === "ar"
                ? "أول جلسة ستظهر هنا فور الحجز، ثم تتابع حالتها في مكان واحد."
                : "Your first session will appear here, then you can track every status in one place."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {primaryCta}
            <Link
              href="/patient/sessions"
              className="sawiyaa-btn-press inline-flex items-center justify-center gap-2 rounded-2xl border border-border-light bg-white px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary hover:-translate-y-0.5 dark:bg-white/5"
            >
              <Search size={16} />
              {locale === "ar" ? "استكشف الجلسات" : "Explore sessions"}
            </Link>
          </div>
        </div>
      </SurfaceToolbar>
    </div>
  );
}

function PatientSessionTimelineCard({
  session,
  locale,
  t,
  copy,
}: {
  session: SessionListItem;
  locale: string;
  t: any;
  copy: any;
}) {
  const isRtl = locale.startsWith("ar");
  const bucket = getBucket(session.presentationStatus);

  const borderTone =
    session.presentationStatus === "UNAVAILABLE"
      ? "border-s-warning-500"
      : bucket === "action"
        ? "border-s-warning-500"
        : bucket === "live"
          ? "border-s-primary"
          : "border-s-text-muted";

  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <SurfaceCard
      variant="compact"
      className={`border-s-4 ${borderTone} sawiyaa-hover-lift sawiyaa-animate-fade-in transition-all duration-300`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Avatar
            src={null}
            alt={session.practitioner.displayName ?? session.practitioner.slug}
            size="medium"
            className="shrink-0"
          />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("card.with")} {session.practitioner.displayName ?? session.practitioner.slug}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              <span className="font-mono text-text-muted bg-surface-tertiary/60 px-2 py-0.5 rounded">
                {session.sessionCode}
              </span>
              <span aria-hidden="true" className="text-border-light">•</span>
              <span>{t(`detail.mode.${session.sessionMode}` as any)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SessionStatusBadge
            status={session.status}
            presentationStatus={session.presentationStatus}
            labelOverride={
              session.status === "EXPIRED" ? copy.expiredPaymentBadge : undefined
            }
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-border-light/60 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-2 text-sm text-text-primary dark:text-white/90">
          <CalendarDays className="h-4 w-4 shrink-0 text-text-muted" />
          <span>
            {session.scheduledStartAt
              ? formatScheduledAt(session.scheduledStartAt, numLocale)
              : copy.table.noSchedule}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-primary dark:text-white/90">
          <Clock className="h-4 w-4 shrink-0 text-text-muted" />
          <span>{t("card.duration", { n: session.durationMinutes })}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border-light/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-secondary leading-normal">
          {t(`list.presentationHints.${session.presentationStatus}` as any)}
        </p>

        <Link
          href={`/patient/sessions/${session.id}` as never}
          className="sawiyaa-btn-press inline-flex items-center justify-center gap-1.5 rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:bg-surface-tertiary/20 hover:text-primary dark:bg-white/5 dark:text-white/90 shrink-0 self-end sm:self-auto hover:-translate-y-0.5"
        >
          <span>{copy.table.open}</span>
          {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Link>
      </div>
    </SurfaceCard>
  );
}

export default function PatientSessionsPanel() {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_LIMIT);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");

  const { data: summary } = usePatientSessionSummary();

  const queryParams = useMemo(() => {
    const params: any = {
      page,
      limit: pageSize,
    };
    if (activeTab === "upcoming") {
      params.presentationFilter = "upcoming";
    } else if (activeTab === "completed") {
      params.presentationFilter = "finished";
    } else if (activeTab === "cancelled") {
      params.status = "CANCELLED";
    }
    return params;
  }, [page, pageSize, activeTab]);

  const { data, isLoading, isError, refetch } = usePatientSessions(queryParams);

  const sessions = useMemo(
    () => sortSessions(data?.items ?? [], sortOrder),
    [data?.items, sortOrder],
  );
  const pagination = data?.pagination;

  const handleTabChange = (tab: "all" | "upcoming" | "completed" | "cancelled") => {
    setActiveTab(tab);
    setPage(1);
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
      pendingPractitionerResponse: countStatus(["PENDING_PRACTITIONER_RESPONSE"]),
      readyToJoin: countPres(["JOINABLE"]),
      confirmed: countStatus(["CONFIRMED"]),
      upcoming: countStatus(["UPCOMING"]),
      inProgress: countStatus(["IN_PROGRESS"]),
      completed: countStatus(["COMPLETED"]),
      cancelled: countStatus(["CANCELLED"]),
      noShow: countStatus(["NO_SHOW"]),
      expired: countStatus(["EXPIRED"]),
      refundPending: countStatus(["REFUND_PENDING"]),
      refunded: countStatus(["REFUNDED"]),
    };
  }, [data?.items]);

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

  const hasOverallSessions = (summary?.totalItems ?? 0) > 0;

  if (sessions.length === 0 && activeTab === "all" && !hasOverallSessions) {
    return <SessionsEmptyState locale={locale} />;
  }

  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = summary?.totalItems ?? pagination?.totalItems ?? sessions.length;
  const totalAction = summary?.actionRequired ?? pageSummary.pendingPayment + pageSummary.pendingPractitionerResponse + pageSummary.readyToJoin;
  const totalActive =
    summary?.active ??
    pageSummary.confirmed + pageSummary.upcoming + pageSummary.readyToJoin + pageSummary.inProgress;
  const totalExpired = summary?.paymentExpired ?? pageSummary.expired;
  const totalArchive = summary?.history ?? pageSummary.completed + pageSummary.cancelled + pageSummary.noShow + pageSummary.expired + pageSummary.refundPending + pageSummary.refunded;

  const TABS = [
    { id: "all", label: copy.tabs.all },
    { id: "upcoming", label: copy.tabs.upcoming },
    { id: "completed", label: copy.tabs.completed },
    { id: "cancelled", label: copy.tabs.cancelled },
  ] as const;

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page" className="overflow-hidden">
        <SurfaceHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.note}
          meta={
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SurfaceStatCard
                label={copy.summary.total.label}
                value={String(totalItems)}
                hint={copy.summary.total.hint}
                tone="primary"
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={copy.summary.action.label}
                value={String(totalAction)}
                hint={copy.summary.action.hint}
                tone="warning"
                icon={<AlertCircle className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={copy.summary.active.label}
                value={String(totalActive)}
                hint={copy.summary.active.hint}
                tone="success"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={copy.summary.history.label}
                value={String(totalArchive)}
                hint={copy.summary.history.hint}
                tone="neutral"
                icon={<History className="h-4 w-4" />}
              />
            </div>
          }
        />
      </SurfaceCard>

      {/* Tab Segment Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-[20px] bg-surface-tertiary/60 p-1.5 dark:bg-white/5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`sawiyaa-btn-press inline-flex items-center justify-center rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-all duration-200 shrink-0 ${
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

      <SurfaceToolbar className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text-primary dark:text-white/90">
            {copy.paymentExpiredNote}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
            <span>
              {copy.summary.expired.label}: {String(totalExpired)}
            </span>
            <span aria-hidden="true" className="text-border-light">•</span>
            <span>{copy.pageLabel(page, totalPages)}</span>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <label className="flex w-full flex-col gap-1 sm:w-auto">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {copy.sortLabel}
            </span>
            <select
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value as "newest" | "oldest");
                setPage(1);
              }}
              className="app-control h-11 min-w-[170px] px-3 py-2"
              aria-label={copy.sortLabel}
            >
              <option value="newest">{copy.sortNewest}</option>
              <option value="oldest">{copy.sortOldest}</option>
            </select>
          </label>

          <label className="flex w-full flex-col gap-1 sm:w-auto">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {copy.rowsPerPage}
            </span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="app-control h-11 min-w-[120px] px-3 py-2"
              aria-label={copy.rowsPerPage}
            >
              {[10, 20, 50].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SurfaceToolbar>

      {sessions.length === 0 ? (
        <StateCard
          title={copy.emptyTabTitle}
          note={copy.emptyTabNote}
          centered={true}
          className="sawiyaa-animate-fade-in"
        />
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <PatientSessionTimelineCard
              key={session.id}
              session={session}
              locale={locale}
              t={t}
              copy={copy}
            />
          ))}

          {totalPages > 1 ? (
            <div className="rounded-[28px] border border-border-light bg-white shadow-theme-xs dark:bg-white/5">
              <TablePagination
                page={page}
                totalPages={totalPages}
                onPageChange={(nextPage) => {
                  if (nextPage < 1 || nextPage > totalPages) return;
                  setPage(nextPage);
                }}
                pageLabel={copy.pageLabel}
                locale={locale}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
