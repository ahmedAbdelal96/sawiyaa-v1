import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientProfileForm from "@/features/patients/components/PatientProfileForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "patient-profile" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function PatientProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-6">
      <PatientProfileForm />
    </div>
  );
}
