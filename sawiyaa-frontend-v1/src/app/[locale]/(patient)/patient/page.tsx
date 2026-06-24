import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientJourneyScreen from "@/features/patient-journey/components/PatientJourneyScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "patient-journey" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function PatientRootPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="px-4 py-8">
      <PatientJourneyScreen />
    </div>
  );
}
