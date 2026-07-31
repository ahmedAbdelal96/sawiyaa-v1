import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PractitionerPageShell } from "@/components/shared/practitioner/PractitionerWorkspaceKit";
import AvailabilityWeekDetailsScreen from "@/features/availability/components/AvailabilityWeekDetailsScreen";

type Props = { params: Promise<{ locale: string; weekId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-area.availability" });
  return { title: t("detailsPage.metaTitle"), description: t("detailsPage.metaDescription") };
}

export default async function AvailabilityWeekDetailsPage({ params }: Props) {
  const { locale, weekId } = await params;
  setRequestLocale(locale);
  return <PractitionerPageShell><AvailabilityWeekDetailsScreen weekId={weekId} /></PractitionerPageShell>;
}
