"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useCreateAdminTrainingScheduleLecture } from "../hooks/use-training";
import { getAdminTrainingErrorKey } from "../lib/admin-training-errors";
import type { AdminTrainingSchedule, CreateAdminTrainingScheduleLectureInput } from "../types/training.types";

type Props = {
  isOpen: boolean;
  trainingId: string | null;
  schedule: AdminTrainingSchedule | null;
  onClose: () => void;
  onSuccess: () => void;
};

type LectureForm = {
  sessionOrder: string;
  sessionTitle: string;
  startsAt: string;
  endsAt: string;
  externalRoomProvider: string;
  externalRoomJoinUrl: string;
  externalRoomHostUrl: string;
  attendanceTrackingEnabled: boolean;
  isMandatory: boolean;
};

function localIsoToInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function createInitialForm(schedule: AdminTrainingSchedule | null): LectureForm {
  const nextOrder = (schedule?.lectureCount ?? 0) + 1;
  return {
    sessionOrder: String(nextOrder),
    sessionTitle: "",
    startsAt: "",
    endsAt: "",
    externalRoomProvider: schedule?.externalRoomProvider ?? "",
    externalRoomJoinUrl: schedule?.externalRoomJoinUrl ?? "",
    externalRoomHostUrl: schedule?.externalRoomHostUrl ?? "",
    attendanceTrackingEnabled: true,
    isMandatory: true,
  };
}

export default function AdminTrainingScheduleLectureCreateModal({
  isOpen,
  trainingId,
  schedule,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const createLecture = useCreateAdminTrainingScheduleLecture();
  const [form, setForm] = useState<LectureForm>(() => createInitialForm(schedule));
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setForm(createInitialForm(schedule));
  }, [isOpen, schedule]);

  const defaultStart = useMemo(() => schedule?.startsAt ?? null, [schedule?.startsAt]);

  const resetAndClose = () => {
    setFeedback(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trainingId || !schedule) return;
    setFeedback(null);

    if (!form.startsAt.trim() || !form.endsAt.trim()) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.scheduleLectures.create.validation.required"),
      });
      return;
    }

    const startsAt = new Date(form.startsAt);
    const endsAt = new Date(form.endsAt);
    if (!(startsAt < endsAt)) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.scheduleLectures.create.validation.window"),
      });
      return;
    }

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

    const input: CreateAdminTrainingScheduleLectureInput = {
      sessionOrder: Number(form.sessionOrder),
      sessionTitle: form.sessionTitle.trim() || undefined,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      externalRoomProvider: form.externalRoomProvider || undefined,
      externalRoomJoinUrl: form.externalRoomJoinUrl.trim() || undefined,
      externalRoomHostUrl: form.externalRoomHostUrl.trim() || undefined,
      attendanceTrackingEnabled: form.attendanceTrackingEnabled,
      isMandatory: form.isMandatory,
    };

    try {
      await createLecture.mutateAsync({
        trainingId,
        scheduleId: schedule.id,
        input,
      });
      onSuccess();
      resetAndClose();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminTrainingErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} size="lg">
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-2rem)] flex-col">
        <ModalHeader
          eyebrow={t("admin.detail.scheduleLectures.create.eyebrow")}
          title={
            schedule
              ? t("admin.detail.schedules.scheduleCode", { code: schedule.scheduleCode })
              : t("admin.detail.scheduleLectures.create.title")
          }
          description={t("admin.detail.scheduleLectures.create.note")}
        />

        <ModalBody>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.scheduleLectures.create.fields.sessionOrder")}
              </span>
              <input
                type="number"
                min={1}
                value={form.sessionOrder}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sessionOrder: event.target.value }))
                }
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.scheduleLectures.create.fields.sessionTitle")}
              </span>
              <input
                value={form.sessionTitle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sessionTitle: event.target.value }))
                }
                placeholder={t("admin.detail.scheduleLectures.create.placeholders.sessionTitle")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.scheduleLectures.create.fields.startsAt")}
              </span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startsAt: event.target.value }))
                }
                min={defaultStart ? localIsoToInput(defaultStart) : undefined}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.scheduleLectures.create.fields.endsAt")}
              </span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endsAt: event.target.value }))
                }
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.scheduleLectures.create.fields.externalProvider")}
              </span>
              <select
                value={form.externalRoomProvider}
                onChange={(event) =>
                  setForm((current) => ({ ...current, externalRoomProvider: event.target.value }))
                }
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              >
                <option value="">{t("admin.detail.schedules.providers.none")}</option>
                <option value="ZOOM">{t("admin.detail.schedules.providers.zoom")}</option>
              </select>
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.scheduleLectures.create.fields.externalJoinUrl")}
              </span>
              <input
                value={form.externalRoomJoinUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, externalRoomJoinUrl: event.target.value }))
                }
                placeholder={t("admin.detail.schedules.placeholders.externalJoinUrl")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.scheduleLectures.create.fields.externalHostUrl")}
              </span>
              <input
                value={form.externalRoomHostUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, externalRoomHostUrl: event.target.value }))
                }
                placeholder={t("admin.detail.schedules.placeholders.externalHostUrl")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-border-light px-4 py-3 dark:border-white/8">
              <input
                type="checkbox"
                checked={form.attendanceTrackingEnabled}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    attendanceTrackingEnabled: event.target.checked,
                  }))
                }
              />
              <span className="text-sm text-text-secondary">
                {t("admin.detail.scheduleLectures.create.fields.attendanceTrackingEnabled")}
              </span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-border-light px-4 py-3 dark:border-white/8">
              <input
                type="checkbox"
                checked={form.isMandatory}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isMandatory: event.target.checked,
                  }))
                }
              />
              <span className="text-sm text-text-secondary">
                {t("admin.detail.scheduleLectures.create.fields.isMandatory")}
              </span>
            </label>
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              {t("admin.detail.scheduleLectures.create.cancel")}
            </Button>
            <Button type="submit" disabled={createLecture.isPending}>
              {createLecture.isPending
                ? t("admin.detail.scheduleLectures.create.submitting")
                : t("admin.detail.scheduleLectures.create.submit")}
            </Button>
          </div>
          {feedback ? (
            <p
              className={`text-xs ${
                feedback.tone === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
        </ModalFooter>
      </form>
    </Modal>
  );
}
