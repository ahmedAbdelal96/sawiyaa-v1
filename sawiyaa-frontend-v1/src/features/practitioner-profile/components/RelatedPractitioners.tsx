import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Star, BadgeCheck, ArrowRight } from "lucide-react";
import type { PublicPractitioner } from "@/features/practitioners-discovery/types/practitioner";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";
import { hasPublicPractitionerRating } from "@/features/practitioners-discovery/lib/practitioner-rating";

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
    <div className="mt-8 border-t border-border-light/60 pt-8 dark:border-white/10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1C2F2B] dark:text-white/90">
          {t("sections.related")}
        </h2>
        <Link
          href="/practitioners"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#24564F] transition hover:underline"
        >
          <span>{locale === "ar" ? "عرض كل المختصين" : "View all specialists"}</span>
          <ArrowRight size={13} className={isAr ? "rotate-180" : ""} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {practitioners.map((p) => {
          const displayName = isAr ? p.nameAr : p.nameEn;
          const displayTitle = p.professionalTitle?.trim() || "-";
          const rating = p.rating;
          const reviewCount = p.reviewCount || 0;
          const hasRating = hasPublicPractitionerRating(rating, reviewCount);

          return (
            <Link
              key={p.id}
              href={`/practitioners/${p.slug}`}
              className="app-lift flex items-center gap-3.5 rounded-[20px] border border-border-light/70 bg-white p-4 shadow-2xs transition hover:-translate-y-0.5 hover:border-[#24564F]/30 dark:bg-surface-secondary dark:border-white/10"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#24564F]/20 p-0.5 bg-[#FCFAF6] dark:bg-white/5">
                <PractitionerAvatar
                  src={p.avatarUrl}
                  alt={displayName}
                  initials={p.initials}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="truncate text-sm font-bold text-[#1C2F2B] dark:text-white/90">
                    {displayName}
                  </h3>
                  {p.isVerified && (
                    <BadgeCheck size={13} className="shrink-0 text-[#24564F]" />
                  )}
                </div>
                <p className="truncate text-xs font-medium text-text-secondary">
                  {displayTitle}
                </p>

                <div className="mt-1 flex items-center gap-2 text-xs">
                  {p.specialties[0] && (
                    <span className="rounded-full bg-[#EEF4EF] px-2 py-0.5 text-[10px] font-semibold text-[#24564F] dark:bg-white/5 dark:text-[#A7BFAE]">
                      {specialtyLabels[p.specialties[0]] ?? p.specialties[0]}
                    </span>
                  )}
                  {hasRating ? (
                    <div className="flex items-center gap-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span>{rating.toFixed(1)}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <ArrowRight
                size={14}
                className="shrink-0 text-text-muted transition group-hover:text-[#24564F] rtl:rotate-180"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
