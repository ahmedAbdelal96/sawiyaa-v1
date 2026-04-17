import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerSupportHomeScreen from "@/features/support/components/PractitionerSupportHomeScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });

  return {
    title: t("practitioner.meta.listTitle"),
    description: t("practitioner.meta.listDescription"),
  };
}

export default async function PractitionerSupportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="px-4 py-8">
      <PractitionerSupportHomeScreen />
    </div>
  );
}
