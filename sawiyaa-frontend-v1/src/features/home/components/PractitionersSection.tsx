import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Star, BadgeCheck, ArrowRight, Clock, Globe } from "lucide-react";
import { fetchPublicPractitioners } from "@/features/practitioners-discovery/api/practitioners-ssr.api";
import { fetchPublicSpecialties } from "@/features/specialties-public/api/specialties-ssr.api";
import { getLocalizedSpecialtyName } from "@/features/specialties/utils/localized-specialty";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";
import { hasPublicPractitionerRating } from "@/features/practitioners-discovery/lib/practitioner-rating";
import { getPublicSessionPrices } from "@/features/practitioners-discovery/lib/public-pricing";
import { mapPractitionerDurationMoney } from "@/features/practitioners-discovery/lib/practitioner-price";
import { MoneyText } from "@/components/money/MoneyText";

export default async function PractitionersSection() {
  const [t, locale] = await Promise.all([
    getTranslations("home.practitioners"),
    getLocale(),
  ]);
  const isAr = locale === "ar";

  let practitioners: Awaited<ReturnType<typeof fetchPublicPractitioners>>["items"] = [];
  let specialtyLabels: Record<string, string> = {};

  try {
    const [practitionersData, specialtiesData] = await Promise.all([
      fetchPublicPractitioners(locale, { limit: 3, sort: "rating" }),
      fetchPublicSpecialties(locale),
    ]);
    practitioners = practitionersData.items;
    specialtyLabels = Object.fromEntries(
      specialtiesData.specialties
        .filter((s) => s.isActive)
        .map((s) => [s.slug, getLocalizedSpecialtyName(s, locale)]),
    );
  } catch {
    // Graceful fallback
  }

  if (practitioners.length === 0) return null;

  return (
    <section className="px-6 py-12 lg:px-12 lg:py-16 bg-[#FCFAF6] dark:bg-[#101919] border-y border-border-light/50 dark:border-white/5">
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
            href="/practitioners"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#24564F] transition hover:text-[#1F4A44] hover:underline"
          >
            <span>{t("viewAll")}</span>
            <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {practitioners.map((practitioner) => {
            const name = (isAr ? practitioner.nameAr : practitioner.nameEn) || practitioner.slug;
            const title = practitioner.professionalTitle?.trim() || "-";
            const rating = practitioner.rating;
            const reviewCount = practitioner.reviewCount || 0;
            const hasRating = hasPublicPractitionerRating(rating, reviewCount);
            const sessionPrices = getPublicSessionPrices(practitioner);
            const startingPrice = sessionPrices[0];
            const visibleSpecialties = practitioner.specialties.slice(0, 2);

            return (
              <article
                key={practitioner.id}
                className="app-lift flex flex-col justify-between rounded-[24px] border border-border-light/70 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-[#24564F]/30 hover:shadow-sm dark:bg-surface-secondary dark:border-white/10"
              >
                <div>
                  {/* Top: Avatar + Identity */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#24564F]/20 p-0.5 bg-[#FCFAF6] dark:bg-white/5">
                      <PractitionerAvatar
                        src={practitioner.avatarUrl}
                        alt={name}
                        initials={practitioner.initials}
                        className="h-full w-full rounded-full object-cover"
                      />
                      {practitioner.isVerified ? (
                        <span className={`absolute bottom-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-[#24564F] px-0.5 text-white ${isAr ? "start-0" : "end-0"}`}>
                          <BadgeCheck size={10} />
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-[#1C2F2B] leading-snug dark:text-white/95 break-words">
                        {name}
                      </h3>
                      <p className="text-xs font-semibold text-[#24564F] mt-0.5 dark:text-[#A7BFAE]">
                        {title}
                      </p>

                      <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                        {hasRating ? (
                          <div className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            <span>{rating.toFixed(1)}</span>
                            {reviewCount > 0 ? (
                              <span className="font-normal text-[10px] text-amber-700/80">({reviewCount})</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Specialties Pills */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {visibleSpecialties.map((specialtySlug) => (
                      <span
                        key={specialtySlug}
                        className="rounded-full bg-[#EEF4EF] border border-[#24564F]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#24564F] dark:bg-white/5 dark:text-[#A7BFAE]"
                      >
                        {specialtyLabels[specialtySlug] ?? specialtySlug}
                      </span>
                    ))}
                  </div>

                  {/* Pricing row */}
                  {sessionPrices.length > 0 ? (
                    <div className="mt-4 rounded-xl bg-[#FCFAF6] border border-border-light/60 p-2.5 dark:bg-white/5 space-y-1.5">
                      {sessionPrices.map((price) => (
                        <div
                          key={price.duration}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-text-secondary">
                            {price.duration === 30
                              ? (isAr ? "٣٠ دقيقة" : "30 min")
                              : (isAr ? "٦٠ دقيقة" : "60 min")}
                          </span>
                          <span className="font-bold text-[#24564F] dark:text-white/95">
                            {(() => {
                              const money = mapPractitionerDurationMoney({
                                amount: price.amount,
                                currencyCode: practitioner.currencyCode,
                              });
                              return money ? <MoneyText money={money} /> : "-";
                            })()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Bottom CTA */}
                <div className="mt-4">
                  <Link
                    href={`/practitioners/${practitioner.slug}`}
                    className="sawiyaa-btn-press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#24564F] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#1F4A44]"
                  >
                    <span>{t("viewProfile")}</span>
                    <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
