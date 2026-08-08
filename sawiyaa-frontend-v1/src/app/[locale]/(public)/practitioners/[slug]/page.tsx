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
  fetchPublicPractitionerInstantBookingAvailability,
} from "@/features/practitioner-profile/api/practitioner-profile-ssr.api";
import ProfileAbout from "@/features/practitioner-profile/components/ProfileAbout";
import ProfileBookingPanel from "@/features/practitioner-profile/components/ProfileBookingPanel";
import ProfileCredentials from "@/features/practitioner-profile/components/ProfileCredentials";
import ProfileHeader from "@/features/practitioner-profile/components/ProfileHeader";
import RelatedPractitioners from "@/features/practitioner-profile/components/RelatedPractitioners";
import ProfileSpecialties from "@/features/practitioner-profile/components/ProfileSpecialties";
import { fetchPublicPractitioners } from "@/features/practitioners-discovery/api/practitioners-ssr.api";
import { type PublicPractitioner } from "@/features/practitioners-discovery/types/practitioner";
import { getLocalizedLanguageLabel, SUPPORTED_LANGUAGE_CODES } from "@/constants/reference-data";
import { fetchPublicSpecialties } from "@/features/specialties-public/api/specialties-ssr.api";
import { getLocalizedSpecialtyName } from "@/features/specialties/utils/localized-specialty";

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

  const tProfile = await getTranslations("practitioner-profile");

  let specialtyLabels: Record<string, string> = {};
  try {
    const specialtiesData = await fetchPublicSpecialties(locale);
    specialtyLabels = Object.fromEntries(
      specialtiesData.specialties
        .filter((specialty) => specialty.isActive)
        .map((specialty) => [specialty.slug, getLocalizedSpecialtyName(specialty, locale)]),
    );
  } catch {
    // Non-critical: ProfileSpecialties will fall back to raw slugs.
  }

  const languageLabels = Object.fromEntries(
    SUPPORTED_LANGUAGE_CODES.map((code) => [code, getLocalizedLanguageLabel(code, locale)]),
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

  let instantBookingAvailability = null;
  try {
    instantBookingAvailability = await fetchPublicPractitionerInstantBookingAvailability(slug, locale);
  } catch {
    // Non-critical: booking panel fails closed when availability is unavailable.
  }

  return (
    <div className="px-4 py-4 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <ProfileHeader
          profile={profile}
          countryLabel={countryLabel}
          specialtyLabels={specialtyLabels}
          languageLabels={languageLabels}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)] items-start">
          {/* Left Column: Compact Practitioner Details Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="app-panel rounded-2xl p-4 sm:p-5 space-y-4">
              <ProfileAbout profile={profile} compact />
              <ProfileSpecialties
                profile={profile}
                specialtyLabels={specialtyLabels}
                languageLabels={languageLabels}
                compact
              />
              <ProfileCredentials profile={profile} compact />
            </div>
          </div>

          {/* Right Column: Schedule & Booking Area */}
          <div className="space-y-4 min-w-0">
            <ProfileBookingPanel
              profile={profile}
              instantBookingAvailability={instantBookingAvailability}
            />
          </div>
        </div>

        <RelatedPractitioners
          practitioners={related}
          specialtyLabels={specialtyLabels}
        />
      </div>
    </div>
  );
}
