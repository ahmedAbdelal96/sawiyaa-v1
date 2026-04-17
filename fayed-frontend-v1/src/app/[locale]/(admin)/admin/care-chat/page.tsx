import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminCareChatRequestsScreen from "@/features/care-chat/components/AdminCareChatRequestsScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "care-chat" });
  return {
    title: t("admin.meta.listTitle"),
    description: t("admin.meta.listDescription"),
  };
}

export default async function AdminCareChatPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminCareChatRequestsScreen />;
}
