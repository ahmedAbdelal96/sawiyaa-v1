import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminApplicationsList from "@/features/admin/practitioner-applications/components/AdminApplicationsList";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-area" });
  const tNavigation = await getTranslations({ locale, namespace: "navigation" });
  return {
    title: `${tNavigation("main.practitionerApplications")} - ${t("dashboard.meta.title")}`,
    description: t("applications.meta.description"),
  };
}

export default async function AdminApplicationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin-area" });
  const tNavigation = await getTranslations({ locale, namespace: "navigation" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {tNavigation("main.practitionerApplications")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("applications.page.subtitle")}
        </p>
      </div>
      <AdminApplicationsList />
    </div>
  );
}
