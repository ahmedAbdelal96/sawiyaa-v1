import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerProfileWorkspace from "@/features/practitioners/components/PractitionerProfileWorkspace";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-area" });
  return {
    title: t("profile.meta.title"),
    description: t("profile.meta.description"),
  };
}

export default async function PractitionerProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PractitionerProfileWorkspace />
  );
}
