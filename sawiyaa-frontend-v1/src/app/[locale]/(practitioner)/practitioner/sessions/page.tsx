import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerPendingRequestsPanel from "@/features/instant-booking/components/PractitionerPendingRequestsPanel";
import PractitionerSessionsPanel from "@/features/sessions/components/PractitionerSessionsPanel";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sessions" });
  return {
    title: t("practitioner.meta.listTitle"),
    description: t("practitioner.meta.listDescription"),
  };
}

export default async function PractitionerSessionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-4">
        {/* Pending instant booking requests appear at the top because they need action. */}
        <PractitionerPendingRequestsPanel />

        {/* Scheduled sessions table */}
        <PractitionerSessionsPanel />
      </div>
    </div>
  );
}
