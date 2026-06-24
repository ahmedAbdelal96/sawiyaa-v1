import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchPublicSpecialties } from "@/features/specialties-public/api/specialties-ssr.api";
import type { Specialty } from "@/features/specialties/types/specialties.types";
import GuidedMatchingStartScreen from "@/features/guided-matching/components/GuidedMatchingStartScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guided-matching" });

  return {
    title: t("meta.startTitle"),
    description: t("meta.startDescription"),
  };
}

export default async function PatientMatchingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let specialties: Specialty[] = [];
  try {
    const data = await fetchPublicSpecialties(locale);
    specialties = data.specialties;
  } catch {
    specialties = [];
  }

  return <GuidedMatchingStartScreen specialties={specialties} />;
}
