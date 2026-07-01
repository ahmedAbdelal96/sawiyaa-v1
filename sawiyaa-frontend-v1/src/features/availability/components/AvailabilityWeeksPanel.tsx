"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/shared/LoadingStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { useMyAvailabilityWeeks } from "../hooks/use-availability";
import AvailabilityWeeksWorkspace from "./AvailabilityWeeksWorkspace";

export default function AvailabilityWeeksPanel() {
  const t = useTranslations("practitioner-area.availability");
  const { data, isLoading, isError, refetch } = useMyAvailabilityWeeks();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SurfaceCard variant="section" className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          <Skeleton className="h-24 w-full rounded-[22px]" />
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-[220px] rounded-[24px]" />
            <Skeleton className="h-[220px] rounded-[24px]" />
          </div>
          <Skeleton className="h-[520px] w-full rounded-[26px]" />
        </SurfaceCard>
      </div>
    );
  }

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

  return <AvailabilityWeeksWorkspace data={{ weeks: data }} />;
}
