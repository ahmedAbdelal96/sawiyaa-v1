/**
 * Public specialties listing page - /[locale]/specialties
 *
 * DATA: Real backend via GET /specialties (SSR, ISR 5 min).
 * This page stays honest to current backend data and groups results using
 * only the real category information returned by the API.
 */
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import PublicPageState from "@/components/public/PublicPageState";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import SpecialtiesGrid from "@/features/specialties-public/components/SpecialtiesGrid";
import SpecialtiesPageHero from "@/features/specialties-public/components/SpecialtiesPageHero";
import { fetchPublicSpecialties } from "@/features/specialties-public/api/specialties-ssr.api";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public-pages.meta.specialties" });

  return buildPublicMetadata({
    locale,
    pathname: "/specialties",
    title: t("title"),
    description: t("description"),
  });
}

export default async function SpecialtiesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = await searchParams;
  setRequestLocale(locale);

  const [t, tUnavailable] = await Promise.all([
    getTranslations("specialties-public.listing"),
    getTranslations("public-pages.unavailable"),
  ]);

  let data: Awaited<ReturnType<typeof fetchPublicSpecialties>>;
  try {
    data = await fetchPublicSpecialties(locale, q || undefined);
  } catch {
    return (
      <PublicPageState
        compact
        icon={<AlertTriangle size={36} />}
        eyebrow={tUnavailable("eyebrow")}
        title={tUnavailable("title")}
        description={tUnavailable("description")}
        actions={[
          { href: "/specialties", label: tUnavailable("retry"), primary: true },
          { href: "/practitioners", label: tUnavailable("practitioners") },
        ]}
      />
    );
  }

  const specialties = data.specialties;

  const categories = Array.from(
    new Map(
      specialties
        .filter((specialty) => specialty.category)
        .map((specialty) => [
          specialty.category!.slug,
          {
            slug: specialty.category!.slug,
            name: specialty.category!.name,
          },
        ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const quickNav = [
    { href: "/specialties", label: t("allCategories") },
    ...categories.map((category) => ({
      href: `/specialties#category-${category.slug}`,
      label: category.name,
    })),
  ];

  return (
    <>
      <SpecialtiesPageHero
        totalCount={specialties.length}
        categoryCount={categories.length}
        query={q}
        quickNav={quickNav}
      />

      <div className="bg-surface px-6 py-10 dark:bg-surface">
        <div className="mx-auto max-w-7xl">
          <SpecialtiesGrid specialties={specialties} />
        </div>
      </div>
    </>
  );
}
