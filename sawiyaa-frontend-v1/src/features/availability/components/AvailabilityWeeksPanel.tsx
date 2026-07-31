"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Skeleton } from "@/components/shared/LoadingStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { useMyAvailabilityWeeks } from "../hooks/use-availability";
import AvailabilityWeeksWorkspace from "./AvailabilityWeeksWorkspace";

export default function AvailabilityWeeksPanel() {
  const t = useTranslations("practitioner-area.availability");
  const { data, isLoading, isError, error, refetch } = useMyAvailabilityWeeks();

  function getErrorCode(error: unknown) {
    if (!error || typeof error !== "object") return null;
    const candidate = error as { code?: unknown; response?: { data?: { errorCode?: unknown } } };
    return typeof candidate.code === "string"
      ? candidate.code
      : typeof candidate.response?.data?.errorCode === "string"
        ? candidate.response.data.errorCode
        : null;
  }

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
    const timezoneRequired = getErrorCode(error) === "AVAILABILITY_TIMEZONE_REQUIRED";
    if (timezoneRequired) {
      return (
        <SurfaceCard variant="section" className="border-warning-200 bg-warning-50/60">
          <div className="space-y-3">
            <p className="text-base font-semibold text-text-primary">{t("timezone.requiredTitle")}</p>
            <p className="max-w-2xl text-sm leading-6 text-text-secondary">{t("timezone.requiredBody")}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/practitioner/profile" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">{t("timezone.openProfile")}</Link>
              <button type="button" onClick={() => refetch()} className="rounded-xl border border-border-light bg-white px-4 py-2.5 text-sm font-semibold text-text-secondary">{t("feedbackLabels.retry")}</button>
            </div>
          </div>
        </SurfaceCard>
      );
    }
    return (
      <SurfaceCard variant="section">
            <p className="mb-4 text-sm text-error-500">{t("feedbackLabels.loadError")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-xl border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-tertiary dark:border-border-light dark:bg-surface-secondary dark:hover:bg-white/5"
        >
          {t("feedbackLabels.retry")}
        </button>
      </SurfaceCard>
    );
  }

  return <AvailabilityWeeksWorkspace data={data} />;
}
