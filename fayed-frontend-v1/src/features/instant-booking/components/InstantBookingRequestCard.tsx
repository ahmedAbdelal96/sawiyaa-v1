"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock3, Loader2, Sparkles, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { formatPractitionerOrViewerDateTime } from "@/lib/time-formatting";
import type { InstantBookingRequest } from "../types/instant-booking.types";

type Props = {
  request: InstantBookingRequest;
  nowMs: number;
  onAccept: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  acceptingRequestId: string | null;
  rejectingRequestId: string | null;
  actionError: string | null;
  timeZone: string | null;
};

function formatTimeLeft(expiresAt: string, nowMs: number, locale: string): string {
  const diffMs = new Date(expiresAt).getTime() - nowMs;
  if (diffMs <= 0) {
    return locale === "ar" ? "انتهت صلاحية الطلب" : "Request expired";
  }

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatNumber = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (locale === "ar") {
      return `ينتهي خلال ${formatNumber.format(hours)} س ${formatNumber.format(remainingMinutes)} د`;
    }
    return `Expires in ${formatNumber.format(hours)}h ${formatNumber.format(remainingMinutes)}m`;
  }

  if (locale === "ar") {
    return `ينتهي خلال ${formatNumber.format(minutes)} د ${formatNumber.format(seconds)} ث`;
  }

  return `Expires in ${formatNumber.format(minutes)}m ${formatNumber.format(seconds)}s`;
}

function getInitials(name: string | null | undefined) {
  const clean = name?.trim() ?? "";
  if (!clean) {
    return "PR";
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function statusTone(status: InstantBookingRequest["status"]) {
  switch (status) {
    case "PENDING":
      return "amber" as const;
    case "ACCEPTED":
      return "emerald" as const;
    case "REJECTED":
    case "EXPIRED":
    case "CANCELLED":
    default:
      return "slate" as const;
  }
}

export default function InstantBookingRequestCard({
  request,
  nowMs,
  onAccept,
  onReject,
  acceptingRequestId,
  rejectingRequestId,
  actionError,
  timeZone,
}: Props) {
  const t = useTranslations("sessions.practitioner.instantBooking");
  const locale = useLocale();
  const [rejectOpen, setRejectOpen] = useState(false);
  const isPending = request.status === "PENDING";
  const isAccepted = request.status === "ACCEPTED";
  const isTerminal = !isPending && !isAccepted;
  const tone = statusTone(request.status);
  const displayName = request.patient?.displayName?.trim() || t("queue.unknownPatient");
  const initials = getInitials(request.patient?.displayName);
  const durationLabel = t("queue.durationLabel", {
    n: request.requestedDurationMinutes,
  });
  const modeLabel = t(`queue.sessionModes.${request.sessionMode}` as Parameters<typeof t>[0]);
  const requestedAtLabel = formatPractitionerOrViewerDateTime(request.requestedAt, timeZone, {
    locale: locale === "ar" ? "ar-SA" : "en-US",
    fallbackText: "-",
  });
  const expiresAtLabel = formatPractitionerOrViewerDateTime(request.expiresAt, timeZone, {
    locale: locale === "ar" ? "ar-SA" : "en-US",
    fallbackText: "-",
  });
  const timeLeftLabel = formatTimeLeft(request.expiresAt, nowMs, locale);
  const requestStatusLabel = t(`queue.statuses.${request.status}` as Parameters<typeof t>[0]);
  const responseReason = request.responseReason?.trim() ?? "";
  const shouldShowResponseReason = request.status === "REJECTED" && responseReason.length > 0;
  const statusClassName = useMemo(() => {
    if (tone === "amber") {
      return "border-amber-200/80 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10";
    }

    if (tone === "emerald") {
      return "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10";
    }

    return "border-border-light bg-surface-primary dark:bg-white/5";
  }, [tone]);

  const badgeClassName = useMemo(() => {
    if (tone === "amber") {
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200";
    }

    if (tone === "emerald") {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200";
    }

    return "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/80";
  }, [tone]);

  const noteKey =
    request.status === "PENDING"
      ? "queue.notes.pending"
      : request.status === "ACCEPTED"
        ? "queue.notes.accepted"
        : request.status === "REJECTED"
          ? "queue.notes.rejected"
          : request.status === "EXPIRED"
            ? "queue.notes.expired"
            : "queue.notes.cancelled";

  const isAccepting = acceptingRequestId === request.id;
  const isRejecting = rejectingRequestId === request.id;
  const requestExpired = new Date(request.expiresAt).getTime() <= nowMs;
  const disableActions = !isPending || requestExpired || isAccepting || isRejecting;

  return (
    <article className={cn("rounded-[28px] border p-4 shadow-sm transition", statusClassName)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm font-semibold text-text-brand shadow-sm ring-1 ring-border-light dark:bg-white/10 dark:text-white/90 dark:ring-white/10">
            {initials}
          </div>

          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("queue.patientLabel")}
              </p>
              <h3 className="mt-1 text-base font-semibold text-text-primary dark:text-white/95">
                {displayName}
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-border-light dark:bg-white/10 dark:text-white/80 dark:ring-white/10">
                {durationLabel}
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-border-light dark:bg-white/10 dark:text-white/80 dark:ring-white/10">
                {modeLabel}
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-border-light dark:bg-white/10 dark:text-white/80 dark:ring-white/10">
                {requestedAtLabel}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  badgeClassName,
                )}
              >
                {requestStatusLabel}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-border-light dark:bg-white/5 dark:ring-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("queue.expiresAtLabel")}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                  {expiresAtLabel}
                </p>
              </div>

              <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-border-light dark:bg-white/5 dark:ring-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("queue.countdownLabel")}
                </p>
                <p className={cn("mt-1 text-sm font-semibold", requestExpired ? "text-error-600" : "text-text-primary dark:text-white/95")}>
                  {requestExpired ? t("queue.expiredShort") : timeLeftLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
          {isPending ? (
            <>
              <Button
                variant="primary"
                size="sm"
                disabled={disableActions}
                onClick={() => void onAccept(request.id)}
                startIcon={
                  isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />
                }
              >
                {isAccepting ? t("queue.actions.accepting") : t("queue.actions.accept")}
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={disableActions}
                onClick={() => setRejectOpen(true)}
                startIcon={isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              >
                {isRejecting ? t("queue.actions.rejecting") : t("queue.actions.reject")}
              </Button>
            </>
          ) : null}

          {isAccepted && request.createdSessionId ? (
            <Link
              href={`/practitioner/sessions/${request.createdSessionId}` as never}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("queue.actions.viewSession")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/60 bg-white/60 px-4 py-3 text-sm leading-6 text-text-secondary dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start gap-2">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p>{t(noteKey as Parameters<typeof t>[0])}</p>
            {shouldShowResponseReason ? <p className="text-xs text-text-muted">{responseReason}</p> : null}
            {actionError ? <p className="text-xs text-error-600">{actionError}</p> : null}
          </div>
        </div>
      </div>

      <DestructiveConfirmModal
        isOpen={rejectOpen}
        onClose={() => {
          if (!isRejecting) {
            setRejectOpen(false);
          }
        }}
        size="sm"
        title={t("queue.rejectConfirm.heading")}
        description={t("queue.rejectConfirm.note")}
        confirmLabel={
          isRejecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("queue.actions.rejecting")}
            </>
          ) : (
            t("queue.rejectConfirm.confirm")
          )
        }
        cancelLabel={t("queue.rejectConfirm.cancel")}
        onConfirm={() => {
          setRejectOpen(false);
          void onReject(request.id);
        }}
        loading={isRejecting}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-medium">{displayName}</p>
          <p className="mt-1 text-xs opacity-80">{timeLeftLabel}</p>
        </div>
      </DestructiveConfirmModal>
    </article>
  );
}
