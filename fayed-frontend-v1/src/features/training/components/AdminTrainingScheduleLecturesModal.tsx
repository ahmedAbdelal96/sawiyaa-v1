"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ClipboardList } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { useAdminTrainingScheduleLectures } from "../hooks/use-training";
import { formatTrainingDatetime } from "./training-utils";
import type { AdminTrainingSchedule } from "../types/training.types";

type Props = {
  isOpen: boolean;
  trainingId: string | null;
  schedule: AdminTrainingSchedule | null;
  onClose: () => void;
};

export default function AdminTrainingScheduleLecturesModal({
  isOpen,
  trainingId,
  schedule,
  onClose,
}: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const lectureQuery = useAdminTrainingScheduleLectures(
    trainingId,
    schedule?.id ?? null,
  );

  const items = lectureQuery.data?.items ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader
        eyebrow={t("admin.detail.scheduleLectures.eyebrow")}
        title={
          schedule
            ? t("admin.detail.schedules.scheduleCode", { code: schedule.scheduleCode })
            : t("admin.detail.scheduleLectures.title")
        }
        description={t("admin.detail.scheduleLectures.note")}
      />

      <ModalBody>
        {lectureQuery.isLoading ? (
          <ListStateSkeleton items={4} heightClass="h-20" />
        ) : lectureQuery.isError ? (
          <StateCard
            title={t("admin.detail.scheduleLectures.states.error.heading")}
            note={t("admin.detail.scheduleLectures.states.error.note")}
          />
        ) : items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-3 py-1 font-medium dark:bg-white/5">
                <ClipboardList className="h-3.5 w-3.5" />
                {t("admin.detail.scheduleLectures.count", { value: items.length })}
              </span>
              {schedule?.startsAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-3 py-1 font-medium dark:bg-white/5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatTrainingDatetime(schedule.startsAt, locale)}
                </span>
              ) : null}
            </div>

            {items.map((lecture) => (
              <div
                key={lecture.id}
                className="rounded-[22px] border border-border-light bg-white px-4 py-4 dark:border-white/8 dark:bg-white/[0.03]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("admin.detail.scheduleLectures.lectureLabel", {
                        value: lecture.sessionOrder,
                      })}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {lecture.sessionTitle ?? t("admin.detail.scheduleLectures.noTitle")}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary dark:bg-white/5 dark:text-white/70">
                    {lecture.isMandatory
                      ? t("admin.detail.scheduleLectures.mandatory")
                      : t("admin.detail.scheduleLectures.optional")}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border-light/60 bg-surface-secondary/60 px-3 py-2 dark:border-white/8 dark:bg-white/[0.02]">
                    <p className="text-xs font-medium text-text-muted">
                      {t("admin.detail.scheduleLectures.startsAt")}
                    </p>
                    <p className="mt-1 text-sm text-text-primary dark:text-white/95">
                      {formatTrainingDatetime(lecture.startsAt, locale) || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border-light/60 bg-surface-secondary/60 px-3 py-2 dark:border-white/8 dark:bg-white/[0.02]">
                    <p className="text-xs font-medium text-text-muted">
                      {t("admin.detail.scheduleLectures.endsAt")}
                    </p>
                    <p className="mt-1 text-sm text-text-primary dark:text-white/95">
                      {formatTrainingDatetime(lecture.endsAt, locale) || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                  <span className="rounded-full bg-surface-tertiary px-2.5 py-1 dark:bg-white/5">
                    {lecture.externalRoomProvider ??
                      t("admin.detail.scheduleLectures.noRoom")}
                  </span>
                  <span className="rounded-full bg-surface-tertiary px-2.5 py-1 dark:bg-white/5">
                    {lecture.attendanceTrackingEnabled
                      ? t("admin.detail.scheduleLectures.attendanceOn")
                      : t("admin.detail.scheduleLectures.attendanceOff")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <StateCard
            title={t("admin.detail.scheduleLectures.states.empty.heading")}
            note={t("admin.detail.scheduleLectures.states.empty.note")}
          />
        )}
      </ModalBody>
    </Modal>
  );
}
