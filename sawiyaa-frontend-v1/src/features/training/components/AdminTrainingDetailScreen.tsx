"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CheckCircle2,
  CircleOff,
  BookOpenText,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceStatCard } from "@/components/shared/SurfaceShell";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import Button from "@/components/ui/button/Button";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { useAuthState } from "@/stores/auth-store";
import { toAppError } from "@/lib/api/errors";
import {
  useAdminTraining,
  useAdminTrainingAnalytics,
  useAdminTrainingPaymentAttempts,
  useAdminTrainingSchedules,
  useArchiveAdminTraining,
  useCreateAdminTrainingSchedule,
  usePublishAdminTraining,
  useUpdateAdminTraining,
} from "../hooks/use-training";
import { getAdminTrainingErrorKey } from "../lib/admin-training-errors";
import AdminTrainingScheduleCreateModal from "./AdminTrainingScheduleCreateModal";
import AdminTrainingScheduleLectureCreateModal from "./AdminTrainingScheduleLectureCreateModal";
import AdminTrainingPaymentAttemptsModal from "./AdminTrainingPaymentAttemptsModal";
import AdminTrainingUpdateModal from "./AdminTrainingUpdateModal";
import AdminTrainingScheduleEnrollmentsModal from "./AdminTrainingScheduleEnrollmentsModal";
import AdminTrainingScheduleLecturesModal from "./AdminTrainingScheduleLecturesModal";
import AdminTrainingScheduleUpdateModal from "./AdminTrainingScheduleUpdateModal";
import {
  formatTrainingDatetime,
  getScheduleStatusTone,
  getStatusToneClasses,
} from "./training-utils";
import type {
  AdminTrainingSchedule,
  AdminTrainingAnalyticsCohortItem,
  AdminTrainingItem,
  TrainingSchedule,
} from "../types/training.types";

type Props = {
  trainingId: string;
};

type Feedback = { tone: "success" | "error"; message: string };

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className="text-sm text-text-primary dark:text-white/90">{value}</span>
    </div>
  );
}

function SummaryCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
        {title}
      </h2>
      {note ? <p className="mt-1 text-sm leading-6 text-text-secondary">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </SurfaceCard>
  );
}

function OperationalCard({
  label,
  title,
  note,
  tone = "neutral",
}: {
  label: string;
  title: string;
  note: string;
  tone?: "neutral" | "brand" | "primary" | "success" | "warning";
}) {
  return (
    <SurfaceStatCard label={label} value={title} hint={note} tone={tone} />
  );
}

function ScheduleCard({
  schedule,
  analytics,
  trainingId,
  onOpenLectures,
  onOpenCreateLecture,
}: {
  schedule: AdminTrainingSchedule;
  analytics?: AdminTrainingAnalyticsCohortItem | null;
  trainingId: string;
  onOpenLectures: (schedule: AdminTrainingSchedule) => void;
  onOpenCreateLecture: (schedule: AdminTrainingSchedule) => void;
}) {
  const t = useTranslations("training");
  const locale = useLocale();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isEnrollmentsModalOpen, setIsEnrollmentsModalOpen] = useState(false);
  const occupiedSeats =
    schedule.maxEnrollments !== null && schedule.availableSeats !== null
      ? Math.max(0, schedule.maxEnrollments - schedule.availableSeats)
      : null;

  return (
    <div className="rounded-[24px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusToneClasses(
                getScheduleStatusTone(schedule.status),
              )}`}
            >
              {t(`statuses.schedule.${schedule.status}` as Parameters<typeof t>[0])}
            </span>
            {schedule.isEnrollmentOpen ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                {t("admin.detail.schedules.enrollmentOpen")}
              </span>
            ) : (
              <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-muted dark:bg-white/10 dark:text-white/70">
                {t("admin.detail.schedules.enrollmentClosed")}
              </span>
            )}
            {occupiedSeats !== null ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-primary/20">
                {t("admin.detail.schedules.occupiedSeats", { value: occupiedSeats })}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
            {t("admin.detail.schedules.scheduleCode", { code: schedule.scheduleCode })}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
            <span>
              {t("admin.detail.schedules.startsAt")}:{" "}
              {formatTrainingDatetime(schedule.startsAt, locale) || "-"}
            </span>
            <span>
              {t("admin.detail.schedules.endsAt")}:{" "}
              {formatTrainingDatetime(schedule.endsAt, locale) || "-"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
            <span>
              {t("admin.detail.schedules.enrollmentWindow", {
                start: schedule.enrollmentOpenAt
                  ? formatTrainingDatetime(schedule.enrollmentOpenAt, locale)
                  : "-",
                end: schedule.enrollmentCloseAt
                  ? formatTrainingDatetime(schedule.enrollmentCloseAt, locale)
                  : "-",
              })}
            </span>
            <span>
              {t("admin.detail.schedules.capacity", {
                available: schedule.availableSeats ?? 0,
                total: schedule.maxEnrollments ?? "-",
              })}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsEnrollmentsModalOpen(true)}
            startIcon={<Users className="h-3.5 w-3.5" />}
          >
            {t("admin.detail.schedules.viewEnrollments")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenLectures(schedule)}
            startIcon={<BookOpenText className="h-3.5 w-3.5" />}
          >
            {t("admin.detail.schedules.viewLectures")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenCreateLecture(schedule)}
            startIcon={<Plus className="h-3.5 w-3.5" />}
          >
            {t("admin.detail.scheduleLectures.create.open")}
          </Button>
          <ActionIconButton
            type="button"
            intent="edit"
            onClick={() => setIsUpdateModalOpen(true)}
            label={t("admin.detail.schedules.edit")}
            icon={<Pencil className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailRow
          label={t("admin.detail.schedules.fields.status")}
          value={t(`statuses.schedule.${schedule.status}` as Parameters<typeof t>[0])}
        />
        <DetailRow
          label={t("admin.detail.schedules.fields.externalProvider")}
          value={
            schedule.externalRoomProvider
              ? t(`admin.detail.schedules.providers.${schedule.externalRoomProvider.toLowerCase()}` as Parameters<typeof t>[0])
              : t("admin.detail.schedules.providers.none")
          }
        />
        <DetailRow
          label={t("admin.detail.schedules.fields.lectures")}
          value={t("admin.detail.schedules.lectureSummary", {
            total: schedule.lectureCount ?? 0,
          })}
        />
        <DetailRow
          label={t("admin.detail.schedules.fields.lecturePlan")}
          value={
            schedule.isLecturePlanComplete
              ? t("admin.detail.schedules.planComplete")
              : t("admin.detail.schedules.planIncomplete")
          }
        />
      </div>

      {analytics ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailRow
            label={t("admin.detail.analytics.cohortEnrollments")}
            value={t("admin.detail.analytics.cohortEnrollmentsValue", {
              value: analytics.totalEnrollments,
            })}
          />
          <DetailRow
            label={t("admin.detail.analytics.cohortConversion")}
            value={t("admin.detail.analytics.percentage", {
              value: analytics.paymentConversionRate,
            })}
          />
          <DetailRow
            label={t("admin.detail.analytics.cohortAttendance")}
            value={t("admin.detail.analytics.percentage", {
              value: analytics.attendanceCompletionRate,
            })}
          />
          <DetailRow
            label={t("admin.detail.analytics.cohortFailures")}
            value={t("admin.detail.analytics.cohortFailuresValue", {
              value: analytics.failedPaymentAttempts,
            })}
          />
        </div>
      ) : null}

      <AdminTrainingScheduleUpdateModal
        isOpen={isUpdateModalOpen}
        trainingId={trainingId}
        schedule={schedule}
        onClose={() => setIsUpdateModalOpen(false)}
        onSuccess={() => {
          setIsUpdateModalOpen(false);
        }}
      />

      <AdminTrainingScheduleEnrollmentsModal
        isOpen={isEnrollmentsModalOpen}
        trainingId={trainingId}
        schedule={schedule}
        onClose={() => setIsEnrollmentsModalOpen(false)}
      />
    </div>
  );
}

export default function AdminTrainingDetailScreen({ trainingId }: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const { user } = useAuthState();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const trainingQuery = useAdminTraining(trainingId, locale);
  const schedulesQuery = useAdminTrainingSchedules(trainingId);
  const analyticsQuery = useAdminTrainingAnalytics(trainingId);
  const updateTraining = useUpdateAdminTraining();
  const publishTraining = usePublishAdminTraining();
  const archiveTraining = useArchiveAdminTraining();
  const createSchedule = useCreateAdminTrainingSchedule();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCreateScheduleModalOpen, setIsCreateScheduleModalOpen] = useState(false);
  const [activeLecturesSchedule, setActiveLecturesSchedule] =
    useState<AdminTrainingSchedule | null>(null);
  const [activeLectureCreateSchedule, setActiveLectureCreateSchedule] =
    useState<AdminTrainingSchedule | null>(null);
  const [showPaymentAttempts, setShowPaymentAttempts] = useState(false);

  const item = trainingQuery.data;
  const scheduleItems = schedulesQuery.data?.items ?? [];
  const paymentAttemptsQuery = useAdminTrainingPaymentAttempts(item?.id ?? null, {
    page: 1,
    limit: 100,
  });
  const failedPaymentAttempts = useMemo(() => {
    const attempts = paymentAttemptsQuery.data?.items ?? [];
    return attempts.filter((attempt) =>
      ["FAILED", "EXPIRED", "CANCELLED", "REQUIRES_ACTION"].includes(attempt.status),
    );
  }, [paymentAttemptsQuery.data?.items]);
  const scheduleSnapshotItems: TrainingSchedule[] =
    schedulesQuery.data?.items ?? item?.schedules ?? [];
  const cohortAnalyticsByScheduleId = useMemo(() => {
    return (analyticsQuery.data?.cohorts ?? []).reduce<Record<string, AdminTrainingAnalyticsCohortItem>>(
      (acc, cohort) => {
        acc[cohort.scheduleId] = cohort;
        return acc;
      },
      {},
    );
  }, [analyticsQuery.data?.cohorts]);
  const actionState = useMemo(() => {
    if (!item) {
      return {
        canPublish: false,
        canArchive: false,
        publishBlockedByMissingSchedule: false,
      };
    }
    const hasSchedules = scheduleSnapshotItems.length > 0;
    return {
      canPublish: item.status === "DRAFT" && hasSchedules,
      canArchive: item.status === "DRAFT" || item.status === "PUBLISHED",
      publishBlockedByMissingSchedule:
        item.status === "DRAFT" && !hasSchedules,
    };
  }, [item, scheduleSnapshotItems.length]);
  const trainingStats = useMemo(() => {
    const totalSchedules = scheduleSnapshotItems.length;
    const openSchedules = scheduleSnapshotItems.filter((schedule) => schedule.isEnrollmentOpen).length;
    const endedSchedules = scheduleSnapshotItems.filter((schedule) =>
      ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(schedule.status),
    ).length;
    const totalLectures = scheduleSnapshotItems.reduce(
      (sum, schedule) => sum + (schedule.lectureCount ?? 0),
      0,
    );
    const totalPlannedLectures = scheduleSnapshotItems.reduce(
      (sum, schedule) => sum + (schedule.plannedLectureCount ?? 0),
      0,
    );
    const totalPlannedDurationDays = scheduleSnapshotItems.reduce(
      (sum, schedule) => sum + (schedule.plannedDurationDays ?? 0),
      0,
    );
    const completeSchedules = scheduleSnapshotItems.filter(
      (schedule) => schedule.isLecturePlanComplete,
    ).length;
    const totalCapacity = scheduleSnapshotItems.reduce(
      (sum, schedule) => sum + (schedule.maxEnrollments ?? 0),
      0,
    );
    const occupiedSeats = scheduleSnapshotItems.reduce((sum, schedule) => {
      if (schedule.maxEnrollments === null || schedule.availableSeats === null) {
        return sum;
      }
      return sum + Math.max(0, schedule.maxEnrollments - schedule.availableSeats);
    }, 0);

    return {
      totalSchedules,
      openSchedules,
      endedSchedules,
      totalLectures,
      totalPlannedLectures,
      totalPlannedDurationDays,
      completeSchedules,
      totalCapacity,
      occupiedSeats,
    };
  }, [scheduleSnapshotItems]);

  const handlePublish = async () => {
    if (!item) return;
    if (scheduleSnapshotItems.length === 0) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.actions.publishBlocked.note"),
      });
      return;
    }
    setFeedback(null);
    try {
      await publishTraining.mutateAsync({ trainingId: item.id, locale });
      setFeedback({ tone: "success", message: t("admin.detail.actions.publishSuccess") });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminTrainingErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  const handleArchive = async () => {
    if (!item) return;
    setFeedback(null);
    try {
      await archiveTraining.mutateAsync({ trainingId: item.id, locale });
      setFeedback({ tone: "success", message: t("admin.detail.actions.archiveSuccess") });
      return true;
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminTrainingErrorKey(error) as Parameters<typeof t>[0]),
      });
      return false;
    }
  };

  if (trainingQuery.isLoading) {
    return (
      <div className="space-y-5">
        <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
          <ListStateSkeleton items={1} heightClass="h-28" />
        </SurfaceCard>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
          <div className="space-y-5">
            <ListStateSkeleton items={3} heightClass="h-52" />
          </div>
          <div className="space-y-5">
            <ListStateSkeleton items={3} heightClass="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (trainingQuery.isError || !item) {
    const error = trainingQuery.error ? toAppError(trainingQuery.error) : null;
    const isNotFound =
      error?.statusCode === 404 || error?.code === "TRAINING_NOT_FOUND";

    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          title={
            isNotFound
              ? t("admin.detail.states.notFound.heading")
              : t("admin.detail.states.error.heading")
          }
          note={
            isNotFound
              ? t("admin.detail.states.notFound.note")
              : t("admin.detail.states.error.note")
          }
          action={{
            label: t("admin.detail.states.error.back"),
            href: (
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {!isNotFound ? (
                  <button
                    type="button"
                    onClick={() => trainingQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
                  >
                    {t("admin.detail.states.error.retry")}
                  </button>
                ) : null}
                <Link
                  href="/admin/training"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  {t("admin.detail.states.error.back")}
                </Link>
              </div>
            ),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
        <ActionIconLink
          href="/admin/training"
          intent="view"
          label={t("admin.detail.back")}
          icon={<DirectionalArrowIcon direction="back" className="h-4 w-4" />}
          className="mb-3"
        />

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("admin.detail.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {item.title}
            </h1>
            <div className="mt-3 h-px w-16 bg-border-light dark:bg-white/10" />
            <p className="mt-3 max-w-2xl text-sm text-text-secondary">{t("admin.detail.note")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusToneClasses(
                item.status === "PUBLISHED"
                  ? "emerald"
                  : item.status === "DRAFT"
                    ? "amber"
                    : "slate",
              )}`}
            >
              {t(`statuses.course.${item.status}` as Parameters<typeof t>[0])}
            </span>
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              {t(`statuses.visibility.${item.visibility}` as Parameters<typeof t>[0])}
            </span>
          </div>
        </div>
      </SurfaceCard>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-700/30 dark:bg-green-900/10 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-5">
          <SummaryCard
            title={t("admin.detail.sections.program")}
            note={t("admin.detail.details.note")}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailRow
                label={t("admin.detail.fields.status")}
                value={t(`statuses.course.${item.status}` as Parameters<typeof t>[0])}
              />
              <DetailRow
                label={t("admin.detail.fields.visibility")}
                value={t(`statuses.visibility.${item.visibility}` as Parameters<typeof t>[0])}
              />
              <DetailRow
                label={t("admin.detail.fields.courseType")}
                value={t(`courseTypes.${item.courseType}` as Parameters<typeof t>[0])}
              />
              <DetailRow
                label={t("admin.detail.fields.locale")}
                value={item.locale}
              />
              <DetailRow
                label={t("admin.detail.fields.slug")}
                value={item.slug}
              />
              <DetailRow
                label={t("admin.detail.fields.scheduleCount")}
                value={`${scheduleItems.length}`}
              />
              <DetailRow
                label={t("admin.detail.fields.publishedAt")}
                value={item.publishedAt ? formatDateTime(item.publishedAt, locale) : "-"}
              />
              <DetailRow
                label={t("admin.detail.fields.createdAt")}
                value={item.createdAt ? formatDateTime(item.createdAt, locale) : "-"}
              />
              <DetailRow
                label={t("admin.detail.fields.updatedAt")}
                value={item.updatedAt ? formatDateTime(item.updatedAt, locale) : "-"}
              />
            </div>
          </SummaryCard>

          <SummaryCard
            title={t("admin.detail.sections.curriculum")}
            note={t("admin.detail.curriculum.note")}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <OperationalCard
                label={t("admin.detail.curriculum.cards.plannedLectures.label")}
                title={t("admin.detail.curriculum.cards.plannedLectures.value", {
                  value: trainingStats.totalPlannedLectures,
                })}
                note={t("admin.detail.curriculum.cards.plannedLectures.note")}
                tone="primary"
              />
              <OperationalCard
                label={t("admin.detail.curriculum.cards.actualLectures.label")}
                title={t("admin.detail.curriculum.cards.actualLectures.value", {
                  value: trainingStats.totalLectures,
                })}
                note={t("admin.detail.curriculum.cards.actualLectures.note")}
                tone="brand"
              />
              <OperationalCard
                label={t("admin.detail.curriculum.cards.plannedDays.label")}
                title={t("admin.detail.curriculum.cards.plannedDays.value", {
                  value: trainingStats.totalPlannedDurationDays,
                })}
                note={t("admin.detail.curriculum.cards.plannedDays.note")}
                tone="success"
              />
              <OperationalCard
                label={t("admin.detail.curriculum.cards.completeSchedules.label")}
                title={t("admin.detail.curriculum.cards.completeSchedules.value", {
                  value: trainingStats.completeSchedules,
                })}
                note={t("admin.detail.curriculum.cards.completeSchedules.note", {
                  value: trainingStats.totalSchedules,
                })}
                tone="warning"
              />
            </div>
          </SummaryCard>

          <SummaryCard
            title={t("admin.detail.sections.analytics")}
            note={t("admin.detail.analytics.note")}
          >
            {analyticsQuery.isLoading ? (
              <ListStateSkeleton items={2} heightClass="h-28" />
            ) : analyticsQuery.isError ? (
              <StateCard
                title={t("admin.detail.analytics.error.heading")}
                note={t("admin.detail.analytics.error.note")}
              />
            ) : analyticsQuery.data ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <OperationalCard
                    label={t("admin.detail.analytics.cards.paymentConversion.label")}
                    title={t("admin.detail.analytics.percentage", {
                      value: analyticsQuery.data.paymentConversionRate,
                    })}
                    note={t("admin.detail.analytics.cards.paymentConversion.note")}
                    tone="success"
                  />
                  <OperationalCard
                    label={t("admin.detail.analytics.cards.attendanceCompletion.label")}
                    title={t("admin.detail.analytics.percentage", {
                      value: analyticsQuery.data.attendanceCompletionRate,
                    })}
                    note={t("admin.detail.analytics.cards.attendanceCompletion.note")}
                    tone="brand"
                  />
                  <OperationalCard
                    label={t("admin.detail.analytics.cards.failedPayments.label")}
                    title={t("admin.detail.analytics.count", {
                      value: analyticsQuery.data.failedPaymentAttempts,
                    })}
                    note={t("admin.detail.analytics.cards.failedPayments.note")}
                    tone="warning"
                  />
                  <OperationalCard
                    label={t("admin.detail.analytics.cards.abandonedPayments.label")}
                    title={t("admin.detail.analytics.count", {
                      value: analyticsQuery.data.abandonedPaymentAttempts,
                    })}
                    note={t("admin.detail.analytics.cards.abandonedPayments.note")}
                    tone="neutral"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailRow
                    label={t("admin.detail.analytics.overallEnrollments")}
                    value={t("admin.detail.analytics.count", {
                      value: analyticsQuery.data.totalEnrollments,
                    })}
                  />
                  <DetailRow
                    label={t("admin.detail.analytics.overallPaid")}
                    value={t("admin.detail.analytics.count", {
                      value: analyticsQuery.data.paidEnrollments,
                    })}
                  />
                  <DetailRow
                    label={t("admin.detail.analytics.overallPending")}
                    value={t("admin.detail.analytics.count", {
                      value: analyticsQuery.data.pendingPaymentEnrollments,
                    })}
                  />
                  <DetailRow
                    label={t("admin.detail.analytics.overallAttendance")}
                    value={t("admin.detail.analytics.count", {
                      value: analyticsQuery.data.attendanceCompletedEnrollments,
                    })}
                  />
                </div>
              </div>
            ) : null}
          </SummaryCard>

          <SummaryCard
            title={t("admin.detail.sections.lifecycle")}
            note={t("admin.detail.lifecycle.note")}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <OperationalCard
                label={t("admin.detail.lifecycle.cards.totalSchedules.label")}
                title={t("admin.detail.lifecycle.cards.totalSchedules.value", {
                  value: trainingStats.totalSchedules,
                })}
                note={t("admin.detail.lifecycle.cards.totalSchedules.note")}
                tone="primary"
              />
              <OperationalCard
                label={t("admin.detail.lifecycle.cards.openSchedules.label")}
                title={t("admin.detail.lifecycle.cards.openSchedules.value", {
                  value: trainingStats.openSchedules,
                })}
                note={t("admin.detail.lifecycle.cards.openSchedules.note")}
                tone="brand"
              />
              <OperationalCard
                label={t("admin.detail.lifecycle.cards.totalLectures.label")}
                title={t("admin.detail.lifecycle.cards.totalLectures.value", {
                  value: trainingStats.totalLectures,
                })}
                note={t("admin.detail.lifecycle.cards.totalLectures.note")}
                tone="brand"
              />
              <OperationalCard
                label={t("admin.detail.lifecycle.cards.joinedSeats.label")}
                title={t("admin.detail.lifecycle.cards.joinedSeats.value", {
                  value: trainingStats.occupiedSeats,
                })}
                note={t("admin.detail.lifecycle.cards.joinedSeats.note", {
                  value: trainingStats.totalCapacity,
                })}
                tone="success"
              />
              <OperationalCard
                label={t("admin.detail.lifecycle.cards.endedSchedules.label")}
                title={t("admin.detail.lifecycle.cards.endedSchedules.value", {
                  value: trainingStats.endedSchedules,
                })}
                note={t("admin.detail.lifecycle.cards.endedSchedules.note")}
                tone="neutral"
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <DetailRow
                label={t("admin.detail.lifecycle.timeline.createdAt")}
                value={item.createdAt ? formatDateTime(item.createdAt, locale) : "-"}
              />
              <DetailRow
                label={t("admin.detail.lifecycle.timeline.publishedAt")}
                value={item.publishedAt ? formatDateTime(item.publishedAt, locale) : "-"}
              />
              <DetailRow
                label={t("admin.detail.lifecycle.timeline.archivedAt")}
                value={item.archivedAt ? formatDateTime(item.archivedAt, locale) : "-"}
              />
              <DetailRow
                label={t("admin.detail.lifecycle.timeline.updatedAt")}
                value={item.updatedAt ? formatDateTime(item.updatedAt, locale) : "-"}
              />
            </div>
          </SummaryCard>

          <SummaryCard
            title={t("admin.detail.sections.cohorts")}
            note={t("admin.detail.schedules.note")}
          >
            {schedulesQuery.isLoading ? (
              <ListStateSkeleton items={3} heightClass="h-40" />
            ) : schedulesQuery.isError ? (
              <StateCard
                title={t("admin.detail.schedules.error.heading")}
                note={t("admin.detail.schedules.error.note")}
              />
            ) : scheduleItems.length > 0 ? (
              <div className="space-y-3">
                {scheduleItems.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    analytics={cohortAnalyticsByScheduleId[schedule.id] ?? null}
                    trainingId={item.id}
                    onOpenLectures={setActiveLecturesSchedule}
                    onOpenCreateLecture={setActiveLectureCreateSchedule}
                  />
                ))}
              </div>
            ) : (
              <StateCard
                title={t("admin.detail.schedules.empty.heading")}
                note={t("admin.detail.schedules.empty.note")}
              />
            )}
          </SummaryCard>
        </div>

        <aside className="space-y-5">
          <SummaryCard
            title={t("admin.detail.sections.paymentAttempts")}
            note={t("admin.detail.paymentAttempts.note")}
          >
            {paymentAttemptsQuery.isLoading ? (
              <ListStateSkeleton items={2} heightClass="h-20" />
            ) : paymentAttemptsQuery.isError ? (
              <StateCard
                title={t("admin.detail.paymentAttempts.states.error.heading")}
                note={t("admin.detail.paymentAttempts.states.error.note")}
              />
            ) : (
              <div className="space-y-3">
                <OperationalCard
                  label={t("admin.detail.paymentAttempts.summary.label")}
                  title={t("admin.detail.paymentAttempts.summary.value", {
                    value: failedPaymentAttempts.length,
                  })}
                  note={t("admin.detail.paymentAttempts.summary.note")}
                  tone="warning"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPaymentAttempts(true)}
                  startIcon={<BookOpenText className="h-4 w-4" />}
                >
                  {t("admin.detail.paymentAttempts.open")}
                </Button>
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            title={t("admin.detail.sections.actions")}
            note={t("admin.detail.actions.note")}
          >
            {canManage ? (
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="w-full"
                  startIcon={<Pencil className="h-4 w-4" />}
                >
                  {t("admin.detail.sections.update")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateScheduleModalOpen(true)}
                  className="w-full"
                  startIcon={<Plus className="h-4 w-4" />}
                >
                  {t("admin.detail.actions.addSchedule")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePublish}
                  disabled={!actionState.canPublish || publishTraining.isPending}
                  className="w-full hover:border-emerald-300 hover:text-emerald-700"
                  startIcon={<CheckCircle2 className="h-4 w-4" />}
                >
                  {publishTraining.isPending
                    ? t("admin.detail.actions.publishing")
                    : t("admin.detail.actions.publish")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowArchiveConfirm(true)}
                  disabled={!actionState.canArchive || archiveTraining.isPending}
                  className="w-full hover:border-rose-300 hover:text-rose-600"
                  startIcon={<CircleOff className="h-4 w-4" />}
                >
                  {archiveTraining.isPending
                    ? t("admin.detail.actions.archiving")
                    : t("admin.detail.actions.archive")}
                </Button>
                {!actionState.canPublish && !actionState.canArchive ? (
                  <StateCard
                    title={t("admin.detail.actions.states.notAvailable.heading")}
                    note={t("admin.detail.actions.states.notAvailable.note")}
                  />
                ) : actionState.publishBlockedByMissingSchedule ? (
                  <StateCard
                    title={t("admin.detail.actions.publishBlocked.heading")}
                    note={t("admin.detail.actions.publishBlocked.note")}
                  />
                ) : null}
              </div>
            ) : (
              <StateCard
                title={t("admin.detail.actions.states.adminOnly.heading")}
                note={t("admin.detail.actions.states.adminOnly.note")}
              />
            )}
          </SummaryCard>
        </aside>
      </div>

      <AdminTrainingUpdateModal
        isOpen={isUpdateModalOpen}
        training={item}
        onClose={() => setIsUpdateModalOpen(false)}
        onSuccess={() =>
          setFeedback({ tone: "success", message: t("admin.detail.update.success") })
        }
      />
      <AdminTrainingScheduleCreateModal
        isOpen={isCreateScheduleModalOpen}
        trainingId={item.id}
        onClose={() => setIsCreateScheduleModalOpen(false)}
        onSuccess={() =>
          setFeedback({ tone: "success", message: t("admin.detail.createSchedule.success") })
        }
      />

      <AdminTrainingScheduleLecturesModal
        isOpen={Boolean(activeLecturesSchedule)}
        trainingId={item.id}
        schedule={activeLecturesSchedule}
        onClose={() => setActiveLecturesSchedule(null)}
      />

      <AdminTrainingScheduleLectureCreateModal
        isOpen={Boolean(activeLectureCreateSchedule)}
        trainingId={item.id}
        schedule={activeLectureCreateSchedule}
        onClose={() => setActiveLectureCreateSchedule(null)}
        onSuccess={() =>
          setFeedback({
            tone: "success",
            message: t("admin.detail.scheduleLectures.create.success"),
          })
        }
      />

      <AdminTrainingPaymentAttemptsModal
        isOpen={showPaymentAttempts}
        trainingId={item.id}
        onClose={() => setShowPaymentAttempts(false)}
      />

      <DestructiveConfirmModal
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        size="sm"
        title={t("admin.detail.actions.archiveConfirm.title")}
        description={t("admin.detail.actions.archiveConfirm.description")}
        confirmLabel={
          archiveTraining.isPending
            ? t("admin.detail.actions.archiving")
            : t("admin.detail.actions.archive")
        }
        cancelLabel={t("admin.detail.actions.archiveConfirm.cancel")}
        onConfirm={async () => {
          const success = await handleArchive();
          if (success) {
            setShowArchiveConfirm(false);
          }
        }}
        loading={archiveTraining.isPending}
      >
        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <p className="font-medium">{item.title}</p>
          <p className="mt-1 text-xs opacity-80">{item.slug}</p>
        </div>
      </DestructiveConfirmModal>
    </div>
  );
}
