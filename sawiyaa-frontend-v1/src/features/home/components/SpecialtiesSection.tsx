import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Brain, Heart, Sparkles, UserCheck, Shield, Smile } from "lucide-react";
import { fetchPublicSpecialties } from "@/features/specialties-public/api/specialties-ssr.api";
import { getLocalizedSpecialtyName } from "@/features/specialties/utils/localized-specialty";

const SPECIALTY_ICONS = [Brain, Heart, Sparkles, UserCheck, Shield, Smile];

export default async function SpecialtiesSection() {
  const [t, locale] = await Promise.all([
    getTranslations("home.specialties"),
    getLocale(),
  ]);
  const isAr = locale === "ar";

  let specialties: Array<{
    id: string;
    name: string | null;
    nameAr: string | null;
    nameEn: string | null;
    slug: string;
  }> = [];

  try {
    const data = await fetchPublicSpecialties(locale);
    specialties = data.specialties.filter((s) => s.isActive).slice(0, 6);
  } catch {
    // Graceful fallback
  }

  if (specialties.length === 0) return null;

  return (
    <section className="px-6 py-12 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#24564F]">
              {t("eyebrow")}
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C2F2B] dark:text-white/95">
              {t("title")}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-text-secondary dark:text-white/70">
              {t("subtitle")}
            </p>
          </div>

          <Link
            href="/specialties"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#24564F] transition hover:text-[#1F4A44] hover:underline"
          >
            <span>{t("viewAll")}</span>
            <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.map((specialty, i) => {
            const Icon = SPECIALTY_ICONS[i % SPECIALTY_ICONS.length];

            return (
              <Link
                key={specialty.id}
                href={`/practitioners?specialtySlug=${specialty.slug}`}
                className="app-lift group relative flex items-center justify-between rounded-2xl border border-border-light/70 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-[#24564F]/30 hover:shadow-sm dark:bg-surface-secondary dark:border-white/10"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4EF] text-[#24564F] group-hover:bg-[#24564F] group-hover:text-white transition-colors dark:bg-white/5 dark:text-[#A7BFAE]">
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-[#1C2F2B] group-hover:text-[#24564F] transition-colors truncate dark:text-white/90">
                      {getLocalizedSpecialtyName(specialty, locale)}
                    </h3>
                    <p className="text-xs text-text-muted dark:text-white/50">
                      {locale === "ar" ? "استكشف المختصين" : "Explore Specialists"}
                    </p>
                  </div>
                </div>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FCFAF6] text-[#24564F] opacity-0 group-hover:opacity-100 transition-opacity dark:bg-white/5">
                  <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
