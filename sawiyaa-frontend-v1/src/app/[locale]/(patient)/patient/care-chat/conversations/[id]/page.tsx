import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import PatientCareChatConversationScreen from "@/features/care-chat/components/PatientCareChatConversationScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "محادثة الرعاية | سويّة",
  };
}

export default async function PatientCareChatConversationPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 h-[calc(100vh-96px)] min-h-0 overflow-hidden mb-[-16px] md:mb-[-24px]">
      <PatientCareChatConversationScreen conversationId={id} />
    </div>
  );
}
