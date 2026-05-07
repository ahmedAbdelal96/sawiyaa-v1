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
import type { SessionListItem, SessionStatus } from "../types/sessions.types";
import { StateCard } from "@/components/shared/ContentStates";
import {
  SurfaceCard,
  SurfaceHeader,
  SurfaceStatCard,
  SurfaceToolbar,
} from "@/components/shared/SurfaceShell";

const ACTION_REQUIRED_STATUSES = new Set<SessionStatus>([
  "PENDING_PAYMENT",
  "PENDING_PRACTITIONER_RESPONSE",
  "READY_TO_JOIN",
  "EXPIRED",
]);

const LIVE_STATUSES = new Set<SessionStatus>([
  "CONFIRMED",
  "UPCOMING",
  "IN_PROGRESS",
]);

function formatScheduledAt(isoString: string | null, numLocale: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(numLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

function getBucket(status: SessionStatus) {
  if (ACTION_REQUIRED_STATUSES.has(status)) return "action";
  if (LIVE_STATUSES.has(status)) return "live";
  return "archive";
}

function sortSessions(items: SessionListItem[]) {
  return [...items].sort((left, right) => {
    const bucketRank = { action: 0, live: 1, archive: 2 } as const;
    const leftBucket = getBucket(left.status);
    const rightBucket = getBucket(right.status);

    if (bucketRank[leftBucket] !== bucketRank[rightBucket]) {
      return bucketRank[leftBucket] - bucketRank[rightBucket];
    }

    const leftTime = left.scheduledStartAt ? new Date(left.scheduledStartAt).getTime() : 0;
    const rightTime = right.scheduledStartAt ? new Date(right.scheduledStartAt).getTime() : 0;

    if (leftBucket === "archive") {
      return rightTime - leftTime;
    }

    return leftTime - rightTime;
  });
}

function getCopy(locale: string) {
  if (locale === "ar") {
    return {
      eyebrow: "جدول الجلسات",
      title: "جلساتي",
      note:
        "ترتيب واضح يبرز الحالات التي تحتاج إجراء أولًا، ثم الجلسات النشطة، ثم الأرشيف من الأحدث إلى الأقدم.",
      paymentExpiredNote:
        "الجلسات التي انتهت مهلة دفعها تظهر كحالة مستقلة، وليست جلسات منتهية.",
      summaryLabel: "إجمالي الجلسات",
      pageLabel: (page: number, totalPages: number) => `الصفحة ${page} من ${totalPages}`,
      loading: "جارٍ تحميل الجلسات...",
      emptyTitle: "لا توجد جلسات بعد",
      emptyNote:
        "ابدأ بالمطابقة الموجهة أو احجز جلسة مع أحد المختصين، وستظهر هنا.",
      emptyAction: "تواصل للمختص المناسب",
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
    note:
      "A clear layout that puts action-needed sessions first, then active sessions, then the archive from newest to oldest.",
    paymentExpiredNote:
      "Sessions with expired payment windows appear as their own state, not as finished sessions.",
    summaryLabel: "Total sessions",
    pageLabel: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
    loading: "Loading sessions...",
    emptyTitle: "No sessions yet",
    emptyNote:
      "Start with guided matching or book a session with a practitioner, and it will appear here.",
    emptyAction: "Start guided matching",
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

function countStatuses(items: SessionListItem[], statuses: SessionStatus[]) {
  const statusSet = new Set(statuses);
  return items.filter((item) => statusSet.has(item.status)).length;
}

function SessionsTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-[28px] border border-border-light bg-white shadow-theme-xs dark:bg-white/5">
      <div className="overflow-hidden">
        <div className="border-b border-border-light px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
              <div className="h-4 w-56 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
            </div>
            <div className="h-10 w-32 rounded-2xl bg-surface-tertiary/80 dark:bg-white/10" />
          </div>
        </div>
        <div className="divide-y divide-border-light">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-6">
              <div className="space-y-2 lg:col-span-1">
                <div className="h-3 w-20 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
                <div className="h-4 w-28 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <div className="h-3 w-16 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
                <div className="h-4 w-full max-w-[18rem] rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
              </div>
              <div className="space-y-2 lg:col-span-1">
                <div className="h-3 w-14 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
                <div className="h-4 w-24 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
              </div>
              <div className="space-y-2 lg:col-span-1">
                <div className="h-3 w-20 rounded-full bg-surface-tertiary/80 dark:bg-white/10" />
                <div className="h-7 w-28 rounded-2xl bg-surface-tertiary/80 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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

      <SessionsTableSkeleton />

      <p className={`text-sm text-text-secondary ${isRtl ? "text-right" : ""}`}>
        {isRtl ? "Ø¬Ø§Ø±Ù ØªØ¬Ù‡ÙŠØ² Ø¬Ù„Ø³Ø§ØªÙƒ..." : "Preparing your sessions..."}
      </p>
    </div>
  );
}

function SessionsEmptyState({ locale }: { locale: string }) {
  const isRtl = locale.startsWith("ar");
  const primaryCta = (
    <Link
      href="/patient/matching"
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(68,161,148,0.4)] transition hover:bg-primary-hover"
    >
      <Sparkles size={16} />
      {locale === "ar" ? "Ø§Ø¨Ø¯Ø£ Ø§Ù„Ø­Ø¬Ø²" : "Start booking"}
    </Link>
  );

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page" className="overflow-hidden">
        <SurfaceHeader
          eyebrow={locale === "ar" ? "Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø¬Ù„Ø³Ø§Øª" : "Session dashboard"}
          title={locale === "ar" ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø§Øª Ø¨Ø¹Ø¯" : "No sessions yet"}
          description={
            locale === "ar"
              ? "Ø§Ø¨Ø¯Ø£ Ø¬Ù„Ø³Ø© Ø¬Ø¯ÙŠØ¯Ø© Ø£Ùˆ Ø§Ø¨Ø­Ø« Ø¹Ù† Ù…Ø®ØªØµ Ù…Ù†Ø§Ø³Ø¨ØŒ ÙˆØ³ØªØ¨Ø¯Ø£ Ù‡Ù†Ø§ Ø¨ØªØ³Ù„Ø³Ù„ ÙˆØ§Ø¶Ø­ Ø¨Ø§Ù„Ø¬Ù„Ø³Ø§Øª ÙˆØ§Ù„Ø§Ø±Ø´ÙŠÙ."
              : "Book your first session or find the right practitioner, and your timeline will appear here."
          }
          meta={
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SurfaceStatCard
                label={locale === "ar" ? "Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ" : "Total"}
                value="0"
                hint={locale === "ar" ? "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø§ÙŠ Ø¬Ù„Ø³Ø§Øª Ù…Ø¨ÙƒØ±Ø©" : "No bookings yet."}
                tone="neutral"
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={locale === "ar" ? "Ø¨Ø­Ø§Ø¬Ø© Ø¥Ø¬Ø±Ø§Ø¡" : "Needs action"}
                value="0"
                hint={locale === "ar" ? "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø£ÙŠ Ø³Ø¯Ø§Ø¯ Ù‚Ø§Ø¦Ù…" : "Nothing pending."}
                tone="warning"
                icon={<AlertCircle className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={locale === "ar" ? "Ù†Ø´Ø·Ø©" : "Active"}
                value="0"
                hint={locale === "ar" ? "Ø³ØªØ¸Ù‡Ø± Ù‡Ù†Ø§ Ø§Ù„Ø¬Ù„Ø³Ø§Øª Ø§Ù„Ù…Ø¤ÙƒØ¯Ø©" : "Confirmed sessions will appear here."}
                tone="success"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={locale === "ar" ? "Ø§Ù„Ø£Ø±Ø´ÙŠÙ" : "Archive"}
                value="0"
                hint={locale === "ar" ? "Ø§Ù„Ø³Ø¨Ù„ ÙˆØ§Ù„Ù…Ù†ØªÙ‡ÙŠØ©" : "Past sessions will collect here."}
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border-light bg-white px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5"
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

export default function PatientSessionsPanel() {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_LIMIT);

  const { data: summary } = usePatientSessionSummary();
  const { data, isLoading, isError, refetch } = usePatientSessions({
    page,
    limit: pageSize,
  });

  const sessions = useMemo(() => sortSessions(data?.items ?? []), [data?.items]);
  const pagination = data?.pagination;

  const pageSummary = useMemo(
    () => ({
      pendingPayment: countStatuses(sessions, ["PENDING_PAYMENT"]),
      pendingPractitionerResponse: countStatuses(sessions, ["PENDING_PRACTITIONER_RESPONSE"]),
      readyToJoin: countStatuses(sessions, ["READY_TO_JOIN"]),
      confirmed: countStatuses(sessions, ["CONFIRMED"]),
      upcoming: countStatuses(sessions, ["UPCOMING"]),
      inProgress: countStatuses(sessions, ["IN_PROGRESS"]),
      completed: countStatuses(sessions, ["COMPLETED"]),
      cancelled: countStatuses(sessions, ["CANCELLED"]),
      noShow: countStatuses(sessions, ["NO_SHOW"]),
      expired: countStatuses(sessions, ["EXPIRED"]),
      refundPending: countStatuses(sessions, ["REFUND_PENDING"]),
      refunded: countStatuses(sessions, ["REFUNDED"]),
    }),
    [sessions],
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

  if (sessions.length === 0) {
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

      <SurfaceToolbar className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text-primary dark:text-white/90">
            {copy.paymentExpiredNote}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
            <span>
              {copy.summary.expired.label}: {String(totalExpired)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{copy.pageLabel(page, totalPages)}</span>
          </div>
        </div>

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
      </SurfaceToolbar>

      <section className="overflow-hidden rounded-[28px] border border-border-light bg-white shadow-theme-xs dark:bg-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-light">
            <thead className="bg-surface-tertiary/60 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {copy.table.reference}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {copy.table.practitioner}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {copy.table.scheduledAt}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {copy.table.duration}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {copy.table.status}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {copy.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {sessions.map((session) => {
                const bucket = getBucket(session.status);
                const rowTone =
                  session.status === "EXPIRED"
                    ? "bg-warning-50/50 dark:bg-warning-500/10"
                    : bucket === "action"
                      ? "bg-warning-50/40 dark:bg-warning-500/5"
                      : bucket === "live"
                        ? "bg-primary-light/10 dark:bg-primary/5"
                        : "bg-transparent";

                return (
                  <tr
                    key={session.id}
                    className={`transition hover:bg-surface-secondary/40 ${rowTone}`}
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="font-mono text-xs tracking-[0.12em] text-text-muted">
                        {session.sessionCode}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-primary dark:text-white/95">
                          {t("card.with")} {session.practitioner.displayName ?? session.practitioner.slug}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-start gap-2 text-sm text-text-primary dark:text-white/90">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                        <span>
                          {session.scheduledStartAt
                            ? formatScheduledAt(
                                session.scheduledStartAt,
                                locale === "ar" ? "ar-SA" : "en-US",
                              )
                            : copy.table.noSchedule}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2 text-sm text-text-primary dark:text-white/90">
                        <Clock className="h-4 w-4 shrink-0 text-text-muted" />
                        <span>{t("card.duration", { n: session.durationMinutes })}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <SessionStatusBadge
                        status={session.status}
                        labelOverride={
                          session.status === "EXPIRED" ? copy.expiredPaymentBadge : undefined
                        }
                      />
                      <div className="mt-2 text-xs leading-5 text-text-secondary">
                        {t(`list.runtimeHints.${session.status}` as Parameters<typeof t>[0])}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <Link
                        href={`/patient/sessions/${session.id}` as never}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-border-light bg-white px-3 py-2 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5"
                      >
                        {copy.table.open}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
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
        ) : null}
      </section>
    </div>
  );
}
