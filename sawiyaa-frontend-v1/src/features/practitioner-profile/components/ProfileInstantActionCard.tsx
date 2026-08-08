"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
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
  const isArabic = locale === "ar";

  useEffect(() => {
    setCurrentAvailability(instantBookingAvailability);
  }, [instantBookingAvailability]);

  const isInstantAvailable = isProfileInstantBookingAvailable(currentAvailability);

  if (!isInstantAvailable && !isModalOpen) {
    return null;
  }

  const refreshAvailability = async () => {
    try {
      setCurrentAvailability(await getPublicPractitionerInstantBookingAvailability(profile.slug));
    } catch {
      setCurrentAvailability({ availableNow: false, durations: { 30: false, 60: false }, checkedAt: new Date().toISOString() });
    }
  };

  const handleScrollToAvailability = () => {
    const el = document.getElementById("weekly-availability");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <div className="rounded-[24px] border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5 dark:bg-amber-500/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Zap size={14} className="fill-amber-500 text-amber-500 animate-pulse" />
              <span>{isArabic ? "متاح الآن لجلسة فورية" : "Available now for instant session"}</span>
            </div>
            <p className="text-xs font-medium text-text-secondary">
              {isArabic
                ? "ابدأ جلسة فيديو خلال دقائق بعد موافقة المختص."
                : "Start a video session in minutes after practitioner approval."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="sawiyaa-btn-press inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-primary-hover shadow-sm hover:shadow cursor-pointer"
          >
            <Clock size={14} />
            <span>{isArabic ? "طلب جلسة فورية" : "Request Instant Session"}</span>
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
