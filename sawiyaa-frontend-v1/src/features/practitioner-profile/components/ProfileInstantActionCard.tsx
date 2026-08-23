"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Clock, Zap } from "lucide-react";
import InstantBookingModal from "@/features/instant-booking/components/InstantBookingModal";
import { getPublicPractitionerInstantBookingAvailability } from "@/features/instant-booking/api/instant-booking.api";
import type { PractitionerProfile, PublicPractitionerInstantBookingAvailability } from "../types/profile";

type Props = {
  profile: PractitionerProfile;
  instantBookingAvailability: PublicPractitionerInstantBookingAvailability | null;
};

export function isProfileInstantBookingAvailable(
  availability: PublicPractitionerInstantBookingAvailability | null,
) {
  return Boolean(availability?.availableNow);
}

export default function ProfileInstantActionCard({ profile, instantBookingAvailability }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAvailability, setCurrentAvailability] = useState(instantBookingAvailability);
  const locale = useLocale();
  const t = useTranslations("practitioner-profile");
  const isArabic = locale === "ar";

  useEffect(() => {
    setCurrentAvailability(instantBookingAvailability);
  }, [instantBookingAvailability]);

  const isInstantAvailable = isProfileInstantBookingAvailable(currentAvailability);

  const handleScrollToAvailability = () => {
    const el = document.getElementById("weekly-availability");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!isInstantAvailable && !isModalOpen) {
    return (
      <div className="rounded-[24px] border border-border-light/70 bg-surface-secondary/60 p-4 sm:p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border-light/80 bg-white/70 px-2.5 py-0.5 text-xs font-bold text-text-secondary dark:border-white/10 dark:bg-white/5 dark:text-white/75">
              <Zap size={14} />
              <span>{t("booking.instant.unavailable")}</span>
            </div>
            <p className="text-xs font-medium text-text-secondary">
              {t("booking.instant.unavailableNote")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleScrollToAvailability}
            className="sawiyaa-btn-press inline-flex items-center gap-2 rounded-xl border border-border-light bg-white px-4 py-2.5 text-xs font-bold text-text-primary transition-all hover:bg-surface-secondary shadow-sm cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <span>{t("booking.jumpToAvailability")}</span>
            <ArrowRight size={14} className="rtl:rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  const refreshAvailability = async () => {
    try {
      setCurrentAvailability(await getPublicPractitionerInstantBookingAvailability(profile.slug));
    } catch {
      setCurrentAvailability({ availableNow: false, durations: { 30: false, 60: false }, checkedAt: new Date().toISOString() });
    }
  };

  return (
    <>
      <div className="rounded-[24px] border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5 dark:bg-amber-500/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Zap size={14} className="fill-amber-500 text-amber-500 animate-pulse" />
              <span>{t("booking.instant.availableNow")}</span>
            </div>
            <p className="text-xs font-medium text-text-secondary">
              {t("booking.instant.note")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="sawiyaa-btn-press inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-primary-hover shadow-sm hover:shadow cursor-pointer"
          >
            <Clock size={14} />
            <span>{t("booking.instant.cta")}</span>
            <ArrowRight size={14} className="rtl:rotate-180" />
          </button>
        </div>
      </div>

      <InstantBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        practitioner={{
          slug: profile.slug,
          displayName: isArabic ? profile.nameAr : profile.nameEn,
          currencyCode: profile.currencyCode,
          instantBookingPrice30Egp: profile.instantBookingPrice30Egp,
          instantBookingPrice30Usd: profile.instantBookingPrice30Usd,
          instantBookingPrice60Egp: profile.instantBookingPrice60Egp,
          instantBookingPrice60Usd: profile.instantBookingPrice60Usd,
        }}
        availableDurations={currentAvailability?.durations ?? { 30: false, 60: false }}
        onAvailabilityChanged={refreshAvailability}
        onScrollToAvailability={handleScrollToAvailability}
      />
    </>
  );
}
