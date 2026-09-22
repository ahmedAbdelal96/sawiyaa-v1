import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PatientSessionDetailPanel from "@/features/sessions/components/PatientSessionDetailPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sessions" });
  return {
    title: t("meta.detailTitle"),
  };
}

export default async function PatientSessionDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "sessions" });
  const isRtl = locale.startsWith("ar");

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6 space-y-4">
      <Link
        href="/patient/sessions"
        className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-primary transition"
      >
        {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        <span>{t("detail.backToSessions")}</span>
      </Link>

      <PatientSessionDetailPanel sessionId={id} />
    </div>
  );
}
