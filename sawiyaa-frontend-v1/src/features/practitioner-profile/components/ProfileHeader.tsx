import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Globe,
  MapPin,
  MessageSquare,
  Star,
} from "lucide-react";
import { getPublicSessionPrices } from "@/features/practitioners-discovery/lib/public-pricing";
import { mapPractitionerDurationMoney } from "@/features/practitioners-discovery/lib/practitioner-price";
import { MoneyText } from "@/components/money/MoneyText";
import type { PractitionerProfile } from "../types/profile";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";
import { hasPublicPractitionerRating } from "@/features/practitioners-discovery/lib/practitioner-rating";

type Props = {
  profile: PractitionerProfile;
  countryLabel: string;
  specialtyLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  backHref?: string;
  showBackLink?: boolean;
  showBookingCta?: boolean;
  messageHref?: string | null;
};

export default async function ProfileHeader({
  profile: p,
  countryLabel,
  specialtyLabels,
  languageLabels,
  backHref = "/practitioners",
  showBackLink = true,
  messageHref = null,
}: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile"),
    getLocale(),
  ]);
  const isAr = locale === "ar";
  const displayName = isAr ? p.nameAr : p.nameEn;
  const displayTitle = p.professionalTitle?.trim() || "-";
  const primarySpecialties = p.specialties.slice(0, 3);
  const displayedLanguages = p.languages
    .slice(0, 2)
    .map((language) => languageLabels[language] ?? language)
    .join(" / ");
  const sessionPrices = getPublicSessionPrices(p);

  const displayReviewCount = typeof p.reviewCount === "number" ? p.reviewCount : 0;
  const hasRating = hasPublicPractitionerRating(p.rating, displayReviewCount);

  const resolvedMessageHref = messageHref ?? `/patient/care-chat?practitionerSlug=${p.slug}`;

  return (
    <div className="space-y-3">
      {/* Top Bar: Back Link */}
      {showBackLink ? (
        <div className="flex items-center justify-between">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary transition-colors hover:text-primary dark:text-white/70 dark:hover:text-white group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 rtl:rotate-180" />
            <span>{t("page.backToListing")}</span>
          </Link>
        </div>
      ) : null}

      {/* Main Practitioner Header Card - Compact & Premium */}
      <div className="app-panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Compact Avatar */}
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 p-0.5 bg-surface-secondary dark:bg-white/5">
              <PractitionerAvatar
                src={p.avatarUrl}
                alt={displayName}
                initials={p.initials}
                className="h-full w-full rounded-full object-cover"
              />
              {p.isVerified ? (
                <span className={`absolute bottom-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-primary px-0.5 text-white ${isAr ? "start-0" : "end-0"}`}>
                  <BadgeCheck size={9} />
                </span>
              ) : null}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary dark:text-white/95 truncate">
                  {displayName}
                </h1>
                {p.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-text-brand dark:bg-primary/15">
                    <BadgeCheck size={11} className="text-primary" />
                    {t("header.verified")}
                  </span>
                ) : null}
              </div>

              <p className="text-xs font-medium text-text-brand">{displayTitle}</p>

              {/* Rating & Location inline */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <Star
                    size={13}
                    className={hasRating ? "fill-amber-400 text-amber-400" : "text-text-muted"}
                  />
                  {hasRating ? (
                    <>
                      <span className="font-bold text-text-primary dark:text-white/95">
                        {p.rating!.toFixed(1)}
                      </span>
                      <span>({displayReviewCount} {t("stats.reviews")})</span>
                    </>
                  ) : (
                    <span>{t("trust.summary.noRating")}</span>
                  )}
                </div>

                <span className="text-border-light">•</span>

                <div className="flex items-center gap-1">
                  <MapPin size={12} className="text-primary" />
                  <span>{countryLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs & Quick Specialties */}
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Link
              href={resolvedMessageHref as never}
              className="sawiyaa-btn-press inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-white shadow-xs cursor-pointer dark:bg-primary/20 dark:text-primary-light"
            >
              <MessageSquare size={14} />
              <span>{t("cta.messagePractitioner")}</span>
            </Link>

            <div className="hidden sm:flex flex-wrap gap-1">
              {primarySpecialties.map((specialty) => (
                <span
                  key={specialty}
                  className="rounded-full bg-primary-light/70 dark:bg-primary/10 border border-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-text-brand"
                >
                  {specialtyLabels[specialty] ?? specialty}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Compact Horizontal Stats & Session Pricing Bar */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-xl bg-surface-secondary/70 p-2.5 text-xs dark:bg-white/5 border border-border-light/40">
          <div className="flex items-center gap-2 px-2">
            <BriefcaseBusiness size={14} className="text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-text-muted font-medium">{t("stats.experience")}</p>
              <p className="font-bold text-text-primary dark:text-white/95">
                {p.yearsExperience} {t("stats.experience")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 border-s border-border-light/50 px-2 dark:border-white/10">
            <Globe size={14} className="text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-text-muted font-medium">{t("sections.languages")}</p>
              <p className="font-bold text-text-primary dark:text-white/95 truncate" title={displayedLanguages}>
                {displayedLanguages || "-"}
              </p>
            </div>
          </div>

          {sessionPrices.length > 0 ? (
            sessionPrices.slice(0, 2).map((price, idx) => (
              <div
                key={price.duration}
                className={`flex items-center justify-between px-2 ${
                  idx > 0 || true ? "border-s border-border-light/50 dark:border-white/10" : ""
                }`}
              >
                <div>
                  <p className="text-[10px] text-text-muted font-medium">
                    {price.duration === 30 ? t("booking.duration30") : t("booking.duration60")}
                  </p>
                  <p className="font-bold text-text-primary dark:text-white/95">
                    {(() => {
                      const money = mapPractitionerDurationMoney({
                        amount: price.amount,
                        currencyCode: p.currencyCode,
                      });
                      return money ? <MoneyText money={money} /> : "-";
                    })()}
                  </p>
                </div>
              </div>
            ))
          ) : null}
        </div>
      </div>
    </div>
  );
}
