import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminSessionReviewWorkspaceScreen from "@/features/admin/sessions/components/AdminSessionReviewWorkspaceScreen";

type Props = {
  params: Promise<{ locale: string; sessionId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-sessions" });
  return {
    title: `${t("reviewWorkspace.title")} - ${t("meta.title")}`,
    description: t("meta.description"),
  };
}

export default async function AdminSessionReviewPage({ params }: Props) {
  const { locale, sessionId } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.SESSIONS_READ_ADMIN]}
    >
      <AdminSessionReviewWorkspaceScreen sessionId={sessionId} />
    </AdminPermissionGate>
  );
}
