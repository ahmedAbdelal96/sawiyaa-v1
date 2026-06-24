"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { useUpdateAdminTrainingSchedule } from "../hooks/use-training";
import { getAdminTrainingErrorKey } from "../lib/admin-training-errors";
import type { AdminTrainingSchedule, TrainingScheduleStatus } from "../types/training.types";

type Props = {
  isOpen: boolean;
  trainingId: string | null;
  schedule: AdminTrainingSchedule | null;
  onClose: () => void;
  onSuccess: () => void;
};

type ScheduleUpdateForm = {
  status: TrainingScheduleStatus;
  externalRoomProvider: string;
  externalRoomJoinUrl: string;
  externalRoomHostUrl: string;
};

const SCHEDULE_STATUSES: TrainingScheduleStatus[] = [
  "DRAFT",
  "OPEN_FOR_ENROLLMENT",
  "FULL",
  "STARTED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];

function createInitialForm(schedule: AdminTrainingSchedule | null): ScheduleUpdateForm {
  return {
    status: schedule?.status ?? "DRAFT",
    externalRoomProvider: schedule?.externalRoomProvider ?? "",
    externalRoomJoinUrl: schedule?.externalRoomJoinUrl ?? "",
    externalRoomHostUrl: schedule?.externalRoomHostUrl ?? "",
  };
}

export default function AdminTrainingScheduleUpdateModal({
  isOpen,
  trainingId,
  schedule,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("training");
  const updateSchedule = useUpdateAdminTrainingSchedule();
  const [form, setForm] = useState<ScheduleUpdateForm>(() => createInitialForm(schedule));
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setFeedback(null);
      setForm(createInitialForm(schedule));
    });
  }, [isOpen, schedule]);

  const resetAndClose = () => {
    setFeedback(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trainingId || !schedule) return;
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
          eyebrow={t("admin.detail.scheduleUpdate.eyebrow")}
          title={schedule ? t("admin.detail.schedules.scheduleCode", { code: schedule.scheduleCode }) : t("admin.detail.scheduleUpdate.title")}
          description={t("admin.detail.scheduleUpdate.note")}
        />

        <ModalBody>
          <div className="grid gap-4 lg:grid-cols-2">
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
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              {t("admin.detail.scheduleUpdate.cancel")}
            </Button>
            <Button type="submit" disabled={updateSchedule.isPending}>
              {updateSchedule.isPending
                ? t("admin.detail.schedules.saving")
                : t("admin.detail.scheduleUpdate.submit")}
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
