import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AdminPractitionerCreatePage from "@/features/admin/practitioner-applications/components/AdminPractitionerCreatePage";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-area" });
  return {
    title: t("applications.directCreate.modalTitle"),
    description: t("applications.directCreate.modalDescription"),
  };
}

export default async function AdminCreatePractitionerRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin-area" });

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE]}
    >
      <div className="space-y-4">
        <Link
          href="/admin/practitioner-applications"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {"<-"} {t("applicationDetails.page.back")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("applications.directCreate.modalTitle")}
        </h1>
        <AdminPractitionerCreatePage />
      </div>
    </AdminPermissionGate>
  );
}
