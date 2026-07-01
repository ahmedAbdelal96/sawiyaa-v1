import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  PractitionerPageHeader,
  PractitionerPageShell,
} from "@/components/shared/practitioner/PractitionerWorkspaceKit";
import PresencePanel from "@/features/presence/components/PresencePanel";
import AvailabilityWeeksPanel from "@/features/availability/components/AvailabilityWeeksPanel";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-area" });
  return {
    title: t("availability.meta.title"),
    description: t("availability.meta.description"),
  };
}

export default async function PractitionerAvailabilityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "practitioner-area" });

  return (
    <PractitionerPageShell>
      <PractitionerPageHeader
        title={t("availability.page.title")}
        description={t("availability.page.subtitle")}
      />
      <div className="space-y-6">
        <PresencePanel />
        <AvailabilityWeeksPanel />
      </div>
    </PractitionerPageShell>
  );
}
