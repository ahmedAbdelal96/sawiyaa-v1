import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Star, BadgeCheck, ArrowRight } from "lucide-react";
import type { PublicPractitioner } from "@/features/practitioners-discovery/types/practitioner";

type Props = {
  practitioners: PublicPractitioner[];
  specialtyLabels: Record<string, string>;
};

export default async function RelatedPractitioners({
  practitioners,
  specialtyLabels,
}: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile"),
    getLocale(),
  ]);
  const isAr = locale === "ar";

  if (practitioners.length === 0) return null;

  return (
    <div className="border-t border-border-light bg-background px-6 py-12 dark:border-border-light dark:bg-background">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-white/90">
              {t("sections.related")}
            </h2>
          </div>
          <Link
            href="/practitioners"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            {t("related.viewAll")}
            <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {practitioners.map((p) => {
            const displayName = isAr ? p.nameAr : p.nameEn;
            const displayTitle = isAr ? p.titleAr : p.titleEn;

            return (
              <Link
                key={p.id}
                href={`/practitioners/${p.slug}`}
                className="app-panel app-lift group flex items-center gap-4 rounded-[26px] p-4 hover:-translate-y-0.5"
              >
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border-light bg-surface-secondary text-lg font-bold text-primary dark:bg-primary/15 dark:text-primary-light"
                >
                  {p.initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-primary dark:text-white/90">
                      {displayName}
                    </span>
                    {p.isVerified && (
                      <BadgeCheck size={13} className="shrink-0 text-primary" />
                    )}
                  </div>
                  <p className="truncate text-xs text-text-secondary">
                    {displayTitle}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="app-chip rounded-full px-2.5 py-1 text-[11px] font-medium">
                      {specialtyLabels[p.specialties[0]] ?? p.specialties[0]}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Star size={11} className="fill-secondary text-secondary" />
                      <span className="text-xs font-bold text-text-primary dark:text-white/80">
                        {p.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <ArrowRight
                  size={14}
                  className="shrink-0 text-text-muted rtl:rotate-180 transition-colors group-hover:text-primary"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
