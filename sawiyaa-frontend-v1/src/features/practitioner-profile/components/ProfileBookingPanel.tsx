import { getLocale, getTranslations } from "next-intl/server";
import type {
  PractitionerProfile,
  PublicPractitionerInstantBookingAvailability,
} from "../types/profile";
import PackagePlansSection from "@/features/package-plans/components/PackagePlansSection";
import PublicAvailabilityViewer from "./PublicAvailabilityViewer";
import ProfileInstantActionCard from "./ProfileInstantActionCard";

type Props = {
  profile: PractitionerProfile;
  instantBookingAvailability: PublicPractitionerInstantBookingAvailability | null;
};

export default async function ProfileBookingPanel({
  profile,
  instantBookingAvailability,
}: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile"),
    getLocale(),
  ]);
  const isAr = locale === "ar";

  return (
    <div id="booking-panel" className="space-y-4">
      {/* Instant Action Banner */}
      <ProfileInstantActionCard
        profile={profile}
        instantBookingAvailability={instantBookingAvailability}
      />

      {/* Weekly Schedule Viewer */}
      <div id="weekly-availability" className="app-panel rounded-2xl p-4 sm:p-5">
        <div className="mb-3 space-y-0.5 border-b border-border-light/50 pb-3 dark:border-white/10">
          <h2 className="text-base font-bold text-text-primary dark:text-white/95">
            {isAr ? "احجز موعد الجلسة" : "Book a Session Appointment"}
          </h2>
          <p className="text-xs text-text-secondary">
            {isAr
              ? "اختر اليوم والوقت المناسبين من جدول مواعيد المختص المتاحة"
              : "Choose your preferred date and time from the practitioner's availability schedule"}
          </p>
        </div>

        <PublicAvailabilityViewer
          slug={profile.slug}
          currencyCode={profile.currencyCode ?? null}
          displaySessionPrice30={profile.sessionPrice30 ?? null}
          displaySessionPrice60={profile.sessionPrice60 ?? null}
        />
      </div>

      {/* Package Plans */}
      <PackagePlansSection slug={profile.slug} profile={profile} />
    </div>
  );
}
