"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Clock, Loader2, Zap } from "lucide-react";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import {
  useAcceptInstantBookingRequest,
  usePractitionerPendingBookingRequests,
  useRejectInstantBookingRequest,
} from "../hooks/use-instant-booking";
import type { InstantBookingRequest } from "../types/instant-booking.types";

function formatExpiry(isoString: string, numLocale: string): string {
  return new Date(isoString).toLocaleString(numLocale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

type RequestCardProps = {
  request: InstantBookingRequest;
};

function RequestCard({ request }: RequestCardProps) {
  const t = useTranslations("sessions.practitioner.instantBooking");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const acceptMutation = useAcceptInstantBookingRequest();
  const rejectMutation = useRejectInstantBookingRequest();

  const [confirmingReject, setConfirmingReject] = useState(false);
  const [acceptedSessionId, setAcceptedSessionId] = useState<string | null>(null);

  const handleAccept = async () => {
    try {
      const result = await acceptMutation.mutateAsync(request.id);
      setAcceptedSessionId(result.createdSessionId);
    } catch {
      // error shown inline
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({ requestId: request.id });
      setConfirmingReject(false);
    } catch {
      // error shown inline
    }
  };

  // After acceptance — show success state
  if (acceptedSessionId) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800/40 dark:bg-green-900/10">
        <p className="mb-2 text-sm text-green-700 dark:text-green-400">
          {t("acceptedNote")}
        </p>
        <Link
          href={`/practitioner/sessions/${acceptedSessionId}` as never}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
        >
          {t("viewSession")}
        </Link>
      </div>
    );
  }

  const isBusy = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <div className="rounded-2xl border border-border-light bg-surface-primary p-4 dark:bg-white/5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary dark:text-white/90">
            {t("requestFrom")}{" "}
            {request.patient?.displayName ?? "—"}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
            <span>{t("duration", { n: request.requestedDurationMinutes })}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {t("expiresAt")} {formatExpiry(request.expiresAt, numLocale)}
            </span>
          </div>
        </div>
      </div>

      {/* Error feedback */}
      {acceptMutation.isError && (
        <p className="mb-2 text-xs text-red-500">{t("acceptError")}</p>
      )}
      {rejectMutation.isError && (
        <p className="mb-2 text-xs text-red-500">{t("rejectError")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleAccept}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {acceptMutation.isPending ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              {t("accepting")}
            </>
          ) : (
            t("accept")
          )}
        </button>
        <button
          onClick={() => setConfirmingReject(true)}
          disabled={isBusy}
          className="inline-flex items-center justify-center rounded-2xl border border-border-light px-4 py-2 text-xs text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5 disabled:opacity-60"
        >
          {t("reject")}
        </button>
      </div>

      <DestructiveConfirmModal
        isOpen={confirmingReject}
        onClose={() => {
          setConfirmingReject(false);
          rejectMutation.reset();
        }}
        size="sm"
        title={t("rejectConfirm.heading")}
        description={t("rejectConfirm.note")}
        confirmLabel={
          rejectMutation.isPending ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              {t("rejecting")}
            </>
          ) : (
            t("rejectConfirm.confirm")
          )
        }
        cancelLabel={t("rejectConfirm.back")}
        onConfirm={handleReject}
        loading={isBusy}
      >
        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <p className="font-medium">{request.patient?.displayName ?? "-"}</p>
          <p className="mt-1 text-xs opacity-80">
            {t("duration", { n: request.requestedDurationMinutes })}
          </p>
        </div>
      </DestructiveConfirmModal>
    </div>
  );
}

export default function PractitionerPendingRequestsPanel() {
  const t = useTranslations("sessions.practitioner.instantBooking");
  const { data: requests, isLoading, isError } = usePractitionerPendingBookingRequests();

  if (isLoading) {
    return (
      <div className="h-20 animate-pulse rounded-2xl bg-surface-tertiary dark:bg-white/10" />
    );
  }

  if (isError) {
    return (
      <p className="rounded-2xl border border-border-light bg-surface-primary p-4 text-sm text-text-secondary dark:bg-white/5">
        {t("errorNote")}
      </p>
    );
  }

  if (!requests || requests.length === 0) {
    return null; // No pending requests — render nothing (keeps sessions page clean)
  }

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Zap size={16} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
          {t("sectionHeading")}
        </h2>
      </div>
      <p className="mb-3 text-xs text-text-secondary">{t("sectionNote")}</p>
      <div className="space-y-3">
        {requests.map((req) => (
          <RequestCard key={req.id} request={req} />
        ))}
      </div>
    </section>
  );
}
