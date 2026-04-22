"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CheckCircle2, CircleOff, Pencil, Plus } from "lucide-react";
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
  useAdminTrainingSchedules,
  useArchiveAdminTraining,
  useCreateAdminTrainingSchedule,
  usePublishAdminTraining,
  useUpdateAdminTraining,
  useUpdateAdminTrainingSchedule,
} from "../hooks/use-training";
import { getAdminTrainingErrorKey } from "../lib/admin-training-errors";
import {
  formatTrainingDatetime,
  getScheduleStatusTone,
  getStatusToneClasses,
} from "./training-utils";
import type {
  AdminTrainingSchedule,
  AdminTrainingItem,
  CourseType,
  CourseVisibility,
  TrainingScheduleStatus,
} from "../types/training.types";

type Props = {
  trainingId: string;
};

type Feedback = { tone: "success" | "error"; message: string };

type UpdateTrainingForm = {
  locale: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  courseType: CourseType;
  visibility: CourseVisibility;
};

type ScheduleCreateForm = {
  status: TrainingScheduleStatus;
  scheduleCode: string;
  enrollmentOpenAt: string;
  enrollmentCloseAt: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  externalRoomProvider: string;
  externalRoomJoinUrl: string;
  externalRoomHostUrl: string;
};

const COURSE_TYPES: CourseType[] = ["LIVE", "WORKSHOP", "COURSE"];
const COURSE_VISIBILITIES: CourseVisibility[] = ["PUBLIC", "PRIVATE"];
const SCHEDULE_STATUSES: TrainingScheduleStatus[] = [
  "DRAFT",
  "OPEN_FOR_ENROLLMENT",
  "FULL",
  "STARTED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];

function localInputToIso(value: string): string {
  return value.length === 16 ? `${value}:00Z` : value;
}

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

function getTrainingLifecycleState(item: AdminTrainingItem) {
  if (item.status === "PUBLISHED") return "published" as const;
  if (item.status === "ARCHIVED") return "archived" as const;
  return "draft" as const;
}

function getTrainingScheduleState(schedules: Array<{ isEnrollmentOpen: boolean }>) {
  if (schedules.length === 0) return "none" as const;
  if (schedules.some((schedule) => schedule.isEnrollmentOpen)) return "open" as const;
  return "closed" as const;
}

function getTrainingActionPosture(input: {
  canManage: boolean;
  canPublish: boolean;
  canArchive: boolean;
}) {
  if (!input.canManage) return "adminOnly" as const;
  if (input.canPublish || input.canArchive) return "limitedActions" as const;
  return "readOnly" as const;
}

function ScheduleCard({
  schedule,
  trainingId,
}: {
  schedule: AdminTrainingSchedule;
  trainingId: string;
}) {
  const t = useTranslations("training");
  const locale = useLocale();
  const updateSchedule = useUpdateAdminTrainingSchedule();
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [form, setForm] = useState({
    status: schedule.status,
    externalRoomProvider: schedule.externalRoomProvider ?? "",
    externalRoomJoinUrl: schedule.externalRoomJoinUrl ?? "",
    externalRoomHostUrl: schedule.externalRoomHostUrl ?? "",
  });

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (form.externalRoomProvider && !form.externalRoomJoinUrl.trim()) {
      setFeedback({
        tone: "error",
        message: t("admin.errors.externalJoinUrlRequired"),
      });
      return;
    }

    if (!form.externalRoomProvider && form.externalRoomJoinUrl.trim()) {
      setFeedback({
        tone: "error",
        message: t("admin.errors.externalRoomProviderRequired"),
      });
      return;
    }

    try {
      await updateSchedule.mutateAsync({
        trainingId,
        scheduleId: schedule.id,
        input: {
          status: form.status,
          externalRoomProvider: form.externalRoomProvider || undefined,
          externalRoomJoinUrl: form.externalRoomJoinUrl.trim() || undefined,
          externalRoomHostUrl: form.externalRoomHostUrl.trim() || undefined,
        },
      });
      setFeedback({
        tone: "success",
        message: t("admin.detail.schedules.updateSuccess"),
      });
      setIsEditing(false);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminTrainingErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  return (
    <div className="rounded-[24px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
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

        <ActionIconButton
          type="button"
          intent={isEditing ? "neutral" : "edit"}
          onClick={() => setIsEditing((value) => !value)}
          label={isEditing ? t("admin.detail.schedules.cancelEdit") : t("admin.detail.schedules.edit")}
          icon={isEditing ? <CircleOff className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        />
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("admin.detail.schedules.fields.status")}
            </span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as TrainingScheduleStatus,
                }))
              }
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
            >
              {SCHEDULE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.schedule.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("admin.detail.schedules.fields.externalProvider")}
            </span>
            <select
              value={form.externalRoomProvider}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  externalRoomProvider: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
            >
              <option value="">{t("admin.detail.schedules.providers.none")}</option>
              <option value="ZOOM">{t("admin.detail.schedules.providers.zoom")}</option>
            </select>
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("admin.detail.schedules.fields.externalJoinUrl")}
            </span>
            <input
              value={form.externalRoomJoinUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  externalRoomJoinUrl: event.target.value,
                }))
              }
              placeholder={t("admin.detail.schedules.placeholders.externalJoinUrl")}
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("admin.detail.schedules.fields.externalHostUrl")}
            </span>
            <input
              value={form.externalRoomHostUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  externalRoomHostUrl: event.target.value,
                }))
              }
              placeholder={t("admin.detail.schedules.placeholders.externalHostUrl")}
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <Button
              type="submit"
              size="sm"
              disabled={updateSchedule.isPending}
              startIcon={<Pencil className="h-3.5 w-3.5" />}
            >
              {updateSchedule.isPending
                ? t("admin.detail.schedules.saving")
                : t("admin.detail.schedules.save")}
            </Button>
            {feedback ? (
              <span
                className={`text-xs ${
                  feedback.tone === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {feedback.message}
              </span>
            ) : null}
          </div>
        </form>
      ) : null}
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
  const updateTraining = useUpdateAdminTraining();
  const publishTraining = usePublishAdminTraining();
  const archiveTraining = useArchiveAdminTraining();
  const createSchedule = useCreateAdminTrainingSchedule();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [updateForm, setUpdateForm] = useState<UpdateTrainingForm | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleCreateForm>({
    status: "DRAFT",
    scheduleCode: "",
    enrollmentOpenAt: "",
    enrollmentCloseAt: "",
    startsAt: "",
    endsAt: "",
    timezone: "",
    externalRoomProvider: "",
    externalRoomJoinUrl: "",
    externalRoomHostUrl: "",
  });

  const item = trainingQuery.data;
  const effectiveUpdateForm = useMemo<UpdateTrainingForm | null>(() => {
    if (updateForm) return updateForm;
    if (!item) return null;

    return {
      locale: item.locale ?? locale,
      title: item.title ?? "",
      slug: item.slug ?? "",
      shortDescription: item.shortDescription ?? "",
      fullDescription: item.fullDescription ?? "",
      courseType: item.courseType as CourseType,
      visibility: item.visibility as CourseVisibility,
    };
  }, [item, locale, updateForm]);

  const actionState = useMemo(() => {
    if (!item) {
      return { canPublish: false, canArchive: false };
    }
    return {
      canPublish: item.status === "DRAFT",
      canArchive: item.status === "DRAFT" || item.status === "PUBLISHED",
    };
  }, [item]);

  const scheduleItems = schedulesQuery.data?.items ?? item?.schedules ?? [];

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const handleUpdateTraining = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item || !effectiveUpdateForm) return;
    setFeedback(null);

    if (!effectiveUpdateForm.title.trim() || !effectiveUpdateForm.slug.trim()) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.update.validation.required"),
      });
      return;
    }

    if (!slugPattern.test(effectiveUpdateForm.slug.trim())) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.update.validation.slug"),
      });
      return;
    }

    try {
      await updateTraining.mutateAsync({
        trainingId: item.id,
        input: {
          locale: effectiveUpdateForm.locale,
          title: effectiveUpdateForm.title.trim(),
          slug: effectiveUpdateForm.slug.trim(),
          shortDescription: effectiveUpdateForm.shortDescription.trim(),
          fullDescription: effectiveUpdateForm.fullDescription.trim(),
          courseType: effectiveUpdateForm.courseType,
          visibility: effectiveUpdateForm.visibility,
        },
      });
      setFeedback({
        tone: "success",
        message: t("admin.detail.update.success"),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminTrainingErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  const handlePublish = async () => {
    if (!item) return;
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

  const handleCreateSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;
    setFeedback(null);

    if (
      !scheduleForm.enrollmentOpenAt ||
      !scheduleForm.enrollmentCloseAt ||
      !scheduleForm.startsAt ||
      !scheduleForm.endsAt
    ) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.createSchedule.validation.required"),
      });
      return;
    }

    const enrollmentOpenAt = localInputToIso(scheduleForm.enrollmentOpenAt);
    const enrollmentCloseAt = localInputToIso(scheduleForm.enrollmentCloseAt);
    const startsAt = localInputToIso(scheduleForm.startsAt);
    const endsAt = localInputToIso(scheduleForm.endsAt);

    if (new Date(enrollmentOpenAt) >= new Date(enrollmentCloseAt)) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.createSchedule.validation.enrollmentWindow"),
      });
      return;
    }

    if (new Date(startsAt) >= new Date(endsAt)) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.createSchedule.validation.sessionWindow"),
      });
      return;
    }

    if (new Date(enrollmentCloseAt) > new Date(startsAt)) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.createSchedule.validation.closeBeforeStart"),
      });
      return;
    }

    if (scheduleForm.externalRoomProvider && !scheduleForm.externalRoomJoinUrl.trim()) {
      setFeedback({
        tone: "error",
        message: t("admin.errors.externalJoinUrlRequired"),
      });
      return;
    }

    if (!scheduleForm.externalRoomProvider && scheduleForm.externalRoomJoinUrl.trim()) {
      setFeedback({
        tone: "error",
        message: t("admin.errors.externalRoomProviderRequired"),
      });
      return;
    }

    try {
      await createSchedule.mutateAsync({
        trainingId: item.id,
        input: {
          status: scheduleForm.status,
          scheduleCode: scheduleForm.scheduleCode.trim() || undefined,
          enrollmentOpenAt,
          enrollmentCloseAt,
          startsAt,
          endsAt,
          timezone: scheduleForm.timezone.trim() || undefined,
          externalRoomProvider: scheduleForm.externalRoomProvider || undefined,
          externalRoomJoinUrl: scheduleForm.externalRoomJoinUrl.trim() || undefined,
          externalRoomHostUrl: scheduleForm.externalRoomHostUrl.trim() || undefined,
        },
      });
      setFeedback({
        tone: "success",
        message: t("admin.detail.createSchedule.success"),
      });
      setScheduleForm({
        status: "DRAFT",
        scheduleCode: "",
        enrollmentOpenAt: "",
        enrollmentCloseAt: "",
        startsAt: "",
        endsAt: "",
        timezone: "",
        externalRoomProvider: "",
        externalRoomJoinUrl: "",
        externalRoomHostUrl: "",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminTrainingErrorKey(error) as Parameters<typeof t>[0]),
      });
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
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {item.title}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">{t("admin.detail.note")}</p>
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

      <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
          {t("admin.detail.sections.snapshot")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary">
          {t("admin.detail.snapshotNote")}
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <OperationalCard
            label={t("admin.detail.snapshotCards.lifecycle.label")}
            title={t(
              `admin.detail.snapshotCards.lifecycle.states.${getTrainingLifecycleState(item)}.title` as Parameters<typeof t>[0],
            )}
            note={t(
              `admin.detail.snapshotCards.lifecycle.states.${getTrainingLifecycleState(item)}.note` as Parameters<typeof t>[0],
            )}
            tone={
              getTrainingLifecycleState(item) === "published"
                ? "success"
                : getTrainingLifecycleState(item) === "archived"
                  ? "neutral"
                  : "warning"
            }
          />
          <OperationalCard
            label={t("admin.detail.snapshotCards.schedules.label")}
            title={t(
              `admin.detail.snapshotCards.schedules.states.${getTrainingScheduleState(scheduleItems)}.title` as Parameters<typeof t>[0],
            )}
            note={t(
              `admin.detail.snapshotCards.schedules.states.${getTrainingScheduleState(scheduleItems)}.note` as Parameters<typeof t>[0],
            )}
            tone={
              getTrainingScheduleState(scheduleItems) === "open"
                ? "brand"
                : getTrainingScheduleState(scheduleItems) === "closed"
                  ? "primary"
                  : "neutral"
            }
          />
          <OperationalCard
            label={t("admin.detail.snapshotCards.actions.label")}
            title={t(
              `admin.detail.snapshotCards.actions.states.${getTrainingActionPosture({
                canManage,
                canPublish: actionState.canPublish,
                canArchive: actionState.canArchive,
              })}.title` as Parameters<typeof t>[0],
            )}
            note={t(
              `admin.detail.snapshotCards.actions.states.${getTrainingActionPosture({
                canManage,
                canPublish: actionState.canPublish,
                canArchive: actionState.canArchive,
              })}.note` as Parameters<typeof t>[0],
            )}
            tone={
              getTrainingActionPosture({
                canManage,
                canPublish: actionState.canPublish,
                canArchive: actionState.canArchive,
              }) === "limitedActions"
                ? "primary"
                : getTrainingActionPosture({
                    canManage,
                    canPublish: actionState.canPublish,
                    canArchive: actionState.canArchive,
                  }) === "adminOnly"
                  ? "warning"
                  : "neutral"
            }
          />
        </div>
      </SurfaceCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <SummaryCard title={t("admin.detail.sections.overview")}>
            <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
              <DetailRow
                label={t("admin.detail.fields.status")}
                value={t(`statuses.course.${item.status}` as Parameters<typeof t>[0])}
              />
              <DetailRow
                label={t("admin.detail.fields.visibility")}
                value={t(
                  `statuses.visibility.${item.visibility}` as Parameters<typeof t>[0],
                )}
              />
              <DetailRow
                label={t("admin.detail.fields.locale")}
                value={item.locale ?? locale}
              />
              <DetailRow
                label={t("admin.detail.fields.courseType")}
                value={t(`courseTypes.${item.courseType}` as Parameters<typeof t>[0])}
              />
              <DetailRow label={t("admin.detail.fields.slug")} value={item.slug} />
              <DetailRow
                label={t("admin.detail.fields.publishedAt")}
                value={formatDateTime(item.publishedAt, locale)}
              />
              <DetailRow
                label={t("admin.detail.fields.createdAt")}
                value={formatDateTime(item.createdAt, locale)}
              />
              <DetailRow
                label={t("admin.detail.fields.updatedAt")}
                value={formatDateTime(item.updatedAt, locale)}
              />
              <DetailRow
                label={t("admin.detail.fields.scheduleCount")}
                value={String(item.schedules.length)}
              />
            </div>
          </SummaryCard>

          <SummaryCard
            title={t("admin.detail.sections.schedules")}
            note={t("admin.detail.schedules.note")}
          >
            {schedulesQuery.isLoading ? (
              <ListStateSkeleton items={3} heightClass="h-24" />
            ) : schedulesQuery.isError ? (
              <StateCard
                title={t("admin.detail.schedules.error.heading")}
                note={t("admin.detail.schedules.error.note")}
                action={{
                  label: t("admin.detail.schedules.error.retry"),
                  onClick: () => schedulesQuery.refetch(),
                }}
              />
            ) : schedulesQuery.data && schedulesQuery.data.items.length > 0 ? (
              <div className="space-y-3">
                {schedulesQuery.data.items.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    trainingId={item.id}
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
        <div className="space-y-5">
          <SummaryCard
            title={t("admin.detail.sections.actions")}
            note={t("admin.detail.actions.note")}
          >
            {canManage ? (
              <div className="space-y-4">
                <Button
                  type="button"
                  onClick={handlePublish}
                  disabled={!actionState.canPublish || publishTraining.isPending}
                  className="w-full"
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
                ) : null}
              </div>
            ) : (
              <StateCard
                title={t("admin.detail.actions.states.adminOnly.heading")}
                note={t("admin.detail.actions.states.adminOnly.note")}
              />
            )}
          </SummaryCard>

          <SummaryCard
            title={t("admin.detail.sections.update")}
            note={t("admin.detail.update.note")}
          >
            {effectiveUpdateForm ? (
              <form onSubmit={handleUpdateTraining} className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.update.fields.locale")}
                  </span>
                  <select
                    value={effectiveUpdateForm.locale}
                    onChange={(event) =>
                      setUpdateForm((current) => ({
                        ...(current ?? effectiveUpdateForm),
                        locale: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  >
                    <option value="ar">{t("admin.detail.update.locales.ar")}</option>
                    <option value="en">{t("admin.detail.update.locales.en")}</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.update.fields.title")}
                  </span>
                  <input
                    value={effectiveUpdateForm.title}
                    onChange={(event) =>
                      setUpdateForm((current) => ({
                        ...(current ?? effectiveUpdateForm),
                        title: event.target.value,
                      }))
                    }
                    placeholder={t("admin.detail.update.placeholders.title")}
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.update.fields.slug")}
                  </span>
                  <input
                    value={effectiveUpdateForm.slug}
                    onChange={(event) =>
                      setUpdateForm((current) => ({
                        ...(current ?? effectiveUpdateForm),
                        slug: event.target.value,
                      }))
                    }
                    placeholder={t("admin.detail.update.placeholders.slug")}
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.update.fields.courseType")}
                  </span>
                  <select
                    value={effectiveUpdateForm.courseType}
                    onChange={(event) =>
                      setUpdateForm((current) => ({
                        ...(current ?? effectiveUpdateForm),
                        courseType: event.target.value as CourseType,
                      }))
                    }
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  >
                    {COURSE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`courseTypes.${type}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.update.fields.visibility")}
                  </span>
                  <select
                    value={effectiveUpdateForm.visibility}
                    onChange={(event) =>
                      setUpdateForm((current) => ({
                        ...(current ?? effectiveUpdateForm),
                        visibility: event.target.value as CourseVisibility,
                      }))
                    }
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  >
                    {COURSE_VISIBILITIES.map((value) => (
                      <option key={value} value={value}>
                        {t(`statuses.visibility.${value}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.update.fields.shortDescription")}
                  </span>
                  <input
                    value={effectiveUpdateForm.shortDescription}
                    onChange={(event) =>
                      setUpdateForm((current) => ({
                        ...(current ?? effectiveUpdateForm),
                        shortDescription: event.target.value,
                      }))
                    }
                    placeholder={t("admin.detail.update.placeholders.shortDescription")}
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.update.fields.fullDescription")}
                  </span>
                  <textarea
                    rows={4}
                    value={effectiveUpdateForm.fullDescription}
                    onChange={(event) =>
                      setUpdateForm((current) => ({
                        ...(current ?? effectiveUpdateForm),
                        fullDescription: event.target.value,
                      }))
                    }
                    placeholder={t("admin.detail.update.placeholders.fullDescription")}
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <Button
                  type="submit"
                  disabled={updateTraining.isPending}
                  className="w-full"
                  startIcon={<Pencil className="h-4 w-4" />}
                >
                  {updateTraining.isPending
                    ? t("admin.detail.update.submitting")
                    : t("admin.detail.update.submit")}
                </Button>
              </form>
            ) : (
              <ListStateSkeleton items={2} heightClass="h-10" />
            )}
          </SummaryCard>

          <SummaryCard
            title={t("admin.detail.sections.createSchedule")}
            note={t("admin.detail.createSchedule.note")}
          >
            {canManage ? (
              <form onSubmit={handleCreateSchedule} className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.status")}
                  </span>
                  <select
                    value={scheduleForm.status}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        status: event.target.value as TrainingScheduleStatus,
                      }))
                    }
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  >
                    {SCHEDULE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {t(`statuses.schedule.${status}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.scheduleCode")}
                  </span>
                  <input
                    value={scheduleForm.scheduleCode}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        scheduleCode: event.target.value,
                      }))
                    }
                    placeholder={t("admin.detail.createSchedule.placeholders.scheduleCode")}
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <div className="grid gap-3 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.createSchedule.fields.enrollmentOpenAt")}
                    </span>
                    <input
                      type="datetime-local"
                      value={scheduleForm.enrollmentOpenAt}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          enrollmentOpenAt: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.createSchedule.fields.enrollmentCloseAt")}
                    </span>
                    <input
                      type="datetime-local"
                      value={scheduleForm.enrollmentCloseAt}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          enrollmentCloseAt: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.createSchedule.fields.startsAt")}
                    </span>
                    <input
                      type="datetime-local"
                      value={scheduleForm.startsAt}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          startsAt: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("admin.detail.createSchedule.fields.endsAt")}
                    </span>
                    <input
                      type="datetime-local"
                      value={scheduleForm.endsAt}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          endsAt: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.timezone")}
                  </span>
                  <input
                    value={scheduleForm.timezone}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        timezone: event.target.value,
                      }))
                    }
                    placeholder={t("admin.detail.createSchedule.placeholders.timezone")}
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.externalProvider")}
                  </span>
                  <select
                    value={scheduleForm.externalRoomProvider}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        externalRoomProvider: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">{t("admin.detail.createSchedule.providers.none")}</option>
                    <option value="ZOOM">{t("admin.detail.createSchedule.providers.zoom")}</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.externalJoinUrl")}
                  </span>
                  <input
                    value={scheduleForm.externalRoomJoinUrl}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        externalRoomJoinUrl: event.target.value,
                      }))
                    }
                    placeholder={t("admin.detail.createSchedule.placeholders.externalJoinUrl")}
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.externalHostUrl")}
                  </span>
                  <input
                    value={scheduleForm.externalRoomHostUrl}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        externalRoomHostUrl: event.target.value,
                      }))
                    }
                    placeholder={t("admin.detail.createSchedule.placeholders.externalHostUrl")}
                    className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <Button
                  type="submit"
                  disabled={createSchedule.isPending}
                  className="w-full"
                  startIcon={<Plus className="h-4 w-4" />}
                >
                  {createSchedule.isPending
                    ? t("admin.detail.createSchedule.submitting")
                    : t("admin.detail.createSchedule.submit")}
                </Button>
              </form>
            ) : (
              <StateCard
                title={t("admin.detail.actions.states.adminOnly.heading")}
                note={t("admin.detail.actions.states.adminOnly.note")}
              />
            )}
          </SummaryCard>

          <SummaryCard title={t("admin.detail.sections.boundary")}>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>{t("admin.detail.boundaryItems.noAnalytics")}</li>
              <li>{t("admin.detail.boundaryItems.noCertificates")}</li>
              <li>{t("admin.detail.boundaryItems.noAdvancedLms")}</li>
            </ul>
          </SummaryCard>
        </div>
      </div>

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
