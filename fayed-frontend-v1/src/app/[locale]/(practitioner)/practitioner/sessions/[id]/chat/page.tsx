import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function PractitionerSessionChatPage({ params }: Props) {
  const { locale, id } = await params;
  redirect(`/${locale}/practitioner/messages?lane=session&id=${id}`);
}
