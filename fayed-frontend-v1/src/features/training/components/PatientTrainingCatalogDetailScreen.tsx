"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { AlertTriangle, CalendarDays, Loader2, Users } from "lucide-react";
import { toAppError } from "@/lib/api/errors";
import { StateCard } from "@/components/shared/ContentStates";
import { useCreatePatientTrainingEnrollment } from "../hooks/use-training";
import type { PublicTrainingDetails, TrainingSchedule } from "../types/training.types";
import {
  formatTrainingDatetime,
  getOpenSchedulesCount,
  getScheduleStatusTone,
  getStatusToneClasses,
  getTrainingAvailabilityKey,
} from "./training-utils";

type Props = {
  training: PublicTrainingDetails;
};

function ScheduleCard({
  schedule,
  trainingTitle,
}: {
  schedule: TrainingSchedule;
  trainingTitle: string;
}) {
  const t = useTranslations("training");
  const locale = useLocale();
  const router = useRouter();
  const createEnrollment = useCreatePatientTrainingEnrollment();
  const [inlineError, setInlineError] = useState<string | null>(null);

  const tone = getScheduleStatusTone(schedule.status);

  const handleStart = async () => {
    setInlineError(null);

    try {
      const result = await createEnrollment.mutateAsync({
        scheduleId: schedule.id,
      });
      router.push(`/patient/training/${result.item.id}` as never);
    } catch (error) {
      const appError = toAppError(error);
      if (appError.statusCode === 409) {
        setInlineError(t("patient.catalogDetail.actions.alreadyEnrolled"));
        return;
      }
      setInlineError(t("patient.catalogDetail.actions.error"));
    }
  };

  return (
    <div className="rounded-[24px] border border-border-light bg-surface-primary p-5 dark:bg-white/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusToneClasses(tone)}`}
            >
              {t(`statuses.schedule.${schedule.status}` as Parameters<typeof t>[0])}
            </span>
            <span className="text-xs text-text-muted">
              {t("patient.catalogDetail.scheduleCode", { code: schedule.scheduleCode })}
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-text-primary dark:text-white/95">
            {trainingTitle}
          </h3>
        </div>

        {schedule.isEnrollmentOpen ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={createEnrollment.isPending}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createEnrollment.isPending ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("patient.catalogDetail.actions.starting")}
              </>
            ) : (
              t("patient.catalogDetail.actions.start")
            )}
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("patient.catalogDetail.startsAt")}
          </p>
          <p className="mt-1 font-medium text-text-primary dark:text-white/90">
            {schedule.startsAt
              ? formatTrainingDatetime(schedule.startsAt, locale)
              : t("patient.catalogDetail.notScheduled")}
          </p>
        </div>

        <div className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("patient.catalogDetail.seats")}
          </p>
          <p className="mt-1 font-medium text-text-primary dark:text-white/90">
            {schedule.availableSeats !== null
              ? t("patient.catalogDetail.availableSeats", { value: schedule.availableSeats })
              : t("patient.catalogDetail.seatsOpen")}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-secondary dark:bg-white/5">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
        <p>
          {t(
            `patient.catalogDetail.availability.${getTrainingAvailabilityKey(schedule.enrollmentAvailabilityReason)}` as Parameters<typeof t>[0],
          )}
        </p>
      </div>

      {schedule.availableSeats !== null ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
          <Users className="h-3.5 w-3.5" />
          {t("patient.catalogDetail.capacity", {
            available: schedule.availableSeats,
            total: schedule.maxEnrollments ?? 0,
          })}
        </div>
      ) : null}

      {inlineError ? (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/10 dark:text-amber-300">
          {inlineError}
        </p>
      ) : null}
    </div>
  );
}

export default function PatientTrainingCatalogDetailScreen({ training }: Props) {
  const t = useTranslations("training");
  const openSchedules = getOpenSchedulesCount(training);

  return (
    <div className="app-max-content mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/patient/training"
          className="inline-flex items-center justify-center rounded-full border border-border-light px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-secondary dark:hover:bg-white/5"
        >
          {t("patient.catalogDetail.back")}
        </Link>
        <Link
          href="/patient/support"
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm text-primary transition hover:underline"
        >
          {t("patient.catalogDetail.support")}
        </Link>
      </div>

      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("patient.catalogDetail.eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
          {training.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
          {training.shortDescription ??
            training.fullDescription ??
            t("patient.catalogDetail.fallbackDescription")}
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("patient.catalogDetail.scopeHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>{t("patient.catalogDetail.scopeItems.enroll")}</li>
              <li>{t("patient.catalogDetail.scopeItems.pay")}</li>
              <li>{t("patient.catalogDetail.scopeItems.join")}</li>
            </ul>
          </div>
          <div className="rounded-[24px] border border-border-light bg-surface-primary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("patient.catalogDetail.boundaryHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>{t("patient.catalogDetail.boundaryItems.noCurriculum")}</li>
              <li>{t("patient.catalogDetail.boundaryItems.noAssignments")}</li>
              <li>{t("patient.catalogDetail.boundaryItems.noCertificates")}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
            {t("patient.catalogDetail.schedulesHeading")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {openSchedules > 0
              ? t("patient.catalogDetail.openSchedulesNote", { value: openSchedules })
              : t("patient.catalogDetail.closedSchedulesNote")}
          </p>
        </div>

        {training.schedules.length > 0 ? (
          <div className="space-y-4">
            {training.schedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                trainingTitle={training.title}
              />
            ))}
          </div>
        ) : (
          <StateCard
            icon={<AlertTriangle className="h-5 w-5 text-primary" />}
            title={t("patient.catalogDetail.states.empty.heading")}
            note={t("patient.catalogDetail.states.empty.note")}
            centered={false}
            className="rounded-[24px] p-5"
          />
        )}
      </section>
    </div>
  );
}
