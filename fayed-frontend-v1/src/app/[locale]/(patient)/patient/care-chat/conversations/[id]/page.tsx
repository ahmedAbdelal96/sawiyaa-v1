import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CareChatConversationPanel from "@/features/care-chat/components/CareChatConversationPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "care-chat" });
  return {
    title: t("patient.meta.conversationTitle"),
    description: t("patient.meta.conversationDescription"),
  };
}

export default async function PatientCareChatConversationPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <CareChatConversationPanel
      conversationId={id}
      scope="patient"
      backHref="/patient/care-chat"
    />
  );
}
