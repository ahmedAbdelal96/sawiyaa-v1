import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import AdminPractitionerTransferDetailScreen from "@/features/admin/practitioner-payouts/components/AdminPractitionerTransferDetailScreen";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string; transferId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-practitioner-payouts" });

  return {
    title: t("history.meta.title"),
    description: t("history.meta.description"),
  };
}

export default async function AdminPractitionerTransferDetailPage({ params }: Props) {
  const { locale, transferId } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.PRACTITIONER_PAYOUTS_READ]}
    >
      <AdminPractitionerTransferDetailPageContent transferId={transferId} />
    </AdminPermissionGate>
  );
}

function AdminPractitionerTransferDetailPageContent({ transferId }: { transferId: string }) {
  return <AdminPractitionerTransferDetailScreen transferId={transferId} />;
}
