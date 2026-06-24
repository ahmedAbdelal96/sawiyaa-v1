import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminCareChatRequestsScreen from "@/features/care-chat/components/AdminCareChatRequestsScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

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
  return (
    <AdminPermissionGate
      requiredPermissions={[
        PermissionKey.CARE_CHAT_REQUEST_READ_ADMIN,
        PermissionKey.CARE_CHAT_CONVERSATION_READ_ADMIN,
        PermissionKey.CARE_CHAT_REQUEST_DECIDE,
      ]}
    >
      <AdminCareChatRequestsScreen />
    </AdminPermissionGate>
  );
}
