import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AdminCareChatConversationScreen from "@/features/care-chat/components/AdminCareChatConversationScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "مراجعة محادثة الرعاية | سويّة",
  };
}

export default async function AdminCareChatConversationPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.CARE_CHAT_CONVERSATION_READ_ADMIN]}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 h-[calc(100vh-96px)] min-h-0 overflow-hidden mb-[-16px] md:mb-[-24px]">
        <AdminCareChatConversationScreen conversationId={id} />
      </div>
    </AdminPermissionGate>
  );
}
