"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CircleOff,
  Pencil,
  Plus,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceStatCard } from "@/components/shared/SurfaceShell";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { useAuthState } from "@/stores/auth-store";
import {
  useArchiveAdminAcademyCourse,
  useAdminAcademyCourse,
  usePublishAdminAcademyCourse,
} from "../hooks/use-academy";
import AdminAcademyLectureCreateModal from "./AdminAcademyLectureCreateModal";
import AdminAcademyUpdateModal from "./AdminAcademyUpdateModal";

type Props = {
  courseId: string;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
};

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function formatCurrency(
  amount: string | null | undefined,
  currency: string | null | undefined,
  locale: string,
) {
  if (!amount || !currency) return "-";
  const value = Number(amount);
  if (Number.isNaN(value)) return `${amount} ${currency}`;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPlanValue(value: number | null | undefined, locale: string, unit: string) {
  if (!value || value < 1) return "-";
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(value);
  return `${number} ${unit}`;
}

function getStatusTone(status: string) {
  if (status === "PUBLISHED") return "text-emerald-700 bg-emerald-50";
  if (status === "ARCHIVED") return "text-slate-600 bg-slate-100";
  return "text-amber-700 bg-amber-50";
}

function CopyableLink({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string | null | undefined;
  fallback: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="rounded-2xl border border-border-light bg-surface-tertiary/70 p-4 transition-all duration-200 hover:bg-surface-tertiary dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="min-w-0 break-all text-sm font-semibold text-text-primary dark:text-white/90">
          {value ?? fallback}
        </span>
        {value ? (
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary shadow-sm transition-all hover:bg-surface-tertiary hover:text-text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            title="نسخ الرابط"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminAcademyDetailScreen({ courseId }: Props) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthState();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const courseQuery = useAdminAcademyCourse(courseId);
  const course = courseQuery.data;
  const publishCourse = usePublishAdminAcademyCourse();
  const archiveCourse = useArchiveAdminAcademyCourse();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLectureOpen, setIsLectureOpen] = useState(false);

  const stats = useMemo(
    () => ({
      totalEnrollments: course?.stats?.totalEnrollments ?? 0,
      paidEnrollments: course?.stats?.paidEnrollments ?? 0,
      confirmedEnrollments: course?.stats?.confirmedEnrollments ?? 0,
      pendingPayments: course?.stats?.pendingPayments ?? 0,
      lectureCount: course?.lectures?.length ?? 0,
    }),
    [course],
  );
  const plannedLectureCount = course?.plannedLectureCount ?? 0;
  const lectureCount = course?.lectures?.length ?? 0;
  const canAddLecture =
    Boolean(course?.startsAt && course?.endsAt && course?.plannedDurationDays && course?.plannedLectureCount) &&
    lectureCount < plannedLectureCount;
  const isPublishReady = Boolean(
    course?.startsAt &&
      course?.endsAt &&
      course?.plannedDurationDays &&
      course?.plannedLectureCount &&
      course.plannedDurationDays > 0 &&
      course.plannedLectureCount > 0,
  );
  const lecturePlanReady =
    isPublishReady &&
    typeof course?.plannedLectureCount === "number" &&
    lectureCount === course.plannedLectureCount;
  const missingLectures =
    typeof course?.plannedLectureCount === "number"
      ? Math.max(course.plannedLectureCount - lectureCount, 0)
      : 0;

  const enrollments = course?.enrollments ?? [];
  const lectures = course?.lectures ?? [];

  const handlePublish = async () => {
    if (!course) return;
    if (!lecturePlanReady) {
      setFeedback({
        tone: "error",
        message:
          missingLectures > 0
            ? t("admin.errors.missingLectureSchedule", { count: missingLectures })
            : t("admin.errors.scheduleIncomplete"),
      });
      return;
    }
    setFeedback(null);
    try {
      await publishCourse.mutateAsync(course.id);
      setFeedback({ tone: "success", message: t("admin.detail.actions.publishSuccess") });
    } catch {
      setFeedback({ tone: "error", message: t("admin.detail.actions.failure") });
    }
  };

  const handleArchive = async () => {
    if (!course) return;
    setFeedback(null);
    try {
      await archiveCourse.mutateAsync(course.id);
      setFeedback({ tone: "success", message: t("admin.detail.actions.archiveSuccess") });
      setShowArchiveConfirm(false);
    } catch {
      setFeedback({ tone: "error", message: t("admin.detail.actions.failure") });
    }
  };

  if (courseQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-[32px] border border-border-light bg-white/80" />
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="h-[30rem] animate-pulse rounded-[32px] border border-border-light bg-white/80" />
          <div className="h-[30rem] animate-pulse rounded-[32px] border border-border-light bg-white/80" />
        </div>
      </div>
    );
  }

  if (courseQuery.isError) {
    return (
      <StateCard
        title={t("errors.loadFailed")}
        note={t("errors.generic")}
        action={{
          label: t("errors.retry"),
          onClick: () => courseQuery.refetch(),
        }}
        className="rounded-[32px]"
      />
    );
  }

  if (!course) {
    return (
      <StateCard
        title={t("admin.detail.notFound.title")}
        note={t("admin.detail.notFound.note")}
        action={{
          label: t("admin.detail.notFound.back"),
          href: (
            <button
              type="button"
              onClick={() => router.push("/admin/academy" as never)}
              className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-5 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("admin.detail.notFound.back")}
            </button>
          ),
        }}
        className="rounded-[32px]"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SurfaceCard as="section" variant="page">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              {t("admin.detail.badge")}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
                {course.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                {course.shortDescription ?? t("admin.detail.noShortDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                  course.status ?? "DRAFT",
                )}`}
              >
                {t(`statuses.course.${course.status ?? "DRAFT"}` as Parameters<typeof t>[0])}
              </span>
              <span className="rounded-full bg-brand-25 px-3 py-1 text-xs font-semibold text-text-brand">
                {t(`statuses.visibility.${course.visibility ?? "PUBLIC"}` as Parameters<typeof t>[0])}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SurfaceStatCard
              label={t("admin.detail.stats.totalEnrollments")}
              value={String(stats.totalEnrollments)}
              tone="primary"
            />
            <SurfaceStatCard
              label={t("admin.detail.stats.paidEnrollments")}
              value={String(stats.paidEnrollments)}
              tone="success"
            />
            <SurfaceStatCard
              label={t("admin.detail.stats.confirmedEnrollments")}
              value={String(stats.confirmedEnrollments)}
              tone="brand"
            />
            <SurfaceStatCard
              label={t("admin.detail.stats.pendingPayments")}
              value={String(stats.pendingPayments)}
              tone="warning"
            />
            <SurfaceStatCard
              label={t("admin.detail.stats.lecturesCreated")}
              value={String(stats.lectureCount)}
              tone="brand"
            />
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr] items-start">
        {/* Main Column */}
        <div className="space-y-6">
          <SurfaceCard variant="section" className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{t("admin.detail.sections.course")}</h2>
                <p className="mt-1 text-sm text-text-secondary">{t("admin.detail.update.note")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    startIcon={<Pencil className="h-4 w-4" />}
                    onClick={() => setIsEditOpen(true)}
                  >
                    {t("admin.detail.update.open")}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="primary"
                  startIcon={<BadgeCheck className="h-4 w-4" />}
                  onClick={handlePublish}
                  disabled={publishCourse.isPending || course.status === "PUBLISHED" || !isPublishReady}
                >
                  {publishCourse.isPending
                    ? t("admin.detail.actions.publishing")
                    : t("admin.detail.actions.publish")}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  startIcon={<CircleOff className="h-4 w-4" />}
                  onClick={() => setShowArchiveConfirm(true)}
                  disabled={archiveCourse.isPending || course.status === "ARCHIVED"}
                >
                  {archiveCourse.isPending
                    ? t("admin.detail.actions.archiving")
                    : t("admin.detail.actions.archive")}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border-light bg-surface-tertiary p-5">
              <p className="text-sm leading-7 text-text-secondary">
                {course.fullDescription ?? course.shortDescription ?? t("admin.detail.noShortDescription")}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-text-secondary">
                <span className="rounded-full border border-border-light bg-white px-3 py-1.5">
                  {t(`statuses.course.${course.status ?? "DRAFT"}` as Parameters<typeof t>[0])}
                </span>
                <span className="rounded-full border border-border-light bg-white px-3 py-1.5">
                  {t(`statuses.visibility.${course.visibility ?? "PUBLIC"}` as Parameters<typeof t>[0])}
                </span>
              </div>
            </div>

            {feedback ? (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  feedback.tone === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}
          </SurfaceCard>

          {!lecturePlanReady ? (
            <div className="flex items-center gap-3 rounded-[24px] border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="font-medium">
                {missingLectures > 0
                  ? t("admin.errors.missingLectureSchedule", { count: missingLectures })
                  : t("admin.errors.scheduleIncomplete")}
              </div>
            </div>
          ) : null}

          <SurfaceCard variant="section" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{t("admin.detail.sections.lectures")}</h2>
                <p className="mt-1 text-sm text-text-secondary">{t("admin.detail.lectures.note")}</p>
              </div>
              {canManage ? (
                <Button
                  size="sm"
                  variant="primary"
                  startIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setIsLectureOpen(true)}
                  disabled={!canAddLecture}
                >
                  {t("admin.detail.lectures.open")}
                </Button>
              ) : null}
            </div>

            {lectures.length > 0 ? (
              <DataTable
                data={lectures}
                columns={[
                  {
                    id: "lectureOrder",
                    header: t("admin.detail.lectures.columns.order"),
                    accessor: (row) => row.lectureOrder,
                    cell: (row) => (
                      <span className="rounded-full bg-brand-25 px-2.5 py-1 text-xs font-semibold text-text-brand">
                        {row.lectureOrder}
                      </span>
                    ),
                  },
                  {
                    id: "lectureTitle",
                    header: t("admin.detail.lectures.columns.title"),
                    accessor: (row) => row.lectureTitle ?? "",
                    cell: (row) => (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {row.lectureTitle ?? t("admin.detail.lectures.noTitle")}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "startsAt",
                    header: t("admin.detail.lectures.columns.startsAt"),
                    accessor: (row) => new Date(row.startsAt).getTime(),
                    hideOnMobile: true,
                    cell: (row) => formatDateTime(row.startsAt, locale),
                  },
                  {
                    id: "endsAt",
                    header: t("admin.detail.lectures.columns.endsAt"),
                    accessor: (row) => new Date(row.endsAt).getTime(),
                    hideOnMobile: true,
                    cell: (row) => formatDateTime(row.endsAt, locale),
                  },
                ]}
                getRowId={(row) => row.id}
                loading={false}
                ariaLabel={t("admin.detail.lectures.heading")}
                caption={t("admin.detail.lectures.heading")}
              />
            ) : (
              <StateCard
                title={t("admin.detail.lectures.empty.heading")}
                note={t("admin.detail.lectures.empty.note")}
                action={
                  canManage
                    ? {
                        label: t("admin.detail.lectures.open"),
                        onClick: () => setIsLectureOpen(true),
                      }
                    : undefined
                }
                className="rounded-[24px]"
              />
            )}
          </SurfaceCard>

          <SurfaceCard variant="section" className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">{t("admin.detail.sections.enrollments")}</h2>
            {enrollments.length > 0 ? (
              <DataTable
                data={enrollments}
                columns={[
                  {
                    id: "learner",
                    header: t("admin.detail.enrollments.columns.learner"),
                    accessor: (row) => row.learner.fullName,
                    cell: (row) => (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {row.learner.fullName}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">{row.learner.phoneNumber}</p>
                        {row.learner.email ? (
                          <p className="mt-1 text-xs text-text-muted">{row.learner.email}</p>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    id: "status",
                    header: t("admin.detail.enrollments.columns.status"),
                    accessor: (row) => row.enrollmentStatus,
                    cell: (row) => (
                      <span className="rounded-full bg-brand-25 px-2.5 py-1 text-xs font-semibold text-text-brand">
                        {t(`statuses.enrollment.${row.enrollmentStatus}` as Parameters<typeof t>[0])}
                      </span>
                    ),
                  },
                  {
                    id: "paymentStatus",
                    header: t("admin.detail.enrollments.columns.paymentStatus"),
                    accessor: (row) => row.paymentStatus ?? "",
                    cell: (row) =>
                      row.paymentStatus ? (
                        <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-semibold text-text-primary">
                          {t(`statuses.payment.${row.paymentStatus}` as Parameters<typeof t>[0])}
                        </span>
                      ) : (
                        "-"
                      ),
                  },
                  {
                    id: "registeredAt",
                    header: t("admin.detail.enrollments.columns.registeredAt"),
                    accessor: (row) => new Date(row.registeredAt).getTime(),
                    hideOnMobile: true,
                    cell: (row) => formatDateTime(row.registeredAt, locale),
                  },
                  {
                    id: "reference",
                    header: t("admin.detail.enrollments.columns.reference"),
                    accessor: (row) => row.publicAccessToken,
                    hideOnMobile: true,
                    cell: (row) => (
                      <span className="font-mono text-xs text-text-muted">
                        {row.publicAccessToken}
                      </span>
                    ),
                  },
                ]}
                getRowId={(row) => row.id}
                loading={false}
                ariaLabel={t("admin.detail.enrollments.heading")}
                caption={t("admin.detail.enrollments.heading")}
              />
            ) : (
              <StateCard
                title={t("admin.detail.enrollments.empty.heading")}
                note={t("admin.detail.enrollments.empty.note")}
                className="rounded-[24px]"
              />
            )}
          </SurfaceCard>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <SurfaceCard variant="section" className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">{t("admin.detail.sections.courseSummary")}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("admin.detail.summary.price")}</div>
                <div className="font-semibold text-text-primary">
                  {formatCurrency(course.priceAmount ?? null, course.currencyCode ?? null, locale) === "-"
                    ? t("admin.list.free")
                    : formatCurrency(course.priceAmount ?? null, course.currencyCode ?? null, locale)}
                </div>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("admin.detail.summary.priceEgp")}</div>
                <div className="font-semibold text-text-primary">
                  {course.priceAmountEgp
                    ? formatCurrency(course.priceAmountEgp, "EGP", locale)
                    : t("admin.detail.summary.notSet")}
                </div>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("admin.detail.summary.priceUsd")}</div>
                <div className="font-semibold text-text-primary">
                  {course.priceAmountUsd
                    ? formatCurrency(course.priceAmountUsd, "USD", locale)
                    : t("admin.detail.summary.notSet")}
                </div>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("admin.detail.summary.startsAt")}</div>
                <div className="font-semibold text-text-primary">
                  {formatDateTime(course.startsAt, locale)}
                </div>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("admin.detail.summary.endsAt")}</div>
                <div className="font-semibold text-text-primary">
                  {formatDateTime(course.endsAt, locale)}
                </div>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("admin.detail.summary.duration")}</div>
                <div className="font-semibold text-text-primary">
                  {formatPlanValue(
                    course.plannedDurationDays,
                    locale,
                    t("admin.detail.summary.daysUnit"),
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("admin.detail.summary.lectures")}</div>
                <div className="font-semibold text-text-primary">
                  {formatPlanValue(
                    course.plannedLectureCount,
                    locale,
                    t("admin.detail.summary.lectureUnit"),
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("admin.detail.summary.lecturesCreated")}</div>
                <div className="font-semibold text-text-primary">
                  {`${new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
                    lectureCount,
                  )} ${t("admin.detail.summary.lectureUnit")}`}
                </div>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm col-span-full">
                <div className="text-xs text-text-muted">{t("admin.detail.summary.updatedAt")}</div>
                <div className="font-semibold text-text-primary">
                  {formatDateTime(course.updatedAt, locale)}
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard variant="section" className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">{t("admin.detail.sections.join")}</h2>
            <p className="text-sm text-text-secondary">{t("admin.detail.join.note")}</p>
            <div className="space-y-3">
              <CopyableLink
                label={t("admin.detail.join.meetingUrl")}
                value={course.meetingUrl}
                fallback={t("admin.detail.join.none")}
              />
              <CopyableLink
                label={t("admin.detail.join.whatsappGroupUrl")}
                value={course.whatsappGroupUrl}
                fallback={t("admin.detail.join.none")}
              />
            </div>
          </SurfaceCard>
        </div>
      </div>

      {canManage ? (
        <AdminAcademyUpdateModal
          isOpen={isEditOpen}
          course={course}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => courseQuery.refetch()}
        />
      ) : null}

      {canManage ? (
        <AdminAcademyLectureCreateModal
          isOpen={isLectureOpen}
          course={course}
          onClose={() => setIsLectureOpen(false)}
          onSuccess={() => courseQuery.refetch()}
        />
      ) : null}

      <DestructiveConfirmModal
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        size="sm"
        title={t("admin.detail.actions.archiveConfirm.title")}
        description={t("admin.detail.actions.archiveConfirm.description")}
        confirmLabel={archiveCourse.isPending ? t("admin.detail.actions.archiving") : t("admin.detail.actions.archive")}
        cancelLabel={t("admin.detail.actions.archiveConfirm.cancel")}
        onConfirm={handleArchive}
        loading={archiveCourse.isPending}
      >
        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800">
          <p className="font-medium">{course.title}</p>
        </div>
      </DestructiveConfirmModal>
    </div>
  );
}
