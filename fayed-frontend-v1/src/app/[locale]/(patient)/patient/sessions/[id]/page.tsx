import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/patient/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary"
        >
          {"<-"} {t("detail.backToSessions")}
        </Link>
        <h1 className="mt-4 text-xl font-bold text-text-primary dark:text-white/95">
          {t("detail.heading")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          {t("detail.summary.note")}
        </p>
      </div>

      <PatientSessionDetailPanel sessionId={id} />
    </div>
  );
}
