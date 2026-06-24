"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Plus } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { toAppError } from "@/lib/api/errors";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useCreateAdminTrainingSchedule } from "../hooks/use-training";
import { getAdminTrainingErrorKey } from "../lib/admin-training-errors";
import type { TrainingScheduleStatus } from "../types/training.types";

type Props = {
  isOpen: boolean;
  trainingId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

type ScheduleCreateForm = {
  status: TrainingScheduleStatus;
  scheduleCode: string;
  enrollmentOpenAt: string;
  enrollmentCloseAt: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  timezone: string;
  externalRoomProvider: string;
  externalRoomJoinUrl: string;
  externalRoomHostUrl: string;
};

type FieldErrors = Partial<
  Record<
    | "status"
    | "scheduleCode"
    | "enrollmentOpenAt"
    | "enrollmentCloseAt"
    | "startsAt"
    | "endsAt"
    | "timezone"
    | "externalRoomProvider"
    | "externalRoomJoinUrl"
    | "externalRoomHostUrl",
    string
  >
>;

const SCHEDULE_STATUSES: TrainingScheduleStatus[] = [
  "DRAFT",
  "OPEN_FOR_ENROLLMENT",
  "FULL",
  "STARTED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];

const DURATION_OPTIONS = [30, 60, 90, 120] as const;
const DEFAULT_TIMEZONE = "Africa/Cairo";

function localInputToDate(value: string): Date {
  return new Date(value);
}

function localInputToIso(value: string): string {
  const date = localInputToDate(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatDateToLocalInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function addMinutesToLocalInput(value: string, minutes: number): string {
  const date = localInputToDate(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return formatDateToLocalInput(nextDate);
}

function createInitialForm(timezone = ""): ScheduleCreateForm {
  return {
    status: "DRAFT",
    scheduleCode: "",
    enrollmentOpenAt: "",
    enrollmentCloseAt: "",
    startsAt: "",
    endsAt: "",
    durationMinutes: 60,
    timezone,
    externalRoomProvider: "",
    externalRoomJoinUrl: "",
    externalRoomHostUrl: "",
  };
}

function getFieldClassName(hasError: boolean) {
  return [
    "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
    hasError
      ? "border-rose-300 bg-rose-50/60 text-rose-950 focus:border-rose-400 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100"
      : "border-border-light bg-white text-text-primary focus:border-primary/35 dark:bg-white/5 dark:text-white",
  ].join(" ");
}

export default function AdminTrainingScheduleCreateModal({
  isOpen,
  trainingId,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("training");
  const createSchedule = useCreateAdminTrainingSchedule();
  const detectedTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  const [form, setForm] = useState<ScheduleCreateForm>(() =>
    createInitialForm(detectedTimezone),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const getFieldErrorsFromError = (error: unknown): FieldErrors => {
    const appError = toAppError(error);
    const fallback = t(getAdminTrainingErrorKey(error) as Parameters<typeof t>[0]);

    switch (appError.code) {
      case "TRAINING_SCHEDULE_CODE_ALREADY_EXISTS":
        return { scheduleCode: fallback };
      case "TRAINING_ENROLLMENT_WINDOW_REQUIRED":
        return {
          enrollmentOpenAt: t("admin.errors.enrollmentWindowRequired"),
          enrollmentCloseAt: t("admin.errors.enrollmentWindowRequired"),
        };
      case "TRAINING_SESSION_WINDOW_REQUIRED":
        return {
          startsAt: t("admin.errors.sessionWindowRequired"),
          endsAt: t("admin.errors.sessionWindowRequired"),
        };
      case "TRAINING_INVALID_ENROLLMENT_WINDOW":
        return {
          enrollmentOpenAt: t("admin.errors.invalidEnrollmentWindow"),
          enrollmentCloseAt: t("admin.errors.invalidEnrollmentWindow"),
        };
      case "TRAINING_INVALID_SESSION_WINDOW":
        return {
          startsAt: t("admin.errors.invalidSessionWindow"),
          endsAt: t("admin.errors.invalidSessionWindow"),
        };
      case "TRAINING_ENROLLMENT_MUST_CLOSE_BEFORE_START":
        return {
          enrollmentCloseAt: t("admin.errors.enrollmentMustCloseBeforeStart"),
          startsAt: t("admin.errors.enrollmentMustCloseBeforeStart"),
        };
      case "TRAINING_INVALID_EXTERNAL_ROOM_PROVIDER":
        return { externalRoomProvider: t("admin.errors.invalidExternalRoomProvider") };
      case "TRAINING_EXTERNAL_ROOM_PROVIDER_REQUIRED":
        return { externalRoomProvider: t("admin.errors.externalRoomProviderRequired") };
      case "TRAINING_EXTERNAL_JOIN_URL_REQUIRED":
        return { externalRoomJoinUrl: t("admin.errors.externalJoinUrlRequired") };
      case "TRAINING_CANNOT_OPEN_PAST_SCHEDULE":
        return {
          startsAt: t("admin.errors.cannotOpenPastSchedule"),
        };
      default:
        return {};
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setFieldErrors({});
    setForm((current) => createInitialForm(current.timezone || detectedTimezone));
  }, [isOpen, detectedTimezone]);

  const resetAndClose = () => {
    setForm(createInitialForm(detectedTimezone));
    setFieldErrors({});
    setFeedback(null);
    onClose();
  };

  const updateStartsAt = (value: string) => {
    setFieldErrors((current) => ({
      ...current,
      startsAt: undefined,
      endsAt: undefined,
    }));
    setForm((current) => ({
      ...current,
      startsAt: value,
      endsAt: value ? addMinutesToLocalInput(value, current.durationMinutes) : "",
    }));
  };

  const updateDurationMinutes = (value: number) => {
    setFieldErrors((current) => ({
      ...current,
      startsAt: undefined,
      endsAt: undefined,
    }));
    setForm((current) => ({
      ...current,
      durationMinutes: value,
      endsAt: current.startsAt ? addMinutesToLocalInput(current.startsAt, value) : "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trainingId) return;
    setFeedback(null);
    setFieldErrors({});

    if (
      !form.enrollmentOpenAt ||
      !form.enrollmentCloseAt ||
      !form.startsAt ||
      !form.endsAt
    ) {
      const errorMessage = t("admin.detail.createSchedule.validation.required");
      setFieldErrors({
        enrollmentOpenAt: errorMessage,
        enrollmentCloseAt: errorMessage,
        startsAt: errorMessage,
        endsAt: errorMessage,
      });
      setFeedback({
        tone: "error",
        message: errorMessage,
      });
      return;
    }

    const enrollmentOpenAt = localInputToIso(form.enrollmentOpenAt);
    const enrollmentCloseAt = localInputToIso(form.enrollmentCloseAt);
    const startsAt = localInputToIso(form.startsAt);
    const endsAt = localInputToIso(form.endsAt);

    if (localInputToDate(form.enrollmentOpenAt) >= localInputToDate(form.enrollmentCloseAt)) {
      const errorMessage = t("admin.detail.createSchedule.validation.enrollmentWindow");
      setFieldErrors({
        enrollmentOpenAt: errorMessage,
        enrollmentCloseAt: errorMessage,
      });
      setFeedback({ tone: "error", message: errorMessage });
      return;
    }

    if (localInputToDate(form.startsAt) >= localInputToDate(form.endsAt)) {
      const errorMessage = t("admin.detail.createSchedule.validation.sessionWindow");
      setFieldErrors({
        startsAt: errorMessage,
        endsAt: errorMessage,
      });
      setFeedback({ tone: "error", message: errorMessage });
      return;
    }

    if (localInputToDate(form.enrollmentCloseAt) > localInputToDate(form.startsAt)) {
      const errorMessage = t("admin.detail.createSchedule.validation.closeBeforeStart");
      setFieldErrors({
        enrollmentCloseAt: errorMessage,
        startsAt: errorMessage,
      });
      setFeedback({ tone: "error", message: errorMessage });
      return;
    }

    if (form.externalRoomProvider && !form.externalRoomJoinUrl.trim()) {
      const errorMessage = t("admin.errors.externalJoinUrlRequired");
      setFieldErrors({
        externalRoomJoinUrl: errorMessage,
      });
      setFeedback({ tone: "error", message: errorMessage });
      return;
    }

    if (!form.externalRoomProvider && form.externalRoomJoinUrl.trim()) {
      const errorMessage = t("admin.errors.externalRoomProviderRequired");
      setFieldErrors({
        externalRoomProvider: errorMessage,
      });
      setFeedback({ tone: "error", message: errorMessage });
      return;
    }

    try {
      await createSchedule.mutateAsync({
        trainingId,
        input: {
          status: form.status,
          scheduleCode: form.scheduleCode.trim() || undefined,
          enrollmentOpenAt,
          enrollmentCloseAt,
          startsAt,
          endsAt,
          timezone: form.timezone.trim() || undefined,
          externalRoomProvider: form.externalRoomProvider || undefined,
          externalRoomJoinUrl: form.externalRoomJoinUrl.trim() || undefined,
          externalRoomHostUrl: form.externalRoomHostUrl.trim() || undefined,
        },
      });
      onSuccess();
      resetAndClose();
    } catch (error) {
      setFieldErrors(getFieldErrorsFromError(error));
      setFeedback({
        tone: "error",
        message: t(getAdminTrainingErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} size="xl">
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader
          eyebrow={t("admin.detail.createSchedule.eyebrow")}
          title={t("admin.detail.createSchedule.title")}
          description={t("admin.detail.createSchedule.note")}
        />

        <ModalBody>
          <div className="space-y-4">
            <section className="rounded-[24px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("admin.detail.createSchedule.sections.core")}
                  </h3>
                  <p className="mt-1 text-xs leading-6 text-text-secondary">
                    {t("admin.detail.createSchedule.sections.coreNote")}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.status")}
                  </span>
                  <select
                    value={form.status}
                    onChange={(event) => {
                      setFieldErrors((current) => ({ ...current, status: undefined }));
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as TrainingScheduleStatus,
                      }));
                    }}
                    aria-invalid={Boolean(fieldErrors.status)}
                    className={getFieldClassName(Boolean(fieldErrors.status))}
                  >
                    {SCHEDULE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {t(`statuses.schedule.${status}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.status ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.status}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.timezone")}
                  </span>
                  <input
                    value={form.timezone}
                    onChange={(event) => {
                      setFieldErrors((current) => ({ ...current, timezone: undefined }));
                      setForm((current) => ({ ...current, timezone: event.target.value }));
                    }}
                    placeholder={t("admin.detail.createSchedule.placeholders.timezone")}
                    aria-invalid={Boolean(fieldErrors.timezone)}
                    className={getFieldClassName(Boolean(fieldErrors.timezone))}
                  />
                  {fieldErrors.timezone ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.timezone}
                    </p>
                  ) : null}
                </label>
              </div>
            </section>

            <section className="rounded-[24px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("admin.detail.createSchedule.sections.timeline")}
              </h3>
              <p className="mt-1 text-xs leading-6 text-text-secondary">
                {t("admin.detail.createSchedule.sections.timelineNote")}
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.enrollmentOpenAt")}
                  </span>
                  <input
                    type="datetime-local"
                    value={form.enrollmentOpenAt}
                    onChange={(event) => {
                      setFieldErrors((current) => ({
                        ...current,
                        enrollmentOpenAt: undefined,
                        enrollmentCloseAt: undefined,
                      }));
                      setForm((current) => ({
                        ...current,
                        enrollmentOpenAt: event.target.value,
                      }));
                    }}
                    aria-invalid={Boolean(fieldErrors.enrollmentOpenAt)}
                    className={getFieldClassName(Boolean(fieldErrors.enrollmentOpenAt))}
                  />
                  {fieldErrors.enrollmentOpenAt ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.enrollmentOpenAt}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.enrollmentCloseAt")}
                  </span>
                  <input
                    type="datetime-local"
                    value={form.enrollmentCloseAt}
                    onChange={(event) => {
                      setFieldErrors((current) => ({
                        ...current,
                        enrollmentOpenAt: undefined,
                        enrollmentCloseAt: undefined,
                      }));
                      setForm((current) => ({
                        ...current,
                        enrollmentCloseAt: event.target.value,
                      }));
                    }}
                    aria-invalid={Boolean(fieldErrors.enrollmentCloseAt)}
                    className={getFieldClassName(Boolean(fieldErrors.enrollmentCloseAt))}
                  />
                  {fieldErrors.enrollmentCloseAt ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.enrollmentCloseAt}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.startsAt")}
                  </span>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) => updateStartsAt(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.startsAt)}
                    className={getFieldClassName(Boolean(fieldErrors.startsAt))}
                  />
                  {fieldErrors.startsAt ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.startsAt}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.durationMinutes")}
                  </span>
                  <select
                    value={form.durationMinutes}
                    onChange={(event) => updateDurationMinutes(Number(event.target.value))}
                    aria-invalid={Boolean(fieldErrors.endsAt)}
                    className={getFieldClassName(Boolean(fieldErrors.endsAt))}
                  >
                    {DURATION_OPTIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {t(
                          `admin.detail.createSchedule.durationOptions.${duration}` as Parameters<
                            typeof t
                          >[0],
                        )}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.endsAt ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.endsAt}
                    </p>
                  ) : null}
                </label>

                <label className="block lg:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.endsAt")}
                  </span>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    readOnly
                    aria-readonly="true"
                    tabIndex={-1}
                    aria-invalid={Boolean(fieldErrors.endsAt)}
                    className={getFieldClassName(Boolean(fieldErrors.endsAt))}
                  />
                  <p className="mt-2 text-xs text-text-secondary">
                    {t("admin.detail.createSchedule.durationNote")}
                  </p>
                </label>
              </div>
            </section>

            <details className="group rounded-[24px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-text-primary dark:text-white/95">
                <span>{t("admin.detail.createSchedule.sections.advanced")}</span>
                <ChevronDown className="h-4 w-4 text-text-muted transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-xs leading-6 text-text-secondary">
                {t("admin.detail.createSchedule.sections.advancedNote")}
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.scheduleCode")}
                  </span>
                  <input
                    value={form.scheduleCode}
                    onChange={(event) => {
                      setFieldErrors((current) => ({ ...current, scheduleCode: undefined }));
                      setForm((current) => ({
                        ...current,
                        scheduleCode: event.target.value,
                      }));
                    }}
                    placeholder={t("admin.detail.createSchedule.placeholders.scheduleCode")}
                    aria-invalid={Boolean(fieldErrors.scheduleCode)}
                    className={getFieldClassName(Boolean(fieldErrors.scheduleCode))}
                  />
                  {fieldErrors.scheduleCode ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.scheduleCode}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.externalProvider")}
                  </span>
                  <select
                    value={form.externalRoomProvider}
                    onChange={(event) => {
                      setFieldErrors((current) => ({
                        ...current,
                        externalRoomProvider: undefined,
                        externalRoomJoinUrl: undefined,
                      }));
                      setForm((current) => ({
                        ...current,
                        externalRoomProvider: event.target.value,
                      }));
                    }}
                    aria-invalid={Boolean(fieldErrors.externalRoomProvider)}
                    className={getFieldClassName(Boolean(fieldErrors.externalRoomProvider))}
                  >
                    <option value="">{t("admin.detail.createSchedule.providers.none")}</option>
                    <option value="ZOOM">{t("admin.detail.createSchedule.providers.zoom")}</option>
                  </select>
                  {fieldErrors.externalRoomProvider ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.externalRoomProvider}
                    </p>
                  ) : null}
                </label>

                <label className="block lg:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.externalJoinUrl")}
                  </span>
                  <input
                    value={form.externalRoomJoinUrl}
                    onChange={(event) => {
                      setFieldErrors((current) => ({
                        ...current,
                        externalRoomJoinUrl: undefined,
                      }));
                      setForm((current) => ({
                        ...current,
                        externalRoomJoinUrl: event.target.value,
                      }));
                    }}
                    placeholder={t("admin.detail.createSchedule.placeholders.externalJoinUrl")}
                    aria-invalid={Boolean(fieldErrors.externalRoomJoinUrl)}
                    className={getFieldClassName(Boolean(fieldErrors.externalRoomJoinUrl))}
                  />
                  {fieldErrors.externalRoomJoinUrl ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.externalRoomJoinUrl}
                    </p>
                  ) : null}
                </label>

                <label className="block lg:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("admin.detail.createSchedule.fields.externalHostUrl")}
                  </span>
                  <input
                    value={form.externalRoomHostUrl}
                    onChange={(event) => {
                      setFieldErrors((current) => ({
                        ...current,
                        externalRoomHostUrl: undefined,
                      }));
                      setForm((current) => ({
                        ...current,
                        externalRoomHostUrl: event.target.value,
                      }));
                    }}
                    placeholder={t("admin.detail.createSchedule.placeholders.externalHostUrl")}
                    aria-invalid={Boolean(fieldErrors.externalRoomHostUrl)}
                    className={getFieldClassName(Boolean(fieldErrors.externalRoomHostUrl))}
                  />
                  {fieldErrors.externalRoomHostUrl ? (
                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.externalRoomHostUrl}
                    </p>
                  ) : null}
                </label>
              </div>
            </details>
          </div>

          {feedback ? (
            <p
              className={`mt-4 text-sm ${
                feedback.tone === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={createSchedule.isPending}>
            {t("admin.create.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={createSchedule.isPending}
            startIcon={<Plus className="h-4 w-4" />}
          >
            {createSchedule.isPending
              ? t("admin.detail.createSchedule.submitting")
              : t("admin.detail.createSchedule.submit")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
