"use client";

import { useTranslations } from "next-intl";
import { useMyPresence, useSetInstantBooking, useSetPresenceStatus } from "../hooks/use-presence";
import { Skeleton } from "@/components/shared/LoadingStates";
import type { PresenceStatus } from "../types/presence.types";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

type StatusOption = {
  value: PresenceStatus;
  activeClass: string;
  inactiveClass: string;
  dotClass: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "ONLINE",
    activeClass: "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    inactiveClass: "border-border-light bg-white text-text-secondary hover:bg-surface-tertiary dark:bg-surface-secondary dark:hover:bg-white/5",
    dotClass: "bg-green-500",
  },
  {
    value: "AWAY",
    activeClass: "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    inactiveClass: "border-border-light bg-white text-text-secondary hover:bg-surface-tertiary dark:bg-surface-secondary dark:hover:bg-white/5",
    dotClass: "bg-yellow-400",
  },
  {
    value: "BUSY",
    activeClass: "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    inactiveClass: "border-border-light bg-white text-text-secondary hover:bg-surface-tertiary dark:bg-surface-secondary dark:hover:bg-white/5",
    dotClass: "bg-orange-500",
  },
  {
    value: "OFFLINE",
    activeClass: "border-gray-400 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    inactiveClass: "border-border-light bg-white text-text-secondary hover:bg-surface-tertiary dark:bg-surface-secondary dark:hover:bg-white/5",
    dotClass: "bg-gray-400",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PresencePanel() {
  const t = useTranslations("practitioner-area.availability.presence");

  const { data, isLoading, isError, refetch } = useMyPresence();
  const setStatus = useSetPresenceStatus();
  const setInstantBooking = useSetInstantBooking();

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border-light bg-white p-6 shadow-sm dark:border-border-light dark:bg-surface-secondary">
        <Skeleton className="mb-1 h-5 w-32" />
        <Skeleton className="mb-5 h-4 w-64" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-24 rounded-xl" />)}
        </div>
        <Skeleton className="mt-5 h-px w-full" />
        <div className="mt-5 flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error
  // -------------------------------------------------------------------------

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-border-light bg-white p-6 shadow-sm dark:border-border-light dark:bg-surface-secondary">
        <p className="mb-3 text-sm font-medium text-text-primary dark:text-white">
          {t("heading")}
        </p>
        <p className="mb-4 text-sm text-error-500">{t("feedback.loadError")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-xl border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-tertiary dark:border-border-light dark:bg-surface-secondary dark:hover:bg-white/5"
        >
          {t("feedback.retry")}
        </button>
      </div>
    );
  }

  const presence = data.presence;
  const currentStatus = presence.status;
  const isInstantEnabled = presence.isInstantBookingEnabled;
  const isSavingStatus = setStatus.isPending;
  const isSavingInstant = setInstantBooking.isPending;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="rounded-2xl border border-border-light bg-white p-6 shadow-sm dark:border-border-light dark:bg-surface-secondary">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
          {t("heading")}
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">{t("description")}</p>
      </div>

      {/* Status selector */}
      <div className="mb-1">
        <p className="mb-2.5 text-xs font-medium text-text-muted">{t("statusLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = currentStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isSavingStatus}
                onClick={() => {
                  if (!isActive) {
                    setStatus.mutate({ status: opt.value });
                  }
                }}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive ? opt.activeClass : opt.inactiveClass
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${opt.dotClass}`} />
                {t(opt.value)}
              </button>
            );
          })}
        </div>
        {setStatus.isError && (
          <p className="mt-2 text-xs text-error-500">{t("saveError")}</p>
        )}
      </div>

      <div className="my-5 border-t border-border-light dark:border-border-light" />

      {/* Instant booking toggle */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-primary dark:text-white/90">
            {t("instantBooking.label")}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {t("instantBooking.description")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isInstantEnabled}
          disabled={isSavingInstant}
          onClick={() => setInstantBooking.mutate({ isInstantBookingEnabled: !isInstantEnabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            isInstantEnabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
              isInstantEnabled ? "translate-x-5 rtl:-translate-x-5" : "translate-x-1 rtl:-translate-x-1"
            }`}
          />
        </button>
      </div>
      <p className="mt-1.5 text-xs text-text-muted">
        {isInstantEnabled ? t("instantBooking.enabled") : t("instantBooking.disabled")}
      </p>
      {setInstantBooking.isError && (
        <p className="mt-1 text-xs text-error-500">{t("saveError")}</p>
      )}
    </div>
  );
}
