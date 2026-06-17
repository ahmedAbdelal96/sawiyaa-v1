"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Clock3, RefreshCw, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceActionLink, SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import { formatTimeZoneLabel } from "@/lib/time-formatting";
import { useNowTick } from "../hooks/use-now-tick";
import {
  useAcceptInstantBookingRequest,
  usePractitionerInstantBookingRequests,
  useRejectInstantBookingRequest,
} from "../hooks/use-instant-booking";
import { getPractitionerInstantBookingErrorKey } from "../lib/instant-booking-errors";
import type { InstantBookingRequest } from "../types/instant-booking.types";
import InstantBookingRequestCard from "./InstantBookingRequestCard";

function formatRelativeExpiry(expiresAt: string, locale: string, nowMs: number): string {
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

type QueueSectionProps = {
  title: string;
  subtitle?: string;
  requests: InstantBookingRequest[];
  nowMs: number;
  timeZone: string | null;
  acceptingRequestId: string | null;
  rejectingRequestId: string | null;
  actionErrors: Record<string, string>;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
};

function QueueSection({
  title,
  subtitle,
  requests,
  nowMs,
  timeZone,
  acceptingRequestId,
  rejectingRequestId,
  actionErrors,
  onAccept,
  onReject,
}: QueueSectionProps) {
  if (requests.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-text-secondary">{subtitle}</p> : null}
        </div>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <InstantBookingRequestCard
            key={request.id}
            request={request}
            nowMs={nowMs}
            timeZone={timeZone}
            onAccept={async (requestId) => {
              onAccept(requestId);
            }}
            onReject={async (requestId) => {
              onReject(requestId);
            }}
            acceptingRequestId={acceptingRequestId}
            rejectingRequestId={rejectingRequestId}
            actionError={actionErrors[request.id] ?? null}
          />
        ))}
      </div>
    </section>
  );
}

export default function PractitionerInstantBookingRequestsScreen() {
  const t = useTranslations("sessions.practitioner.instantBooking");
  const locale = useLocale();
  const nowMs = useNowTick(1000);
  const profileQuery = usePractitionerProfile();
  const requestsQuery = usePractitionerInstantBookingRequests();
  const acceptMutation = useAcceptInstantBookingRequest();
  const rejectMutation = useRejectInstantBookingRequest();
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!pageMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPageMessage(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [pageMessage]);

  const requests = requestsQuery.data ?? [];
  const practitionerTimeZone = profileQuery.data?.profile.timezone ?? null;
  const practitionerTimeZoneLabel = practitionerTimeZone
    ? formatTimeZoneLabel(practitionerTimeZone, { locale })
    : null;
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "PENDING"),
    [requests],
  );
  const handledRequests = useMemo(
    () => requests.filter((request) => request.status !== "PENDING"),
    [requests],
  );
  const nearestExpiry = useMemo(() => {
    if (pendingRequests.length === 0) {
      return null;
    }

    return [...pendingRequests].sort(
      (left, right) =>
        new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime(),
    )[0];
  }, [pendingRequests]);

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
      await requestsQuery.refetch();
    } catch (error) {
      const messageKey = getPractitionerInstantBookingErrorKey(error);
      setActionErrors((current) => ({
        ...current,
        [requestId]: t(messageKey as Parameters<typeof t>[0]),
      }));
      await requestsQuery.refetch();
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
      await requestsQuery.refetch();
    } catch (error) {
      const messageKey = getPractitionerInstantBookingErrorKey(error);
      setActionErrors((current) => ({
        ...current,
        [requestId]: t(messageKey as Parameters<typeof t>[0]),
      }));
      await requestsQuery.refetch();
    }
  };

  if (requestsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SurfaceCard variant="section" className="space-y-4">
          <SurfaceHeader
            eyebrow={t("queue.eyebrow")}
            title={t("queue.title")}
            description={t("queue.subtitle")}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 rounded-[22px] bg-surface-tertiary" />
            <div className="h-24 rounded-[22px] bg-surface-tertiary" />
            <div className="h-24 rounded-[22px] bg-surface-tertiary" />
          </div>
        </SurfaceCard>
        <ListStateSkeleton items={3} heightClass="h-[220px]" />
      </div>
    );
  }

  if (requestsQuery.isError) {
    return (
      <SurfaceCard variant="section">
        <StateCard
          icon={<AlertCircle className="h-5 w-5 text-primary" />}
          title={t("queue.errors.loadingHeading")}
          note={t("queue.errors.loadingNote")}
          action={{
            label: t("queue.errors.retry"),
            onClick: () => void requestsQuery.refetch(),
          }}
        />
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-5">
      <SurfaceCard variant="section" className="space-y-4">
        <SurfaceHeader
          eyebrow={t("queue.eyebrow")}
          title={t("queue.title")}
          description={t("queue.subtitle")}
          actions={
            <Link
              href="/practitioner/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-surface-secondary px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary/25 hover:bg-primary-light/40 hover:text-primary"
            >
              {t("queue.dashboardLink")}
            </Link>
          }
        />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-amber-200/70 bg-amber-50/80 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">
              {t("queue.summary.pendingCount")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-900 dark:text-amber-100">
              {pendingRequests.length}
            </p>
          </div>
          <div className="rounded-[22px] border border-border-light bg-surface-tertiary px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("queue.summary.nearestExpiry")}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
              {nearestExpiry ? formatRelativeExpiry(nearestExpiry.expiresAt, locale, nowMs) : t("queue.summary.noPending")}
            </p>
          </div>
          <div className="rounded-[22px] border border-primary/15 bg-primary-light/20 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-brand">
              {t("queue.summary.liveHintTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {t("queue.summary.liveHint")}
            </p>
          </div>
        </div>
        {practitionerTimeZoneLabel ? (
          <p className="text-xs text-text-muted">
            {t("queue.summary.timezoneNote", { timeZone: practitionerTimeZoneLabel })}
          </p>
        ) : null}
      </SurfaceCard>

      {pageMessage ? (
        <div className="rounded-[22px] border border-success-200 bg-success-light px-4 py-3 text-sm font-medium text-success-800 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-200">
          {pageMessage}
        </div>
      ) : null}

      {requests.length === 0 ? (
        <SurfaceCard variant="section">
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-text-brand">
              <Zap className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("queue.empty.title")}
              </h2>
              <p className="max-w-xl text-sm leading-6 text-text-secondary">
                {t("queue.empty.note")}
              </p>
            </div>
          </div>
        </SurfaceCard>
      ) : (
        <div className="space-y-6">
          <QueueSection
            title={t("queue.pendingHeading")}
            subtitle={t("queue.pendingNote")}
            requests={pendingRequests}
            nowMs={nowMs}
            timeZone={practitionerTimeZone}
            acceptingRequestId={acceptMutation.isPending ? acceptMutation.variables ?? null : null}
            rejectingRequestId={
              rejectMutation.isPending ? rejectMutation.variables?.requestId ?? null : null
            }
            actionErrors={actionErrors}
            onAccept={handleAccept}
            onReject={handleReject}
          />

          <QueueSection
            title={t("queue.handledHeading")}
            subtitle={t("queue.handledNote")}
            requests={handledRequests}
            nowMs={nowMs}
            timeZone={practitionerTimeZone}
            acceptingRequestId={acceptMutation.isPending ? acceptMutation.variables ?? null : null}
            rejectingRequestId={
              rejectMutation.isPending ? rejectMutation.variables?.requestId ?? null : null
            }
            actionErrors={actionErrors}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </div>
      )}
    </div>
  );
}
