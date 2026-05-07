import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerSettlementsListScreen from "@/features/financial-operations/components/PractitionerSettlementsListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-finance" });

  return {
    title: t("meta.settlementsTitle"),
    description: t("meta.settlementsDescription"),
  };
}

export default async function PractitionerSettlementsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <PractitionerSettlementsListScreen />
    </div>
  );
}
