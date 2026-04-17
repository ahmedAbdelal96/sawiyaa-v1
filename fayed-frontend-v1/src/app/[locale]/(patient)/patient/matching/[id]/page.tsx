import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import GuidedMatchingSessionScreen from "@/features/guided-matching/components/GuidedMatchingSessionScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guided-matching" });

  return {
    title: t("meta.resultTitle"),
    description: t("meta.resultDescription"),
  };
}

export default async function PatientMatchingResultPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <GuidedMatchingSessionScreen sessionId={id} />;
}
