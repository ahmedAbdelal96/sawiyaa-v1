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
    return <div className="h-28 animate-pulse rounded-2xl border border-border-light bg-surface-tertiary" aria-label={t("loading")} />;
  }

  if (query.isError || !settings) {
    return <div className="rounded-2xl border border-border-light bg-white p-5 text-sm text-error-600 shadow-sm dark:bg-surface-secondary">{t("loadError")}</div>;
  }

  const save = (nextValue: boolean) => {
    update.mutate(nextValue, {
      onSuccess: () => toast.success(nextValue ? t("toast.resumed") : t("toast.paused")),
      onError: (error) => toast.error(isPausedDomainError(error) ? t("errors.paused") : t("saveError")),
    });
  };

  return (
    <>
      <section className="rounded-2xl border border-border-light bg-white p-5 shadow-sm dark:bg-surface-secondary" aria-labelledby="booking-intake-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 id="booking-intake-title" className="text-sm font-semibold text-text-primary dark:text-white/90">{t("title")}</h2>
            <p className="mt-1 text-xs leading-5 text-text-secondary">{t("description")}</p>
            <p className="mt-2 text-xs font-medium text-text-muted">{settings.acceptsNormalBookings ? t("enabled") : t("paused")}</p>
          </div>
          <Switch
            label=""
            checked={settings.acceptsNormalBookings}
            disabled={update.isPending}
            onChange={(nextValue) => nextValue ? save(true) : setConfirmPause(true)}
          />
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
