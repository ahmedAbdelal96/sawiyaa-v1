import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import PatientAcademyProgramEnrollmentDetailScreen from "@/features/academy-programs/components/PatientAcademyProgramEnrollmentDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return buildPublicMetadata({
    locale,
    pathname: "/patient/academy/program-enrollments/[id]",
    title: t("meta.patientDetailTitle"),
    description: t("meta.patientDetailDescription"),
  });
}

export default async function PatientAcademyProgramEnrollmentPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <PatientAcademyProgramEnrollmentDetailScreen enrollmentId={id} />;
}
