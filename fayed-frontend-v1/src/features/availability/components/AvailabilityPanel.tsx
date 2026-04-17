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
        {/* Schedule skeleton */}
        <SurfaceCard variant="section">
          <Skeleton className="mb-1 h-5 w-40" />
          <Skeleton className="mb-5 h-4 w-64" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <Skeleton className="h-4 w-20" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-28 rounded-lg" />
                <Skeleton className="h-7 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </SurfaceCard>
        {/* Exceptions skeleton */}
        <SurfaceCard variant="section">
          <Skeleton className="mb-1 h-5 w-40" />
          <Skeleton className="mb-5 h-4 w-56" />
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
