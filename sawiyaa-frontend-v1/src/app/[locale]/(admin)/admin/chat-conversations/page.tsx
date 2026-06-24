import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminChatConversationsListScreen from "@/features/admin/chat-conversations/components/AdminChatConversationsListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-chat-conversations" });

  return {
    title: t("page.title"),
    description: t("page.description"),
  };
}

export default async function AdminChatConversationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.CHAT_CONVERSATIONS_READ]}>
      <AdminChatConversationsListScreen />
    </AdminPermissionGate>
  );
}
