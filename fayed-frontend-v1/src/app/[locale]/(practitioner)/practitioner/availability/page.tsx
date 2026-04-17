import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PresencePanel from "@/features/presence/components/PresencePanel";
import AvailabilityPanel from "@/features/availability/components/AvailabilityPanel";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-area" });
  return {
    title: t("availability.meta.title"),
    description: t("availability.meta.description"),
  };
}

export default async function PractitionerAvailabilityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "practitioner-area" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("availability.page.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("availability.page.subtitle")}
        </p>
      </div>
      <PresencePanel />
      <AvailabilityPanel />
    </div>
  );
}
