import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Brain, Apple, Activity } from "lucide-react";
import { fetchPublicSpecialties } from "@/features/specialties-public/api/specialties-ssr.api";

const SPECIALTY_THEMES = [
  {
    icon: Brain,
    iconColor: "text-[#24564F]",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
    hoverBorder: "hover:border-[#24564F]/30 hover:ring-2 hover:ring-[#24564F]/5",
    accentBar: "bg-[#24564F]",
  },
  {
    icon: Apple,
    iconColor: "text-[#B58E58]",
    iconBg: "bg-amber-50 dark:bg-amber-950/30",
    hoverBorder: "hover:border-[#C8A979]/30 hover:ring-2 hover:ring-[#C8A979]/5",
    accentBar: "bg-[#C8A979]",
  },
  {
    icon: Activity,
    iconColor: "text-[#3F6E58]",
    iconBg: "bg-cyan-50 dark:bg-cyan-950/30",
    hoverBorder: "hover:border-[#3F6E58]/30 hover:ring-2 hover:ring-[#3F6E58]/5",
    accentBar: "bg-[#3F6E58]",
  },
] as const;

export default async function SpecialtiesSection() {
  const [t, locale] = await Promise.all([
    getTranslations("home.specialties"),
    getLocale(),
  ]);

  let specialties: Array<{ id: string; name: string | null; slug: string }> = [];
  try {
    const data = await fetchPublicSpecialties(locale);
    specialties = data.specialties.slice(0, 6);
  } catch {
    // Keep home resilient if the backend is temporarily unavailable.
  }

  if (specialties.length === 0) return null;

  return (
    <section className="px-6 py-14 lg:px-12 lg:py-18">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h2 className="text-2xl font-bold text-text-primary md:text-3xl dark:text-white/92">
              {t("title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {t("subtitle")}
            </p>
          </div>

          <Link
            href="/specialties"
            className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-[#EEF4EF] hover:text-[#24564F]"
          >
            {t("viewAll")}
            <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.map((specialty, i) => {
            const theme = SPECIALTY_THEMES[i % SPECIALTY_THEMES.length];
            const SpecialtyIcon = theme.icon;

            return (
              <Link
                key={specialty.id}
                href={`/specialties/${specialty.slug}`}
                className={`app-panel app-lift group relative overflow-hidden flex flex-col rounded-[22px] p-5 border border-border-light/60 transition duration-300 hover:-translate-y-1.5 ${theme.hoverBorder}`}
              >
                {/* Visual Top accent bar */}
                <span className={`absolute top-0 right-0 left-0 h-[3px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${theme.accentBar}`} />

                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${theme.iconBg} text-primary shadow-[0_6px_15px_-8px_rgba(25,52,57,0.2)] ring-1 ring-inset ring-primary/5`}>
                  <SpecialtyIcon size={18} className={theme.iconColor} />
                </div>

                <h3 className="text-base font-bold text-text-primary transition-colors duration-200 group-hover:text-text-brand dark:text-white/90">
                  {specialty.name}
                </h3>

                <div className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors duration-200 group-hover:text-[#24564F]">
                  {t("viewAll")}
                  <ArrowRight size={12} className="rtl:rotate-180 transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}