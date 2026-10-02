"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Switch from "@/components/form/switch/Switch";
import { ConfirmModal } from "@/components/ui/modal";
import {
  useMyBookingSettings,
  useUpdateBookingSettings,
} from "../hooks/use-booking-settings";
import { CalendarCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function isPausedDomainError(error: unknown) {
  const code = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
  return code === "NORMAL_BOOKINGS_PAUSED";
}

export default function BookingIntakePanel() {
  const t = useTranslations("practitioner-area.availability.bookingIntake");
  const query = useMyBookingSettings();
  const update = useUpdateBookingSettings();
  const [confirmPause, setConfirmPause] = useState(false);
  const settings = query.data;

  if (query.isLoading) {
    return (
      <div
        className="h-28 animate-pulse rounded-2xl border border-border-light bg-surface"
        aria-label={t("loading")}
      />
    );
  }

  if (query.isError || !settings) {
    return (
      <div className="rounded-2xl border border-border-light bg-surface p-4 text-xs text-status-danger shadow-xs flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{t("loadError")}</span>
      </div>
    );
  }

  const save = (nextValue: boolean) => {
    update.mutate(nextValue, {
      onSuccess: () => toast.success(nextValue ? t("toast.resumed") : t("toast.paused")),
      onError: (error) =>
        toast.error(isPausedDomainError(error) ? t("errors.paused") : t("saveError")),
    });
  };

  const isAccepting = settings.acceptsNormalBookings;

  return (
    <>
      <section
        className="flex flex-col justify-between rounded-2xl border border-border-light bg-surface p-4 shadow-xs dark:bg-surface-secondary"
        aria-labelledby="booking-intake-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-light text-text-brand">
                <CalendarCheck className="h-3.5 w-3.5" />
              </span>
              <h2
                id="booking-intake-title"
                className="text-xs font-bold text-text-primary dark:text-white"
              >
                {t("title")}
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
              {t("description")}
            </p>
          </div>
          <Switch
            label=""
            checked={isAccepting}
            disabled={update.isPending}
            onChange={(nextValue) => (nextValue ? save(true) : setConfirmPause(true))}
          />
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border-light pt-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold",
              isAccepting ? "text-status-success" : "text-status-warning"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isAccepting ? "bg-status-success" : "bg-status-warning"
              )}
            />
            {isAccepting ? t("enabled") : t("paused")}
          </span>
        </div>
      </section>

      <ConfirmModal
        isOpen={confirmPause}
        onClose={() => setConfirmPause(false)}
        title={t("confirm.title")}
        description={t("confirm.body")}
        confirmLabel={update.isPending ? t("confirm.saving") : t("confirm.pause")}
        cancelLabel={t("confirm.cancel")}
        loading={update.isPending}
        onConfirm={() => {
          setConfirmPause(false);
          save(false);
        }}
      />
    </>
  );
}
