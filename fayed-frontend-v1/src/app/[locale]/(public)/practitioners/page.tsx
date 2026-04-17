import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import { getUserData } from "@/lib/auth/server";
import PractitionersListingView, {
  getPractitionersListingData,
  type PractitionersListingSearchParams,
} from "@/features/practitioners-discovery/components/PractitionersListingView";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PractitionersListingSearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public-pages.meta.practitioners" });

  return buildPublicMetadata({
    locale,
    pathname: "/practitioners",
    title: t("title"),
    description: t("description"),
  });
}

export default async function PractitionersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUserData();
  if (user?.role === "PATIENT") {
    redirect(`/${locale}/patient/practitioners`);
  }

  const listingData = await getPractitionersListingData(locale, await searchParams);

  return <PractitionersListingView data={listingData} />;
}
