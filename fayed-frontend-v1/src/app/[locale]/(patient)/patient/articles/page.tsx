import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import PatientArticlesIndexScreen from "@/features/articles-public/components/PatientArticlesIndexScreen";
import { fetchPublicArticles } from "@/features/articles-public/api/articles-public-ssr.api";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public-articles.patient.meta" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function PatientArticlesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const tUnavailable = await getTranslations({
    locale,
    namespace: "public-articles.patient.states.unavailable",
  });

  let data: Awaited<ReturnType<typeof fetchPublicArticles>>;
  try {
    data = await fetchPublicArticles(locale, {
      page: currentPage,
      limit: 9,
    });
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="app-panel rounded-[28px] p-6 text-center">
          <div className="mb-3 flex justify-center text-primary">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-xl font-semibold text-text-primary dark:text-white/95">
            {tUnavailable("title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {tUnavailable("note")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/patient/articles"
              className="inline-flex rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {tUnavailable("retry")}
            </Link>
            <Link
              href="/patient/practitioners"
              className="inline-flex rounded-2xl border border-border-light px-4 py-2 text-sm font-semibold text-text-primary dark:text-white/90"
            >
              {tUnavailable("practitioners")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <PatientArticlesIndexScreen data={data} />
    </div>
  );
}
