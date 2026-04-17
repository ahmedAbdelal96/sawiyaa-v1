import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PractitionerSessionDetailPanel from "@/features/sessions/components/PractitionerSessionDetailPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sessions" });
  return {
    title: t("practitioner.meta.detailTitle"),
  };
}

export default async function PractitionerSessionDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "sessions" });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/practitioner/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary"
        >
          {"<-"} {t("practitioner.detail.backToSessions")}
        </Link>
        <h1 className="mt-4 text-xl font-bold text-text-primary dark:text-white/95">
          {t("practitioner.detail.heading")}
        </h1>
      </div>

      <PractitionerSessionDetailPanel sessionId={id} />
    </div>
  );
}
