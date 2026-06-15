import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function PractitionerCareChatConversationPage({ params }: Props) {
  const { locale, id } = await params;
  redirect(`/${locale}/practitioner/messages?lane=care&id=${id}`);
}
