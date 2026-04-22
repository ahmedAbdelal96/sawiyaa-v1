import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientSupportTicketScreen from "@/features/support/components/PatientSupportTicketScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });

  return {
    title: t("meta.detailTitle"),
    description: t("meta.detailDescription"),
  };
}

export default async function PatientSupportTicketPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <div className="px-4">
      <PatientSupportTicketScreen ticketId={id} />
    </div>
  );
}
