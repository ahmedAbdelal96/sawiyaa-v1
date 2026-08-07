import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import AdminApplicationDetails from "@/features/admin/practitioner-applications/components/AdminApplicationDetails";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-area" });
  return {
    title: t("applicationDetails.meta.title"),
    description: t("applicationDetails.meta.description"),
  };
}

export default async function AdminApplicationDetailsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin-area" });
  const isRtl = locale === "ar";

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.PRACTITIONER_APPLICATIONS_READ]}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
            {t("applicationDetails.page.title")}
          </h1>
          <Link
            href="/admin/practitioner-applications"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ArrowRight className={`h-4 w-4 ${isRtl ? "" : "rotate-180"}`} />
            <span>{t("applicationDetails.page.back")}</span>
          </Link>
        </div>
        <AdminApplicationDetails applicationId={id} />
      </div>
    </AdminPermissionGate>
  );
}
