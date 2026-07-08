/**
 * Public specialty detail page - /[locale]/specialties/[slug]
 *
 * DATA: Real backend via GET /specialties/:slug (SSR, ISR 5 min).
 * Related practitioners are fetched through the public practitioners listing
 * filtered by specialtySlug using the same real public contract.
 */
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import PublicPageState from "@/components/public/PublicPageState";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import SpecialtyDetailHero from "@/features/specialties-public/components/SpecialtyDetailHero";
import SpecialtyPractitionersTeaser from "@/features/specialties-public/components/SpecialtyPractitionersTeaser";
import { fetchPublicSpecialtyBySlug } from "@/features/specialties-public/api/specialties-ssr.api";
import { fetchPublicPractitioners } from "@/features/practitioners-discovery/api/practitioners-ssr.api";
import {
  LANGUAGE_CODES,
  type PublicPractitioner,
} from "@/features/practitioners-discovery/types/practitioner";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "@/features/specialties/utils/localized-specialty";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function formatDate(value: string, locale: string) {
  const numLocale = locale === "ar" ? "ar-EG" : "en-US";
  return new Date(value).toLocaleDateString(numLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const fallback = await getTranslations({
    locale,
    namespace: "public-pages.meta.specialtyFallback",
  });

  try {
    const data = await fetchPublicSpecialtyBySlug(slug, locale);
    if (!data) {
      return buildPublicMetadata({
        locale,
        pathname: `/specialties/${slug}`,
        title: fallback("title"),
        description: fallback("description"),
      });
    }

    return buildPublicMetadata({
      locale,
      pathname: `/specialties/${slug}`,
      title: `${locale === "ar" ? "سويّة" : "Sawiyaa"} | ${getLocalizedSpecialtyName(data.specialty, locale)}`,
      description: data.specialty.description ?? fallback("description"),
    });
  } catch {
    return buildPublicMetadata({
      locale,
      pathname: `/specialties/${slug}`,
      title: fallback("title"),
      description: fallback("description"),
    });
  }
}

export default async function SpecialtyDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tUnavailable = await getTranslations({
    locale,
    namespace: "public-pages.unavailable",
  });

  let data: Awaited<ReturnType<typeof fetchPublicSpecialtyBySlug>>;
  try {
    data = await fetchPublicSpecialtyBySlug(slug, locale);
  } catch {
    return (
      <PublicPageState
        compact
        icon={<AlertTriangle size={36} />}
        eyebrow={tUnavailable("eyebrow")}
        title={tUnavailable("title")}
        description={tUnavailable("description")}
        actions={[
          { href: `/specialties/${slug}`, label: tUnavailable("retry"), primary: true },
          { href: "/specialties", label: tUnavailable("specialties") },
        ]}
      />
    );
  }

  if (!data) notFound();

  const { specialty } = data;

  const [tDetail, tLanguages, practitionersData] = await Promise.all([
    getTranslations("specialties-public.detail"),
    getTranslations("practitioners-listing.languages"),
    fetchPublicPractitioners(locale, {
      specialtySlug: specialty.slug,
      sort: "recommended",
      page: 1,
      limit: 6,
    }).catch(() => ({
      items: [] as PublicPractitioner[],
      pagination: {
        page: 1,
        limit: 6,
        totalItems: 0,
        totalPages: 0,
      },
    })),
  ]);

  const specialtyLabels = {
    [specialty.slug]: getLocalizedSpecialtyName(specialty, locale),
  };

  const languageLabels = Object.fromEntries(
    LANGUAGE_CODES.map((code) => [code, tLanguages(code)]),
  );

  const metaItems = [
    {
      label: tDetail("meta.slug"),
      value: specialty.slug,
    },
    {
      label: tDetail("meta.sortOrder"),
      value: String(specialty.sortOrder),
    },
    {
      label: tDetail("meta.status"),
      value: specialty.isActive ? tDetail("statusActive") : tDetail("statusInactive"),
    },
    {
      label: tDetail("meta.category"),
      value: specialty.category
        ? getLocalizedSpecialtyCategoryName(specialty.category, locale)
        : tDetail("categoryUnavailable"),
    },
    {
      label: tDetail("meta.createdAt"),
      value: formatDate(specialty.createdAt, locale),
    },
    {
      label: tDetail("meta.updatedAt"),
      value: formatDate(specialty.updatedAt, locale),
    },
  ];

  return (
    <>
      <SpecialtyDetailHero specialty={specialty} />

      <div className="bg-surface px-6 py-10 dark:bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <section className="rounded-[30px] border border-border-light bg-white p-6 shadow-[0_14px_36px_rgba(18,68,62,0.05)] dark:border-border-light dark:bg-surface-secondary">
            <h2 className="text-2xl font-bold text-text-primary dark:text-white/92">
              {tDetail("aboutTitle")}
            </h2>
            <p className="mt-4 text-base leading-8 text-text-secondary">
              {specialty.description || tDetail("aboutFallback")}
            </p>
          </section>

          <aside className="rounded-[30px] border border-border-light bg-white p-6 shadow-[0_14px_36px_rgba(18,68,62,0.05)] dark:border-border-light dark:bg-surface-secondary">
            <h2 className="text-2xl font-bold text-text-primary dark:text-white/92">
              {tDetail("metaTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              {tDetail("metaSubtitle")}
            </p>

            <div className="mt-6 grid gap-3">
              {metaItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-surface px-4 py-4 dark:bg-surface"
                >
                  <p className="text-xs font-medium text-text-muted">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/90">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <SpecialtyPractitionersTeaser
        specialtySlug={specialty.slug}
        practitioners={practitionersData.items}
        specialtyLabels={specialtyLabels}
        languageLabels={languageLabels}
        totalItems={practitionersData.pagination.totalItems}
      />
    </>
  );
}
