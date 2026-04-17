import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
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
import { Link } from "@/i18n/navigation";

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
      return {
        title: fallback("title"),
        description: fallback("description"),
      };
    }

    const { item: profile } = data;
    const description =
      (locale === "ar" ? profile.bioAr : profile.bioEn).slice(0, 160) ||
      fallback("description");

    return {
      title: `Fayed | ${locale === "ar" ? profile.nameAr : profile.nameEn}`,
      description,
    };
  } catch {
    return {
      title: fallback("title"),
      description: fallback("description"),
    };
  }
}

export default async function PatientPractitionerProfilePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tUnavailable = await getTranslations({
    locale,
    namespace: "public-pages.unavailable",
  });

  let data: Awaited<ReturnType<typeof fetchPublicPractitionerBySlug>>;
  try {
    data = await fetchPublicPractitionerBySlug(slug, locale);
  } catch {
    return (
      <div className="app-max-content mx-auto px-4 py-8">
        <section className="app-panel rounded-[28px] p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {tUnavailable("eyebrow")}
              </p>
              <h1 className="mt-1 text-lg font-semibold text-text-primary dark:text-white/95">
                {tUnavailable("title")}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                {tUnavailable("description")}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/patient/practitioners/${slug}`}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              {tUnavailable("retry")}
            </Link>
            <Link
              href="/patient/practitioners"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm font-semibold text-text-primary hover:border-primary/30 hover:text-primary"
            >
              {tUnavailable("practitioners")}
            </Link>
          </div>
        </section>
      </div>
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
    // Non-critical: profile can render with slug fallback labels.
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
    // Non-critical: related practitioners is additive.
  }

  let presence = null;
  try {
    presence = await fetchPublicPractitionerPresence(slug, locale);
  } catch {
    // Non-critical: booking panel handles missing presence data.
  }

  let trustBlock = null;
  try {
    trustBlock = await fetchPublicPractitionerTrustBlock(slug, locale);
  } catch {
    // Non-critical: trust block is optional.
  }

  return (
    <div className="px-4 py-8">
      <div className="app-max-content mx-auto space-y-5">
        <ProfileHeader
          profile={profile}
          countryLabel={countryLabel}
          specialtyLabels={specialtyLabels}
          languageLabels={languageLabels}
          backHref="/patient/practitioners"
          showBookingCta
        />

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

      <RelatedPractitioners
        practitioners={related}
        specialtyLabels={specialtyLabels}
      />
    </div>
  );
}
