import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Brain } from "lucide-react";
import { fetchPublicSpecialties } from "@/features/specialties-public/api/specialties-ssr.api";

export default async function SpecialtiesSection() {
  const [t, locale] = await Promise.all([
    getTranslations("home.specialties"),
    getLocale(),
  ]);

  let specialties: Array<{ id: string; name: string | null; slug: string }> = [];
  try {
    const data = await fetchPublicSpecialties(locale);
    specialties = data.specialties.slice(0, 8);
  } catch {
    // Keep home resilient if the backend is temporarily unavailable.
  }

  if (specialties.length === 0) return null;

  const featured = specialties[0];
  const secondary = specialties.slice(1, 5);
  const more = specialties.slice(5, 8);

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h2 className="text-3xl font-bold text-text-primary md:text-4xl dark:text-white/92">
              {t("title")}
            </h2>
            <p className="mt-4 text-lg leading-8 text-text-secondary">
              {t("subtitle")}
            </p>
          </div>

          <Link
            href="/specialties"
            className="app-panel inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary-light"
          >
            {t("viewAll")}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
          <Link
            href={`/specialties/${featured.slug}`}
            className="app-panel app-lift group relative overflow-hidden rounded-[34px] p-7 hover:-translate-y-1"
          >
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary-light text-primary shadow-[0_16px_28px_-22px_rgba(95,143,139,0.3)]">
              <Brain size={28} />
            </div>

            <div className="relative max-w-xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary/75">
                {t("eyebrow")}
              </p>
              <h3 className="text-3xl font-bold text-text-primary dark:text-white/92">
                {featured.name}
              </h3>
              <p className="mt-4 text-base leading-8 text-text-secondary">
                {t("subtitle")}
              </p>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              {t("viewAll")}
              <ArrowRight size={15} className="rtl:rotate-180" />
            </div>
          </Link>

          <div className="grid gap-5 sm:grid-cols-2">
            {secondary.map((specialty) => (
              <Link
                key={specialty.id}
                href={`/specialties/${specialty.slug}`}
                className="app-panel app-lift group rounded-[28px] p-6 hover:-translate-y-1"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary ring-1 ring-inset ring-primary/8">
                  <Brain size={22} />
                </div>
                <h3 className="text-xl font-bold text-text-primary dark:text-white/90">
                  {specialty.name}
                </h3>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {t("viewAll")}
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {more.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {more.map((specialty) => (
              <Link
                key={specialty.id}
                href={`/specialties/${specialty.slug}`}
                className="app-chip inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition hover:bg-primary hover:text-white"
              >
                <Brain size={14} />
                {specialty.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
