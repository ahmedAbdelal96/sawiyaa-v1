import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerOnboardingWorkspace from "@/features/practitioners/components/PractitionerOnboardingWorkspace";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-area" });
  return {
    title: t("application.meta.title"),
    description: t("application.meta.description"),
  };
}

export default async function PractitionerApplicationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PractitionerOnboardingWorkspace />;
}
