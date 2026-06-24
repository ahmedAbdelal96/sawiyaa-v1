/**
 * Public practitioner profile page - /[locale]/practitioners/[slug]
 *
 * DATA:
 *   Real backend via GET /public/practitioners/:slug (SSR).
 *   Presence is fetched separately via GET /public/practitioners/:slug/presence.
 *
 * SSR DECISION:
 *   Server Component, calls SSR-safe API functions directly.
 *   Unknown or hidden slugs resolve to notFound().
 *
 * RELATED PRACTITIONERS:
 *   Fetched via a secondary listing call filtered by the first specialty.
 *   Best-effort and non-blocking.
 */
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import PublicPageState from "@/components/public/PublicPageState";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import { getUserData } from "@/lib/auth/server";
import {
  fetchPublicPractitionerBySlug,
  fetchPublicPractitionerPresence,
  fetchPublicPractitionerTrustBlock,
} from "@/features/practitioner-profile/api/practitioner-profile-ssr.api";
import ProfileAbout from "@/features/practitioner-profile/components/ProfileAbout";
import ProfileBookingPanel from "@/features/practitioner-profile/components/ProfileBookingPanel";
import ProfileCredentials from "@/features/practitioner-profile/components/ProfileCredentials";
import ProfileHeader from "@/features/practitioner-profile/components/ProfileHeader";
import RelatedPractitioners from "@/features/practitioner-profile/components/RelatedPractitioners";
import ProfileSpecialties from "@/features/practitioner-profile/components/ProfileSpecialties";
import ProfileTrustSection from "@/features/practitioner-profile/components/ProfileTrustSection";
import { fetchPublicPractitioners } from "@/features/practitioners-discovery/api/practitioners-ssr.api";
import {
  LANGUAGE_CODES,
  type PublicPractitioner,
} from "@/features/practitioners-discovery/types/practitioner";
import { fetchPublicSpecialties } from "@/features/specialties-public/api/specialties-ssr.api";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const fallback = await getTranslations({
    locale,
    namespace: "public-pages.meta.practitionerProfileFallback",
  });

  try {
    const data = await fetchPublicPractitionerBySlug(slug, locale);
    if (!data) {
      return buildPublicMetadata({
        locale,
        pathname: `/practitioners/${slug}`,
        title: fallback("title"),
        description: fallback("description"),
      });
    }

    const { item: profile } = data;
    const description =
      (locale === "ar" ? profile.bioAr : profile.bioEn).slice(0, 160) ||
      fallback("description");

    return buildPublicMetadata({
      locale,
      pathname: `/practitioners/${slug}`,
      title: `${locale === "ar" ? "سويّة" : "Sawiyaa"} | ${locale === "ar" ? profile.nameAr : profile.nameEn}`,
      description,
    });
  } catch {
    return buildPublicMetadata({
      locale,
      pathname: `/practitioners/${slug}`,
      title: fallback("title"),
      description: fallback("description"),
    });
  }
}

export default async function PractitionerProfilePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const user = await getUserData();
  if (user?.role === "PATIENT") {
    redirect(`/${locale}/patient/practitioners/${slug}`);
  }

  const tUnavailable = await getTranslations({
    locale,
    namespace: "public-pages.unavailable",
  });

  let data: Awaited<ReturnType<typeof fetchPublicPractitionerBySlug>>;
  try {
    data = await fetchPublicPractitionerBySlug(slug, locale);
  } catch {
    return (
      <PublicPageState
        compact
        icon={<AlertTriangle size={36} />}
        eyebrow={tUnavailable("eyebrow")}
        title={tUnavailable("title")}
        description={tUnavailable("description")}
        actions={[
          { href: `/practitioners/${slug}`, label: tUnavailable("retry"), primary: true },
          { href: "/practitioners", label: tUnavailable("practitioners") },
        ]}
      />
    );
  }

  if (!data) notFound();

  const { item: profile } = data;

  const [tLanguages, tProfile] = await Promise.all([
    getTranslations("practitioners-listing.languages"),
    getTranslations("practitioner-profile"),
  ]);

  let specialtyLabels: Record<string, string> = {};
  try {
    const specialtiesData = await fetchPublicSpecialties(locale);
    specialtyLabels = Object.fromEntries(
      specialtiesData.specialties
        .filter((specialty) => specialty.isActive)
        .map((specialty) => [specialty.slug, specialty.name ?? specialty.slug]),
    );
  } catch {
    // Non-critical: ProfileSpecialties will fall back to raw slugs.
  }

  const languageLabels = Object.fromEntries(
    LANGUAGE_CODES.map((code) => [code, tLanguages(code)]),
  );

  const countryLabel =
    tProfile(`countries.${profile.country}` as Parameters<typeof tProfile>[0]) ??
    profile.country;

  let related: PublicPractitioner[] = [];
  try {
    if (profile.specialties.length > 0) {
      const relatedData = await fetchPublicPractitioners(locale, {
        specialtySlug: profile.specialties[0],
        limit: 4,
      });
      related = relatedData.items.filter((item) => item.slug !== slug).slice(0, 3);
    }
  } catch {
    // Non-critical: related practitioners should not block page rendering.
  }

  let presence = null;
  try {
    presence = await fetchPublicPractitionerPresence(slug, locale);
  } catch {
    // Non-critical: booking panel gracefully falls back when presence is unavailable.
  }

  let trustBlock = null;
  try {
    trustBlock = await fetchPublicPractitionerTrustBlock(slug, locale);
  } catch {
    // Non-critical: trust block is additive and should not block the profile page.
  }

  return (
    <>
      <ProfileHeader
        profile={profile}
        countryLabel={countryLabel}
        specialtyLabels={specialtyLabels}
        languageLabels={languageLabels}
      />

      <div className="bg-surface px-6 py-10 dark:bg-surface">
        <div className="mx-auto max-w-7xl space-y-8">
          <ProfileBookingPanel profile={profile} presence={presence} />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
            <div className="space-y-6">
              <ProfileAbout profile={profile} />
              {trustBlock ? <ProfileTrustSection trustBlock={trustBlock} /> : null}
            </div>

            <div className="grid gap-6">
              <ProfileSpecialties
                profile={profile}
                specialtyLabels={specialtyLabels}
                languageLabels={languageLabels}
              />
              <ProfileCredentials profile={profile} />
            </div>
          </div>
        </div>
      </div>

      <RelatedPractitioners
        practitioners={related}
        specialtyLabels={specialtyLabels}
      />
    </>
  );
}
