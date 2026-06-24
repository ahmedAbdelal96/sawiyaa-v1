import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
  const t = await getTranslations({ locale, namespace: "practitioners-listing" });
  return {
    title: t("patientArea.meta.title"),
    description: t("patientArea.meta.description"),
  };
}

export default async function PatientPractitionersPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const listingData = await getPractitionersListingData(locale, await searchParams);

  return (
    <>
      <PractitionersListingView
        data={listingData}
        basePath="/patient/practitioners"
      />
    </>
  );
}
