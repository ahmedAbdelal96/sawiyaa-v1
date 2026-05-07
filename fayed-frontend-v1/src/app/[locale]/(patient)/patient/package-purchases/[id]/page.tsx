import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/patient/package-purchases"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary"
        >
          {"<-"} {t("detail.back")}
        </Link>
        <h1 className="mt-4 text-xl font-bold text-text-primary dark:text-white/95">
          {t("detail.heading")}
        </h1>
      </div>

      <PatientPackagePurchaseDetailPanel purchaseId={id} />
    </div>
  );
}
