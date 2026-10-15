import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import PatientAcademyProgramEnrollmentPayScreen from "@/features/academy-programs/components/PatientAcademyProgramEnrollmentPayScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ token?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return buildPublicMetadata({
    locale,
    pathname: "/patient/academy/program-enrollments/[id]/pay",
    title: t("meta.patientPayTitle"),
    description: t("meta.patientPayDescription"),
  });
}

export default async function PatientAcademyProgramEnrollmentPayPage({
  params,
  searchParams,
}: Props) {
  const { locale, id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  setRequestLocale(locale);

  return (
    <PatientAcademyProgramEnrollmentPayScreen
      enrollmentId={id}
      token={resolvedSearchParams?.token}
    />
  );
}
