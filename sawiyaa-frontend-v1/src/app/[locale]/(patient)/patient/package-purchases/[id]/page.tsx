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
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6">
      <div className="mb-6">
        <Link
          href="/patient/package-purchases"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary transition-colors"
        >
          {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t("detail.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-text-primary dark:text-white">
          {t("detail.heading")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
          {t("detail.subtitle")}
        </p>
      </div>

      <PatientPackagePurchaseDetailPanel purchaseId={id} />
    </div>
  );
}
