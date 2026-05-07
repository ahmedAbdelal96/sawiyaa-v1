"use client";

import { useTranslations } from "next-intl";
import { useMyAvailability } from "../hooks/use-availability";
import { Skeleton } from "@/components/shared/LoadingStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import WeeklyScheduleEditor from "./WeeklyScheduleEditor";
import AvailabilityExceptionsList from "./AvailabilityExceptionsList";

export default function AvailabilityPanel() {
  const t = useTranslations("practitioner-area.availability");
  const { data, isLoading, isError, refetch } = useMyAvailability();

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SurfaceCard variant="section" className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[120px] rounded-[22px]" />
            ))}
          </div>

          <Skeleton className="h-14 w-full rounded-[22px]" />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
            <div className="space-y-4">
              <Skeleton className="h-[220px] w-full rounded-[22px]" />
              <Skeleton className="h-[300px] w-full rounded-[22px]" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-[250px] w-full rounded-[22px]" />
              <Skeleton className="h-[160px] w-full rounded-[22px]" />
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard variant="section" className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </SurfaceCard>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error
  // -------------------------------------------------------------------------

  if (isError || !data) {
    return (
      <SurfaceCard variant="section">
        <p className="mb-4 text-sm text-error-500">{t("feedback.loadError")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-xl border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-tertiary dark:border-border-light dark:bg-surface-secondary dark:hover:bg-white/5"
        >
          {t("feedback.retry")}
        </button>
      </SurfaceCard>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <WeeklyScheduleEditor data={data} />
      <AvailabilityExceptionsList data={data} />
    </div>
  );
}
