import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerInstantBookingRequestsScreen from "@/features/instant-booking/components/PractitionerInstantBookingRequestsScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sessions" });

  return {
    title: t("practitioner.instantBooking.queue.meta.title"),
    description: t("practitioner.instantBooking.queue.meta.description"),
  };
}

export default async function PractitionerInstantBookingRequestsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <PractitionerInstantBookingRequestsScreen />
    </div>
  );
}
