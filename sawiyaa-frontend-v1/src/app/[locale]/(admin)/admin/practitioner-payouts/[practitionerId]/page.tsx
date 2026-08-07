import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import AdminPractitionerPayoutDetailScreen from "@/features/admin/practitioner-payouts/components/AdminPractitionerPayoutDetailScreen";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string; practitionerId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-practitioner-payouts" });

  return {
    title: t("detail.meta.title"),
    description: t("detail.meta.description"),
  };
}

export default async function AdminPractitionerPayoutDetailPage({ params }: Props) {
  const { locale, practitionerId } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.PRACTITIONER_PAYOUTS_READ]}
    >
      <AdminPractitionerPayoutDetailScreen walletOrPractitionerId={practitionerId} />
    </AdminPermissionGate>
  );
}
