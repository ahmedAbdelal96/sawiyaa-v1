import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import PackageDiscoveryWorkspace from "@/features/package-plans/components/PackageDiscoveryWorkspace";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "package-purchases.meta",
  });

  return buildPublicMetadata({
    locale,
    pathname: "/packages",
    title: t("discoveryTitle"),
    description: t("discoveryDescription"),
  });
}

export default async function PackagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[#FBF9F5] px-4 py-8 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PackageDiscoveryWorkspace />
      </div>
    </div>
  );
}
