import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Brain } from "lucide-react";
import { fetchPublicSpecialties } from "@/features/specialties-public/api/specialties-ssr.api";

const SPECIALTY_COLORS = [
  { bgClass: "bg-sky-50", iconClass: "text-sky-600", ringClass: "ring-sky-200" },
  { bgClass: "bg-indigo-50", iconClass: "text-indigo-600", ringClass: "ring-indigo-200" },
  { bgClass: "bg-violet-50", iconClass: "text-violet-600", ringClass: "ring-violet-200" },
  { bgClass: "bg-emerald-50", iconClass: "text-emerald-600", ringClass: "ring-emerald-200" },
  { bgClass: "bg-amber-50", iconClass: "text-amber-600", ringClass: "ring-amber-200" },
  { bgClass: "bg-rose-50", iconClass: "text-rose-600", ringClass: "ring-rose-200" },
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
            className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary-light"
          >
            {t("viewAll")}
            <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.map((specialty, i) => {
            const color = SPECIALTY_COLORS[i % SPECIALTY_COLORS.length];
            return (
              <Link
                key={specialty.id}
                href={`/specialties/${specialty.slug}`}
                className="app-panel app-lift group rounded-[22px] p-5 transition hover:-translate-y-1"
              >
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${color.bgClass} ${color.ringClass} ring-1 text-primary`}>
                  <Brain size={18} className={color.iconClass} />
                </div>
                <h3 className="text-base font-bold text-text-primary dark:text-white/90">
                  {specialty.name}
                </h3>
                <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
                  {t("viewAll")}
                  <ArrowRight size={12} className="rtl:rotate-180" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}