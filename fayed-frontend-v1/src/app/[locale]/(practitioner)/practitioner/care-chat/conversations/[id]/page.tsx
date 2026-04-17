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
    title: t("practitioner.meta.conversationTitle"),
    description: t("practitioner.meta.conversationDescription"),
  };
}

export default async function PractitionerCareChatConversationPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <CareChatConversationPanel
      conversationId={id}
      scope="practitioner"
      backHref="/practitioner/care-chat"
    />
  );
}
