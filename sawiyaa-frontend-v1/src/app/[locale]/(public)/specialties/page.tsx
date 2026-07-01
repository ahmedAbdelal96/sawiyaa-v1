/**
 * Public specialties listing page - /[locale]/specialties
 *
 * DATA: Real backend via GET /specialties and GET /specialty-categories.
 * This page stays honest to current backend data and renders active care-path
 * categories even when sub-specialties have not been added yet.
 */
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import PublicPageState from "@/components/public/PublicPageState";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import SpecialtiesGrid from "@/features/specialties-public/components/SpecialtiesGrid";
import SpecialtiesPageHero from "@/features/specialties-public/components/SpecialtiesPageHero";
import {
  fetchPublicSpecialties,
  fetchPublicSpecialtyCategories,
} from "@/features/specialties-public/api/specialties-ssr.api";

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

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function matchesSearch(
  value: string | null | undefined,
  normalizedQuery: string,
) {
  if (!normalizedQuery) return true;
  if (!value) return false;
  return value.toLowerCase().includes(normalizedQuery);
}

export default async function SpecialtiesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = await searchParams;
  setRequestLocale(locale);

  const [t, tUnavailable] = await Promise.all([
    getTranslations("specialties-public.listing"),
    getTranslations("public-pages.unavailable"),
  ]);

  let specialtiesData: Awaited<ReturnType<typeof fetchPublicSpecialties>>;
  let categoriesData: Awaited<ReturnType<typeof fetchPublicSpecialtyCategories>>;
  try {
    [specialtiesData, categoriesData] = await Promise.all([
      fetchPublicSpecialties(locale, q || undefined),
      fetchPublicSpecialtyCategories(locale),
    ]);
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

  const normalizedQuery = normalizeSearch(q);
  const allSpecialties = specialtiesData.specialties;
  const allCategories = categoriesData.categories;

  const filteredCategories = allCategories.filter((category) => {
    if (!normalizedQuery) return true;

    if (
      matchesSearch(category.name, normalizedQuery) ||
      matchesSearch(category.slug, normalizedQuery) ||
      matchesSearch(category.description, normalizedQuery)
    ) {
      return true;
    }

    return allSpecialties.some((specialty) =>
      specialty.category?.id === category.id &&
      (
        matchesSearch(specialty.name, normalizedQuery) ||
        matchesSearch(specialty.slug, normalizedQuery) ||
        matchesSearch(specialty.description, normalizedQuery)
      ));
  });

  const filteredCategoryIds = new Set(filteredCategories.map((category) => category.id));
  const filteredSpecialties = allSpecialties.filter((specialty) => {
    if (!normalizedQuery) return true;
    if (!specialty.category?.id) return true;
    return filteredCategoryIds.has(specialty.category.id);
  });

  const groupedCategories = filteredCategories.map((category) => ({
    category,
    specialties: filteredSpecialties
      .filter((specialty) => specialty.category?.id === category.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));

  const categorizedSpecialtyIds = new Set(
    groupedCategories.flatMap((group) => group.specialties.map((specialty) => specialty.id)),
  );
  const uncategorizedSpecialties = filteredSpecialties
    .filter((specialty) => !specialty.category || !categorizedSpecialtyIds.has(specialty.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const carePathCount = groupedCategories.length;
  const subSpecialtyCount = filteredSpecialties.length;

  const quickNav = [
    { href: "/specialties", label: t("allCategories") },
    ...filteredCategories.map((category) => ({
      href: `/specialties#category-${category.slug}`,
      label: category.name,
    })),
  ];

  const hasAnyResults = carePathCount > 0 || subSpecialtyCount > 0;

  return (
    <>
      <SpecialtiesPageHero
        carePathCount={carePathCount}
        subSpecialtyCount={subSpecialtyCount}
        query={q}
        quickNav={quickNav}
      />

      <div className="bg-[#F7F4EE] px-6 py-12 dark:bg-[#0b1212]">
        <div className="mx-auto max-w-7xl">
          {hasAnyResults ? (
            <SpecialtiesGrid
              groups={groupedCategories}
              uncategorizedSpecialties={uncategorizedSpecialties}
            />
          ) : (
            <SpecialtiesGrid groups={[]} uncategorizedSpecialties={[]} />
          )}
        </div>
      </div>
    </>
  );
}
