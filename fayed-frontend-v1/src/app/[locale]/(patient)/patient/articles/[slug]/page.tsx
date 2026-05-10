import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
import { Link } from "@/i18n/navigation";
import PatientArticleDetailScreen from "@/features/articles-public/components/PatientArticleDetailScreen";
import { fetchPublicArticleBySlug } from "@/features/articles-public/api/articles-public-ssr.api";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const fallback = await getTranslations({
    locale,
    namespace: "public-articles.patient.metaFallback",
  });

  try {
    const article = await fetchPublicArticleBySlug(slug, locale);

    if (!article) {
      return {
        title: fallback("title"),
        description: fallback("description"),
      };
    }

    return {
      title: article.seo.metaTitle ?? article.title,
      description: article.seo.metaDescription ?? article.excerpt ?? fallback("description"),
    };
  } catch {
    return {
      title: fallback("title"),
      description: fallback("description"),
    };
  }
}

export default async function PatientArticleDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tUnavailable = await getTranslations({
    locale,
    namespace: "public-articles.patient.states.unavailable",
  });

  let article: Awaited<ReturnType<typeof fetchPublicArticleBySlug>>;
  try {
    article = await fetchPublicArticleBySlug(slug, locale);
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
              href={`/patient/articles/${slug}` as never}
              className="inline-flex rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {tUnavailable("retry")}
            </Link>
            <Link
              href="/patient/articles"
              className="inline-flex rounded-2xl border border-border-light px-4 py-2 text-sm font-semibold text-text-primary dark:text-white/90"
            >
              {tUnavailable("articles")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!article) notFound();

  return (
    <div className="app-max-content mx-auto space-y-5 px-4 py-8 sm:space-y-6">
      <section className="app-panel-soft rounded-[28px] p-4 sm:p-5">
        <PatientQuickNav />
      </section>
      <PatientArticleDetailScreen article={article} />
    </div>
  );
}
