"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock3, Loader2, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import { formatTimeZoneLabel } from "@/lib/time-formatting";
import { useNowTick } from "../hooks/use-now-tick";
import {
  useAcceptInstantBookingRequest,
  usePractitionerPendingBookingRequests,
  useRejectInstantBookingRequest,
} from "../hooks/use-instant-booking";
import { getPractitionerInstantBookingErrorKey } from "../lib/instant-booking-errors";
import InstantBookingRequestCard from "./InstantBookingRequestCard";

function formatNearestExpiry(expiresAt: string, locale: string, nowMs: number) {
  const diffMs = new Date(expiresAt).getTime() - nowMs;
  if (diffMs <= 0) {
    return locale === "ar" ? "انتهت صلاحية الطلب" : "Request expired";
  }

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const numberFormat = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (locale === "ar") {
      return `أقرب انتهاء خلال ${numberFormat.format(hours)} س ${numberFormat.format(remainingMinutes)} د`;
    }
    return `Nearest expiry in ${numberFormat.format(hours)}h ${numberFormat.format(remainingMinutes)}m`;
  }

  if (locale === "ar") {
    return `أقرب انتهاء خلال ${numberFormat.format(minutes)} د ${numberFormat.format(seconds)} ث`;
  }

  return `Nearest expiry in ${numberFormat.format(minutes)}m ${numberFormat.format(seconds)}s`;
}

export default function PractitionerPendingRequestsPanel() {
  const t = useTranslations("sessions.practitioner.instantBooking");
  const locale = useLocale();
  const nowMs = useNowTick(1000);
  const profileQuery = usePractitionerProfile();
  const { data: requests, isLoading, isError, refetch } = usePractitionerPendingBookingRequests();
  const acceptMutation = useAcceptInstantBookingRequest();
  const rejectMutation = useRejectInstantBookingRequest();
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const pendingRequests = useMemo(
    () => requests ?? [],
    [requests],
  );
  const practitionerTimeZone = profileQuery.data?.profile.timezone ?? null;
  const practitionerTimeZoneLabel = practitionerTimeZone
    ? formatTimeZoneLabel(practitionerTimeZone, { locale })
    : null;
  const nearestRequest = pendingRequests.length
    ? [...pendingRequests].sort(
        (left, right) => new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime(),
      )[0]
    : null;

  const handleAccept = async (requestId: string) => {
    setPageMessage(null);
    setActionErrors((current) => {
      const next = { ...current };
      delete next[requestId];
      return next;
    });

    try {
      await acceptMutation.mutateAsync(requestId);
      setPageMessage(t("queue.feedback.accepted"));
      await refetch();
    } catch (error) {
      const messageKey = getPractitionerInstantBookingErrorKey(error);
      setActionErrors((current) => ({
        ...current,
        [requestId]: t(messageKey as Parameters<typeof t>[0]),
      }));
      await refetch();
    }
  };

  const handleReject = async (requestId: string) => {
    setPageMessage(null);
    setActionErrors((current) => {
      const next = { ...current };
      delete next[requestId];
      return next;
    });

    try {
      await rejectMutation.mutateAsync({ requestId });
      setPageMessage(t("queue.feedback.rejected"));
      await refetch();
    } catch (error) {
      const messageKey = getPractitionerInstantBookingErrorKey(error);
      setActionErrors((current) => ({
        ...current,
        [requestId]: t(messageKey as Parameters<typeof t>[0]),
      }));
      await refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="h-24 animate-pulse rounded-[28px] border border-border-light bg-surface-secondary dark:bg-white/5" />
    );
  }

  if (isError) {
    return (
      <div className="rounded-[28px] border border-border-light bg-surface-secondary p-4 text-sm text-text-secondary dark:bg-white/5">
        <p className="mb-3 text-sm font-semibold text-text-primary dark:text-white/95">
          {t("queue.errors.loadingHeading")}
        </p>
        <p>{t("queue.errors.loadingNote")}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/25 hover:bg-primary-light/40 hover:text-primary"
        >
          <Clock3 className="h-4 w-4" />
          {t("queue.errors.retry")}
        </button>
      </div>
    );
  }

  if (!pendingRequests.length) {
    return null;
  }

  return (
    <section className="mb-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
            <Zap className="h-3.5 w-3.5" />
            {t("queue.eyebrow")}
          </div>
          <h2 className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
            {t("queue.title")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-text-secondary">{t("queue.pendingNote")}</p>
        </div>

        <Link
          href="/practitioner/instant-booking"
          className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-surface-secondary px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary/25 hover:bg-primary-light/40 hover:text-primary"
        >
          {t("queue.dashboardLink")}
        </Link>
      </div>

      <div className="grid gap-3 rounded-[28px] border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70 dark:bg-white/10 dark:text-amber-100 dark:ring-amber-500/20">
            {pendingRequests.length} {t("queue.summary.pendingCount")}
          </span>
          {nearestRequest ? (
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-text-secondary ring-1 ring-border-light dark:bg-white/10 dark:text-white/80 dark:ring-white/10">
              {formatNearestExpiry(nearestRequest.expiresAt, locale, nowMs)}
            </span>
          ) : null}
        </div>
        {practitionerTimeZoneLabel ? (
          <p className="text-xs text-text-muted">
            {t("queue.summary.timezoneNote", { timeZone: practitionerTimeZoneLabel })}
          </p>
        ) : null}

        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <InstantBookingRequestCard
              key={request.id}
              request={request}
              nowMs={nowMs}
              timeZone={practitionerTimeZone}
              onAccept={handleAccept}
              onReject={handleReject}
              acceptingRequestId={acceptMutation.isPending ? acceptMutation.variables ?? null : null}
              rejectingRequestId={
                rejectMutation.isPending ? rejectMutation.variables?.requestId ?? null : null
              }
              actionError={actionErrors[request.id] ?? null}
            />
          ))}
        </div>
      </div>

      {pageMessage ? (
        <div className="rounded-[22px] border border-success-200 bg-success-light px-4 py-3 text-sm font-medium text-success-800 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-200">
          {pageMessage}
        </div>
      ) : null}
    </section>
  );
}
