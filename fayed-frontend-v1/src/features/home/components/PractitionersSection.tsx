import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Star, BadgeCheck, ArrowRight, Clock3 } from "lucide-react";
import { fetchPublicFeaturedPractitioners } from "@/features/home/api/featured-practitioners.api";
import type { FeaturedPractitionerHomeCard } from "@/features/home/api/featured-practitioners.api";
import { fetchPublicPractitioners } from "@/features/practitioners-discovery/api/practitioners-ssr.api";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";

const TRUST_INDICATORS = [
  { key: "isVerified", icon: BadgeCheck, color: "text-teal-600", bg: "bg-teal-50", ring: "ring-teal-200" },
  { key: "reviewCount", icon: Star, color: "text-sky-600", bg: "bg-sky-50", ring: "ring-sky-200" },
  { key: "yearsExperience", icon: Clock3, color: "text-indigo-600", bg: "bg-indigo-50", ring: "ring-indigo-200" },
] as const;

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

interface PractitionerCardProps {
  practitioner: FeaturedPractitionerHomeCard;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
  eyebrow: string;
}

function FeaturedPractitionerCard({ practitioner, locale, t, eyebrow }: PractitionerCardProps) {
  const initials = getInitials(practitioner.displayName);
  const displayTitle = locale === "ar"
    ? practitioner.professionalTitle
    : practitioner.professionalTitle;

  return (
    <div className="app-panel app-lift group overflow-hidden rounded-[28px] hover:-translate-y-1">
      <div
        className="relative flex items-center justify-center bg-sky-50 dark:bg-primary/10"
        style={{ height: "200px" }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <div className="h-36 w-36 rounded-full border-2 border-sky-300" />
          <div className="absolute h-24 w-24 rounded-full border border-sky-300" />
        </div>

        <PractitionerAvatar
          src={practitioner.avatarUrl}
          alt={practitioner.displayName}
          initials={initials}
          className="relative z-10 h-20 w-20 rounded-full border-4 border-white/80 object-cover shadow-lg ring-2 ring-sky-200"
        />

        {practitioner.isVerified && (
          <div className="absolute end-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 shadow-sm dark:bg-surface-secondary/95">
            <BadgeCheck size={13} className="text-teal-600" />
            <span className="text-[11px] font-semibold text-teal-600">
              {t("verified")}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 py-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-text-primary dark:text-white/90">
              {practitioner.displayName}
            </h4>
            {displayTitle && (
              <p className="mt-0.5 text-sm text-text-secondary">{displayTitle}</p>
            )}
          </div>
          {practitioner.averageRating != null && practitioner.averageRating > 0 && (
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 ring-1 ring-inset ring-amber-200">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-amber-600">
                {practitioner.averageRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {practitioner.badgeLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
              {practitioner.badgeLabel}
            </span>
          )}
          {practitioner.isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-600 ring-1 ring-inset ring-teal-200">
              <BadgeCheck size={11} />
              {t("verified")}
            </span>
          )}
          {practitioner.totalReviews > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-600 ring-1 ring-inset ring-sky-200">
              <Star size={11} />
              {t("reviewsCount", { count: practitioner.totalReviews })}
            </span>
          )}
        </div>

        <Link
          href={`/practitioners/${practitioner.slug}`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border-light bg-white py-2.5 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-primary hover:text-white dark:bg-surface"
        >
          {t("viewProfile")}
          <ArrowRight size={13} className="rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}

export default async function PractitionersSection() {
  const [t, locale] = await Promise.all([
    getTranslations("home.practitioners"),
    getLocale(),
  ]);

  let featuredPractitioners: FeaturedPractitionerHomeCard[] = [];

  try {
    featuredPractitioners = await fetchPublicFeaturedPractitioners(locale);
  } catch {
    // Fall back to recommended practitioners
  }

  const hasFeatured = featuredPractitioners.length > 0;
  const practitioners = hasFeatured ? featuredPractitioners.slice(0, 5) : [];

  // If no featured practitioners, fall back to recommended
  let fallbackPractitioners: Awaited<ReturnType<typeof fetchPublicPractitioners>>["items"] = [];
  if (!hasFeatured) {
    try {
      const data = await fetchPublicPractitioners(locale, {
        sort: "recommended",
        page: 1,
        limit: 3,
      });
      fallbackPractitioners = data.items.slice(0, 3);
    } catch {
      return null;
    }
    if (fallbackPractitioners.length === 0) {
      return null;
    }
  }

  const eyebrow = hasFeatured ? t("eyebrow") : t("fallbackTitle");

  return (
    <section className="px-6 py-16 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            {eyebrow}
</p>
          <h2 className="mb-3 text-2xl font-bold text-text-primary md:text-3xl dark:text-white/92">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-text-secondary">
            {t("subtitle")}
          </p>
        </div>

        <div className="rounded-[32px] bg-surface p-4 ring-1 ring-inset ring-border-light sm:p-6 dark:bg-surface dark:ring-border-light">
          {practitioners.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {practitioners.map((p) => (
                <FeaturedPractitionerCard
                  key={p.practitionerId}
                  practitioner={p}
                  locale={locale}
                  t={t}
                  eyebrow={eyebrow}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {fallbackPractitioners.map((p) => {
                const initials =
                  (locale === "ar" ? p.nameAr : p.nameEn)
                    ?.split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() ?? "?";

                return (
                  <div
                    key={p.id}
                    className="app-panel app-lift group overflow-hidden rounded-[28px] hover:-translate-y-1"
                  >
                    <div
                      className="relative flex items-center justify-center bg-sky-50 dark:bg-primary/10"
                      style={{ height: "200px" }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <div className="h-36 w-36 rounded-full border-2 border-sky-300" />
                        <div className="absolute h-24 w-24 rounded-full border border-sky-300" />
                      </div>

                      <PractitionerAvatar
                        src={undefined}
                        alt={locale === "ar" ? p.nameAr : p.nameEn}
                        initials={initials}
                        className="relative z-10 h-20 w-20 rounded-full border-4 border-white/80 object-cover shadow-lg ring-2 ring-sky-200"
                      />

                      {p.isVerified && (
                        <div className="absolute end-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 shadow-sm dark:bg-surface-secondary/95">
                          <BadgeCheck size={13} className="text-teal-600" />
                          <span className="text-[11px] font-semibold text-teal-600">
                            {t("verified")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="px-5 py-5">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-text-primary dark:text-white/90">
                            {locale === "ar" ? p.nameAr : p.nameEn}
                          </h4>
                          <p className="mt-0.5 text-sm text-text-secondary">
                            {locale === "ar" ? p.titleAr : p.titleEn}
                          </p>
                        </div>
                        {p.rating > 0 && (
                          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 ring-1 ring-inset ring-amber-200">
                            <Star size={13} className="fill-amber-400 text-amber-400" />
                            <span className="text-sm font-bold text-amber-600">
                              {p.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        {p.isVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-600 ring-1 ring-inset ring-teal-200">
                            <BadgeCheck size={11} />
                            {t("verified")}
                          </span>
                        )}
                        {p.reviewCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-600 ring-1 ring-inset ring-sky-200">
                            <Star size={11} />
                            {t("reviewsCount", { count: p.reviewCount })}
                          </span>
                        )}
                        {p.yearsExperience > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 ring-1 ring-inset ring-indigo-200">
                            <Clock3 size={11} />
                            {t("experience", { years: p.yearsExperience })}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/practitioners/${p.slug}`}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border-light bg-white py-2.5 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-primary hover:text-white dark:bg-surface"
                      >
                        {t("viewProfile")}
                        <ArrowRight size={13} className="rtl:rotate-180" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/practitioners"
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-3 font-semibold text-primary transition-all hover:bg-primary-light"
          >
            {t("viewAll")}
            <ArrowRight size={15} className="rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}
