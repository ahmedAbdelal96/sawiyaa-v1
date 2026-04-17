import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PaySessionPanel from "@/features/payments/components/PaySessionPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payments" });
  return {
    title: t("meta.payTitle"),
  };
}

export default async function PatientSessionPayPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "payments" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 rounded-3xl border border-border-light bg-white p-6 dark:bg-surface-secondary">
        <Link
          href="/patient/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary"
        >
          <ArrowLeft size={14} className="rtl:rotate-180" />
          {t("page.backToSessions")}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-text-primary dark:text-white/95">
          {t("page.heading")}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">{t("page.subheading")}</p>
      </div>

      <PaySessionPanel sessionId={id} />
    </div>
  );
}
