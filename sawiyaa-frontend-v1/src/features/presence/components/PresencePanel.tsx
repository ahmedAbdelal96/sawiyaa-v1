"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMyPresence, useSetInstantBooking, useSetPresenceStatus } from "../hooks/use-presence";
import { Skeleton } from "@/components/shared/LoadingStates";
import type { PresenceStatus } from "../types/presence.types";
import { FormModal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import { toAppError } from "@/lib/api/errors";
import { usePractitionerProfile, useUpdatePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import {
  instantBookingPricingToForm,
  instantBookingPricingToPayload,
  missingInstantBookingPriceFields,
  shouldOpenInstantPricingSetup,
  type InstantBookingPriceForm,
} from "../instant-booking-pricing";
import { Radio, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_PRICING: InstantBookingPriceForm = {
  instantBookingPrice30Egp: "",
  instantBookingPrice30Usd: "",
  instantBookingPrice60Egp: "",
  instantBookingPrice60Usd: "",
};

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
    activeClass: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold shadow-2xs",
    inactiveClass: "border-border-light bg-surface text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
    dotClass: "bg-emerald-500",
  },
  {
    value: "AWAY",
    activeClass: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold shadow-2xs",
    inactiveClass: "border-border-light bg-surface text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
    dotClass: "bg-amber-400",
  },
  {
    value: "BUSY",
    activeClass: "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold shadow-2xs",
    inactiveClass: "border-border-light bg-surface text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
    dotClass: "bg-rose-500",
  },
  {
    value: "OFFLINE",
    activeClass: "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-bold shadow-2xs",
    inactiveClass: "border-border-light bg-surface text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
    dotClass: "bg-slate-400",
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
  const profileQuery = usePractitionerProfile();
  const updateProfile = useUpdatePractitionerProfile();
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingForm, setPricingForm] = useState<InstantBookingPriceForm>(EMPTY_PRICING);
  const [instantError, setInstantError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-xs">
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="mb-4 h-3 w-48" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-xs">
          <Skeleton className="mb-2 h-4 w-28" />
          <Skeleton className="mb-4 h-3 w-56" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-border-light bg-surface p-4 text-sm text-status-danger shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{t("feedback.loadError")}</span>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1 rounded-xl border border-border-light bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-secondary"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("feedback.retry")}
        </button>
      </div>
    );
  }

  const presence = data.presence;
  const currentStatus = presence.status;
  const isInstantEnabled = presence.isInstantBookingEnabled;
  const isSavingStatus = setStatus.isPending;
  const isSavingInstant = setInstantBooking.isPending || updateProfile.isPending;
  const missingPricing = missingInstantBookingPriceFields(pricingForm);

  const openPricingSetup = () => {
    const profile = profileQuery.data?.profile;
    setPricingForm(profile ? instantBookingPricingToForm(profile) : EMPTY_PRICING);
    setInstantError(null);
    setPricingModalOpen(true);
  };

  const enableInstantBooking = async () => {
    setInstantError(null);
    try {
      await setInstantBooking.mutateAsync({ isInstantBookingEnabled: true });
      await refetch();
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === "PRESENCE_INSTANT_BOOKING_PRICING_REQUIRED") {
        openPricingSetup();
        return;
      }
      setInstantError(appError.message || t("saveError"));
    }
  };

  const savePricingAndEnable = async () => {
    if (missingPricing.length > 0) return;
    setInstantError(null);
    try {
      await updateProfile.mutateAsync(instantBookingPricingToPayload(pricingForm));
      await setInstantBooking.mutateAsync({ isInstantBookingEnabled: true });
      setPricingModalOpen(false);
      await refetch();
    } catch (error) {
      const appError = toAppError(error);
      setInstantError(appError.message || t("saveError"));
    }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card 1: Online Presence Status */}
        <div className="flex flex-col justify-between rounded-2xl border border-border-light bg-surface p-4 shadow-xs dark:bg-surface-secondary">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Radio className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-xs font-bold text-text-primary dark:text-white">
                  {t("heading")}
                </h2>
              </div>
              <span className="text-[11px] font-medium text-text-muted">
                {t("statusLabel")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
              {t("description")}
            </p>
          </div>

          <div className="mt-3.5">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
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
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
                      isActive ? opt.activeClass : opt.inactiveClass
                    )}
                  >
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", opt.dotClass)} />
                    <span>{t(opt.value)}</span>
                  </button>
                );
              })}
            </div>
            {setStatus.isError && (
              <p className="mt-1.5 text-[11px] text-status-danger">{t("saveError")}</p>
            )}
          </div>
        </div>

        {/* Card 2: Instant Booking Toggle */}
        <div className="flex flex-col justify-between rounded-2xl border border-border-light bg-surface p-4 shadow-xs dark:bg-surface-secondary">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-xs font-bold text-text-primary dark:text-white">
                  {t("instantBooking.label")}
                </h2>
              </div>
              <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
                {t("instantBooking.description")}
              </p>
            </div>
            <Switch
              label=""
              checked={isInstantEnabled}
              disabled={isSavingInstant}
              onChange={(nextChecked) => {
                if (!nextChecked) {
                  setInstantBooking.mutate({ isInstantBookingEnabled: false });
                } else if (
                  shouldOpenInstantPricingSetup(true, missingPricing.length) ||
                  !profileQuery.data?.profile
                ) {
                  openPricingSetup();
                } else {
                  void enableInstantBooking();
                }
              }}
            />
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border-light pt-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-semibold",
                isInstantEnabled ? "text-status-success" : "text-text-muted"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isInstantEnabled ? "bg-status-success" : "bg-text-muted"
                )}
              />
              {isInstantEnabled
                ? t("instantBooking.enabled")
                : t("instantBooking.disabled")}
            </span>
            {(setInstantBooking.isError || instantError) && (
              <span className="text-[11px] text-status-danger truncate">
                {instantError || t("saveError")}
              </span>
            )}
          </div>
        </div>
      </div>

      <FormModal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        title={t("instantBooking.pricingModal.title")}
        description={t("instantBooking.pricingModal.description")}
        submitLabel={t("instantBooking.pricingModal.saveAndEnable")}
        cancelLabel={t("instantBooking.pricingModal.cancel")}
        onSubmit={() => void savePricingAndEnable()}
        onCancel={() => setPricingModalOpen(false)}
        loading={isSavingInstant}
        submitDisabled={missingPricing.length > 0}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["instantBookingPrice30Egp", "pricingModal.fields.egp30"],
            ["instantBookingPrice30Usd", "pricingModal.fields.usd30"],
            ["instantBookingPrice60Egp", "pricingModal.fields.egp60"],
            ["instantBookingPrice60Usd", "pricingModal.fields.usd60"],
          ] as const).map(([field, label]) => (
            <label key={field} className="grid gap-1.5 text-xs font-medium text-text-secondary">
              {t(`instantBooking.${label}`)}
              <Input
                type="number"
                min="0"
                step="0.01"
                value={pricingForm[field]}
                onChange={(event) =>
                  setPricingForm((current) => ({ ...current, [field]: event.target.value }))
                }
              />
            </label>
          ))}
        </div>
        {instantError ? <p className="mt-4 text-sm text-status-danger">{instantError}</p> : null}
      </FormModal>
    </>
  );
}
