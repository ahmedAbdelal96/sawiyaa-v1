import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function PatientCareChatConversationPage({ params }: Props) {
  const { locale, id } = await params;
  redirect(`/${locale}/patient/messages?lane=care&id=${id}`);
}
