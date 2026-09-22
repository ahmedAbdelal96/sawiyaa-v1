"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, BadgeCheck, Star, Zap } from "lucide-react";
import {
  getPublicSessionPrices,
  isPublicSessionPriceInActiveFeeRange,
} from "../lib/public-pricing";
import { MoneyText } from "@/components/money/MoneyText";
import { mapPractitionerDurationMoney } from "../lib/practitioner-price";
import type { ActiveFeeFilterContext, PublicPractitioner } from "../types/practitioner";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";
import { getLocalizedLanguageLabel } from "@/constants/reference-data";
import { hasPublicPractitionerRating } from "../lib/practitioner-rating";

type Props = {
  practitioner: PublicPractitioner;
  specialtyLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  activeFeeFilter?: ActiveFeeFilterContext;
  basePath?: string;
};

function avatarText(value: string | null | undefined) {
  const clean = value?.trim() ?? "";
  if (!clean) return "DR";
  return clean.slice(0, 2).toUpperCase();
}

export default function PractitionerCard({
  practitioner,
  specialtyLabels,
  languageLabels,
  activeFeeFilter = {},
  basePath = "/practitioners",
}: Props) {
  const t = useTranslations("practitioners-listing.card");
  const locale = useLocale();
  const isArabic = locale === "ar";

  const name = (isArabic ? practitioner.nameAr : practitioner.nameEn) || practitioner.slug;
  const title = practitioner.professionalTitle?.trim() || "-";
  const rating = practitioner.rating;
  const reviewCount =
    typeof practitioner.reviewCount === "number" ? practitioner.reviewCount : 0;
  const hasRating = hasPublicPractitionerRating(rating, reviewCount);

  const visibleSpecialties = practitioner.specialties.slice(0, 3);
  const sessionPrices = getPublicSessionPrices(practitioner);

  const languagesList = practitioner.languages
    .slice(0, 2)
    .map((code) => languageLabels[code] ?? getLocalizedLanguageLabel(code, locale))
    .join(isArabic ? "، " : ", ");

  const profileHref = `${basePath}/${practitioner.slug}`;

  return (
    <article className="app-lift flex flex-col justify-between rounded-[24px] border border-border-light/70 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-[#24564F]/30 hover:shadow-sm dark:bg-surface-secondary dark:border-white/10">
      <div>
        {/* Top Header: Avatar + Full Name + Title */}
        <div className="flex items-start gap-3.5">
          {/* Avatar with verified & online badges */}
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#24564F]/20 p-0.5 bg-[#FCFAF6] dark:bg-white/5">
            <PractitionerAvatar
              src={practitioner.avatarUrl}
              alt={name}
              initials={avatarText(practitioner.initials)}
              className="h-full w-full rounded-full object-cover"
            />
            {practitioner.isVerified ? (
              <span
                role="img"
                aria-label={t("verifiedExplanation")}
                className={`absolute bottom-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-[#24564F] px-0.5 text-white ${
                  isArabic ? "start-0" : "end-0"
                }`}
                title={`${t("verified")}: ${t("verifiedExplanation")}`}
              >
                <BadgeCheck size={10} aria-hidden="true" />
              </span>
            ) : null}
            {practitioner.isOnlineNow ? (
              <span
                className={`absolute top-0 inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-500 ${
                  isArabic ? "end-0" : "start-0"
                }`}
                title={t("onlineNow")}
              />
            ) : null}
          </div>

          {/* Identity details with full name display */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-[#1C2F2B] leading-snug dark:text-white/95 break-words">
              {name}
            </h3>

            <p className="text-xs font-semibold text-[#24564F] mt-0.5 dark:text-[#A7BFAE]">
              {title}
            </p>

            {/* Rating badge & Experience & Languages line below name */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              {hasRating ? (
                <div className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span>{rating.toFixed(1)}</span>
                  {reviewCount > 0 ? (
                    <span className="font-normal text-[10px] text-amber-700/80">({reviewCount})</span>
                  ) : null}
                </div>
              ) : null}

              {hasRating && practitioner.yearsExperience ? <span>•</span> : null}

              {practitioner.yearsExperience ? (
                <span>{practitioner.yearsExperience} {t("yearsExp")}</span>
              ) : null}

              {languagesList ? (
                <>
                  <span>•</span>
                  <span title={languagesList}>{languagesList}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Instant Booking Banner if available */}
        {(practitioner.availableNow || practitioner.isInstantBookingAvailable) ? (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            <Zap size={12} className="text-amber-600" />
            <span>{t("instantAvailable")}</span>
          </div>
        ) : null}

        {/* Specialties Tags */}
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {visibleSpecialties.map((specialtySlug) => (
            <span
              key={specialtySlug}
              className="rounded-full bg-[#EEF4EF] border border-[#24564F]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#24564F] dark:bg-white/5 dark:text-[#A7BFAE]"
            >
              {specialtyLabels[specialtySlug] ?? specialtySlug}
            </span>
          ))}
          {practitioner.specialties.length > visibleSpecialties.length ? (
            <span className="rounded-full bg-[#FCFAF6] border border-border-light/50 px-2 py-0.5 text-[10px] font-semibold text-text-muted">
              +{practitioner.specialties.length - visibleSpecialties.length}
            </span>
          ) : null}
        </div>

        {/* Session Fees by Duration */}
        {sessionPrices.length > 0 ? (
          <div className="mt-4 rounded-xl bg-[#FCFAF6] border border-border-light/60 p-2.5 dark:bg-white/5 space-y-1.5">
            {sessionPrices.map((price) => (
              <div
                key={price.duration}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-1.5 font-medium text-text-secondary">
                  <span>{price.duration === 30 ? t("duration30") : t("duration60")}</span>
                  {isPublicSessionPriceInActiveFeeRange(price, activeFeeFilter) ? (
                    <span className="rounded-full border border-[#24564F]/15 bg-white px-1.5 py-0.2 text-[10px] font-semibold text-[#24564F] dark:bg-primary/10">
                      {t("matchesFilter")}
                    </span>
                  ) : null}
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
          href={profileHref}
          className="sawiyaa-btn-press inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#24564F] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#1F4A44]"
        >
          <span>{t("viewProfile")}</span>
          <ArrowRight size={13} className={isArabic ? "rotate-180" : ""} />
        </Link>
      </div>
    </article>
  );
}
