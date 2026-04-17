import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Star, BadgeCheck, ArrowRight, Clock3 } from "lucide-react";
import { fetchPublicPractitioners } from "@/features/practitioners-discovery/api/practitioners-ssr.api";

export default async function PractitionersSection() {
  const [t, locale] = await Promise.all([
    getTranslations("home.practitioners"),
    getLocale(),
  ]);

  let practitioners: Awaited<ReturnType<typeof fetchPublicPractitioners>>["items"] = [];
  try {
    const data = await fetchPublicPractitioners(locale, {
      sort: "recommended",
      page: 1,
      limit: 3,
    });
    practitioners = data.items.slice(0, 3);
  } catch {
    return null;
  }

  if (practitioners.length === 0) {
    return null;
  }

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            {t("eyebrow")}
          </p>
          <h2 className="mb-4 text-3xl font-bold text-text-primary md:text-4xl dark:text-white/92">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-text-secondary">
            {t("subtitle")}
          </p>
        </div>

        <div className="rounded-[38px] bg-surface p-4 ring-1 ring-inset ring-border-light sm:p-6 dark:bg-surface dark:ring-border-light">
          <div className="grid gap-6 md:grid-cols-3">
            {practitioners.map((practitioner) => (
              <div
                key={practitioner.id}
                className="app-panel app-lift group overflow-hidden rounded-[32px] hover:-translate-y-1"
              >
                <div
                  className="relative flex items-center justify-center bg-primary-light dark:bg-primary/15"
                  style={{ height: "220px" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="h-36 w-36 rounded-full border-2 border-white/90" />
                    <div className="absolute h-24 w-24 rounded-full border border-white/80" />
                  </div>

                  <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/70 bg-primary text-2xl font-bold text-white shadow-lg">
                    {practitioner.initials}
                  </div>

                  {practitioner.isVerified && (
                    <div className="absolute end-4 top-4 flex items-center gap-1 rounded-full bg-surface-secondary/95 px-2.5 py-1 shadow-sm dark:bg-surface-secondary/95">
                      <BadgeCheck size={13} className="text-primary" />
                      <span className="text-[11px] font-semibold text-primary">
                        {t("verified")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="px-5 py-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-text-primary dark:text-white/90">
                        {locale === "ar" ? practitioner.nameAr : practitioner.nameEn}
                      </h4>
                      <p className="mt-0.5 text-sm text-text-secondary">
                        {locale === "ar" ? practitioner.titleAr : practitioner.titleEn}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-primary-light px-2.5 py-1.5 ring-1 ring-inset ring-primary/8">
                      <Star size={13} className="fill-primary text-primary" />
                      <span className="text-sm font-bold text-primary">
                        {practitioner.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                    {practitioner.isVerified && (
                      <span className="inline-flex items-center gap-1">
                        <BadgeCheck size={12} className="text-primary" />
                        {t("verified")}
                      </span>
                    )}
                    {practitioner.reviewCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Star size={12} className="text-primary" />
                        {t("reviewsCount", { count: practitioner.reviewCount })}
                      </span>
                    )}
                    {practitioner.yearsExperience > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} />
                        {t("experience", { years: practitioner.yearsExperience })}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/practitioners/${practitioner.slug}`}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border-light bg-white py-3 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-primary hover:text-white dark:bg-surface"
                  >
                    {t("viewProfile")}
                    <ArrowRight size={14} className="rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/practitioners"
            className="app-panel inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 font-semibold text-primary transition-all hover:bg-primary-light"
          >
            {t("viewAll")}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}
