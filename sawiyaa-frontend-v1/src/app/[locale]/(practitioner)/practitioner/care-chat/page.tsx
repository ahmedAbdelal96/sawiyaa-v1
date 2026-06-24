import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerCareChatHomeScreen from "@/features/care-chat/components/PractitionerCareChatHomeScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "care-chat" });
  return {
    title: t("practitioner.meta.listTitle"),
    description: t("practitioner.meta.listDescription"),
  };
}

export default async function PractitionerCareChatPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PractitionerCareChatHomeScreen />;
}
