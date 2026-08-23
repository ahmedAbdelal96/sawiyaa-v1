import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  PractitionerPageHeader,
  PractitionerPageShell,
} from "@/components/shared/practitioner/PractitionerWorkspaceKit";
import PresencePanel from "@/features/presence/components/PresencePanel";
import AvailabilityWeeksPanel from "@/features/availability/components/AvailabilityWeeksPanel";
import BookingIntakePanel from "@/features/booking-settings/components/BookingIntakePanel";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-area" });
  return {
    title: t("availability.header.metaTitle"),
    description: t("availability.header.metaDescription"),
  };
}

export default async function PractitionerAvailabilityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "practitioner-area" });

  return (
    <PractitionerPageShell>
      <PractitionerPageHeader
        title={t("availability.header.title")}
        description={t("availability.header.subtitle")}
      />
      <div className="space-y-5">
        {/* Unified Quick Controls (Presence + Instant Booking + Booking Intake) */}
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <PresencePanel />
          </div>
          <div className="xl:col-span-1">
            <BookingIntakePanel />
          </div>
        </div>

        {/* Weekly Schedule Management Workspace */}
        <AvailabilityWeeksPanel />
      </div>
    </PractitionerPageShell>
  );
}
