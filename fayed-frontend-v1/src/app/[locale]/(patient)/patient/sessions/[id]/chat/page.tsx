import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SessionChatPanel from "@/features/chat/components/SessionChatPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sessions" });
  return {
    title: t("meta.chatTitle"),
  };
}

export default async function PatientSessionChatPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <div className="px-4">
      <SessionChatPanel sessionId={id} scope="patient" />
    </div>
  );
}
