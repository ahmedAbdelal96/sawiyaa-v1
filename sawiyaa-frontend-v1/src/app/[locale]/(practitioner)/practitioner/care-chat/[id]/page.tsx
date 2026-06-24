import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerCareChatRequestScreen from "@/features/care-chat/components/PractitionerCareChatRequestScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "care-chat" });
  return {
    title: t("practitioner.meta.detailTitle"),
    description: t("practitioner.meta.detailDescription"),
  };
}

export default async function PractitionerCareChatRequestPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <PractitionerCareChatRequestScreen requestId={id} />;
}
