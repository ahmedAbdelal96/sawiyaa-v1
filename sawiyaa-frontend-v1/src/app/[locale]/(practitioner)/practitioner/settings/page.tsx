import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerPackageAvailabilitySettingsCard from "@/features/practitioners/components/PractitionerPackageAvailabilitySettingsCard";
import { PractitionerPageShell } from "@/components/shared/practitioner/PractitionerWorkspaceKit";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-area" });
  return {
    title: t("settings.packageAvailability.meta.title"),
    description: t("settings.packageAvailability.meta.description"),
  };
}

export default async function PractitionerSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PractitionerPageShell>
      <PractitionerPackageAvailabilitySettingsCard />
    </PractitionerPageShell>
  );
}
