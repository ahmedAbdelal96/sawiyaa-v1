import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerSupportTicketScreen from "@/features/support/components/PractitionerSupportTicketScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });

  return {
    title: t("practitioner.meta.detailTitle"),
    description: t("practitioner.meta.detailDescription"),
  };
}

export default async function PractitionerSupportTicketPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <div className="px-4">
      <PractitionerSupportTicketScreen ticketId={id} />
    </div>
  );
}
