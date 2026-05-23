import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminChatConversationDetailScreen from "@/features/admin/chat-conversations/components/AdminChatConversationDetailScreen";

type Props = {
  params: Promise<{ locale: string; conversationId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-chat-conversations" });

  return {
    title: t("page.detailTitle"),
    description: t("page.detailDescription"),
  };
}

export default async function AdminChatConversationDetailPage({ params }: Props) {
  const { locale, conversationId } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.CHAT_CONVERSATIONS_READ]}>
      <AdminChatConversationDetailScreen conversationId={conversationId} />
    </AdminPermissionGate>
  );
}
