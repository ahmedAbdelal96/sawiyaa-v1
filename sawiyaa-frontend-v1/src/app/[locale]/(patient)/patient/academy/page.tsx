import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import PatientAcademyProgramEnrollmentsScreen from "@/features/academy-programs/components/PatientAcademyProgramEnrollmentsScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return buildPublicMetadata({
    locale,
    pathname: "/patient/academy",
    title: t("meta.patientTitle"),
    description: t("meta.patientDescription"),
  });
}

export default async function PatientAcademyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PatientAcademyProgramEnrollmentsScreen />;
}
