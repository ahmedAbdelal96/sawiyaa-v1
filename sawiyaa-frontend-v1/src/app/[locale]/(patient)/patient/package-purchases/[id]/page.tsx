import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import PatientPackagePurchaseDetailPanel from "@/features/package-plans/components/PatientPackagePurchaseDetailPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "package-purchases" });
  return {
    title: t("meta.detailTitle"),
  };
}

export default async function PatientPackagePurchaseDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "package-purchases" });
  const isRtl = locale === "ar";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-6">
      <div className="border-b border-border-light/60 pb-4">
        <Link
          href="/patient/package-purchases"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-[#24564F] transition-colors mb-2"
        >
          {isRtl ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
          <span>{t("detail.back")}</span>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
          {t("detail.heading")}
        </h1>
        <p className="text-xs text-text-secondary mt-0.5 max-w-2xl leading-relaxed">
          {t("detail.subtitle")}
        </p>
      </div>

      <PatientPackagePurchaseDetailPanel purchaseId={id} />
    </div>
  );
}
