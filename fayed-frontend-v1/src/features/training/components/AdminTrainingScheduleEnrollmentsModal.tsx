"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Users } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { useAdminTrainingScheduleEnrollments } from "../hooks/use-training";
import { formatTrainingDatetime, getEnrollmentStatusTone, getStatusToneClasses } from "./training-utils";
import type { AdminTrainingSchedule } from "../types/training.types";

type Props = {
  isOpen: boolean;
  trainingId: string | null;
  schedule: AdminTrainingSchedule | null;
  onClose: () => void;
};

export default function AdminTrainingScheduleEnrollmentsModal({
  isOpen,
  trainingId,
  schedule,
  onClose,
}: Props) {
  const t = useTranslations("training");
  const locale = useLocale();
  const enrollmentQuery = useAdminTrainingScheduleEnrollments(
    trainingId,
    schedule?.id ?? null,
    {
      page: 1,
      limit: 100,
    },
  );

  const items = enrollmentQuery.data?.items ?? [];
  const totalItems = enrollmentQuery.data?.pagination.totalItems ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader
        eyebrow={t("admin.detail.scheduleEnrollments.eyebrow")}
        title={
          schedule
            ? t("admin.detail.schedules.scheduleCode", { code: schedule.scheduleCode })
            : t("admin.detail.scheduleEnrollments.title")
        }
        description={t("admin.detail.scheduleEnrollments.note")}
      />

      <ModalBody>
        {enrollmentQuery.isLoading ? (
          <ListStateSkeleton items={4} heightClass="h-20" />
        ) : enrollmentQuery.isError ? (
          <StateCard
            title={t("admin.detail.scheduleEnrollments.states.error.heading")}
            note={t("admin.detail.scheduleEnrollments.states.error.note")}
          />
        ) : items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-3 py-1 font-medium dark:bg-white/5">
                <Users className="h-3.5 w-3.5" />
                {t("admin.detail.scheduleEnrollments.count", { value: totalItems })}
              </span>
              {schedule?.startsAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-3 py-1 font-medium dark:bg-white/5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatTrainingDatetime(schedule.startsAt, locale)}
                </span>
              ) : null}
            </div>

            {items.map((enrollment) => {
              const tone = getEnrollmentStatusTone(enrollment.enrollmentStatus);

              return (
                <div
                  key={enrollment.id}
                  className="rounded-[22px] border border-border-light bg-white px-4 py-4 dark:border-white/8 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                        {enrollment.patientDisplayName ?? t("admin.detail.scheduleEnrollments.patientFallback")}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {t("admin.detail.scheduleEnrollments.enrolledAt", {
                          value: formatTrainingDatetime(enrollment.enrolledAt, "ar"),
                        })}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusToneClasses(
                        tone,
                      )}`}
                    >
                      {t(`statuses.enrollment.${enrollment.enrollmentStatus}` as Parameters<typeof t>[0])}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                    <span className="rounded-full bg-surface-tertiary px-2.5 py-1 dark:bg-white/5">
                      {t("admin.detail.scheduleEnrollments.attendance", {
                        value: t(
                          `statuses.attendance.${enrollment.attendanceStatus}` as Parameters<typeof t>[0],
                        ),
                      })}
                    </span>
                    {enrollment.paymentStatus ? (
                      <span className="rounded-full bg-surface-tertiary px-2.5 py-1 dark:bg-white/5">
                        {t("admin.detail.scheduleEnrollments.paymentStatus", {
                          value: enrollment.paymentStatus,
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <StateCard
            title={t("admin.detail.scheduleEnrollments.states.empty.heading")}
            note={t("admin.detail.scheduleEnrollments.states.empty.note")}
          />
        )}
      </ModalBody>
    </Modal>
  );
}
