import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAssessmentEditorScreen from "@/features/admin/assessments/components/AdminAssessmentEditorScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-area" });
  return {
    title: t("assessmentsAdmin.meta.detailTitle"),
    description: t("assessmentsAdmin.meta.detailDescription"),
  };
}

export default async function AdminAssessmentEditorPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.ASSESSMENTS_AUTHORING_READ]}
    >
      <AdminAssessmentEditorScreen assessmentId={id} />
    </AdminPermissionGate>
  );
}
