import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminCareChatConversationPage({ params }: Props) {
  const { locale, id } = await params;
  redirect(`/${locale}/admin/messages?lane=care&id=${id}`);
}
