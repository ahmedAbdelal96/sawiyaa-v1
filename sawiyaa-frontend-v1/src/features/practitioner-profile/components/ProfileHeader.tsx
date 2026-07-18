import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Globe,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  formatPublicMoney,
  getPublicSessionPrices,
} from "@/features/practitioners-discovery/lib/public-pricing";
import type { PractitionerProfile } from "../types/profile";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";

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
  showBookingCta = false,
  messageHref = null,
}: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile"),
    getLocale(),
  ]);
  const isAr = locale === "ar";
  const sessionFeesLabel = isAr ? "رسوم الجلسة" : t("pricing.sessionFees");
  const displayName = isAr ? p.nameAr : p.nameEn;
  const displayTitle = isAr ? p.titleAr : p.titleEn;
  const primarySpecialties = p.specialties.slice(0, 4);
  const displayedLanguages = p.languages
    .slice(0, 2)
    .map((language) => languageLabels[language] ?? language)
    .join(" / ");
  const sessionPrices = getPublicSessionPrices(p);

  const stats = [
    {
      icon: MessageSquare,
      value: p.reviewCount.toString(),
      label: t("stats.reviews"),
    },
    {
      icon: BriefcaseBusiness,
      value: p.yearsExperience.toString(),
      label: t("stats.experience"),
    },
    {
      icon: Globe,
      value: displayedLanguages || "-",
      label: t("sections.languages"),
    },
  ];

  return (
    <div className="px-4 py-4 sm:py-6">
      <div className="mx-auto max-w-7xl">
        {showBackLink ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary transition-colors hover:text-primary dark:text-white/70 dark:hover:text-white group"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 rtl:rotate-180" />
            <span>{t("page.backToListing")}</span>
          </Link>
        ) : null}

        <div className="app-panel mt-3 sm:mt-4 rounded-[28px] p-5 md:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between border-b border-border-light/50 pb-6 dark:border-white/10">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {/* Dual ring avatar wrapper */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border-2 border-primary/20 p-0.5 bg-surface-secondary dark:bg-white/5">
                <PractitionerAvatar
                  src={p.avatarUrl}
                  alt={displayName}
                  initials={p.initials}
                  className="h-full w-full rounded-[20px] object-cover"
                />
              </div>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {p.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-3 py-0.5 text-xs font-semibold text-text-brand ring-1 ring-inset ring-primary/8 dark:bg-primary/15">
                      <BadgeCheck size={13} className="text-primary" />
                      {t("header.verified")}
                    </span>
                  ) : null}
                  <span className="app-chip inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold">
                    <MapPin size={13} className="text-primary" />
                    {countryLabel}
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
                    {displayName}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-text-secondary">
                    {displayTitle}
                  </p>
                </div>

                {/* Specialties tags */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {primarySpecialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full bg-primary-light/70 dark:bg-primary/10 border border-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-text-brand"
                    >
                      {specialtyLabels[specialty] ?? specialty}
                    </span>
                  ))}
                </div>

                {sessionPrices.length > 0 ? (
                  <div className="rounded-2xl border border-primary/10 bg-primary-light/35 px-3 py-3 dark:bg-primary/10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {sessionFeesLabel}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {sessionPrices.map((price) => (
                        <div
                          key={price.duration}
                          className="rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-white/5"
                        >
                          <span className="font-medium text-text-secondary">
                            {price.duration === 30
                              ? t("booking.duration30")
                              : t("booking.duration60")}
                          </span>
                          <span className="mx-2 text-text-muted">-</span>
                          <span className="font-bold text-text-primary dark:text-white/95">
                            {formatPublicMoney(locale, price.amount, p.currencyCode)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Action buttons on the side */}
            {(showBookingCta || messageHref) && (
              <div className="flex flex-wrap gap-2.5 shrink-0 self-start md:pt-1">
                {showBookingCta ? (
                  <a
                    href="#booking-panel"
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-hover shadow-sm hover:shadow"
                  >
                    {t("booking.jumpToAvailability")}
                  </a>
                ) : null}
                {messageHref ? (
                  <Link
                    href={messageHref as never}
                    className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-5 py-3 text-sm font-bold text-text-primary transition hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/90"
                  >
                    {t("cta.messagePractitioner")}
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          {/* Consolidated 4-column horizontal stats bar (non-card styled) */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 pt-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <MessageSquare size={14} className="text-primary/70" />
                <span>{t("stats.reviews")}</span>
              </div>
              <p className="text-2xl font-extrabold text-text-primary dark:text-white/95">
                {p.reviewCount}
              </p>
            </div>

            <div className="space-y-1 border-s border-border-light/65 ps-4 md:ps-6 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <BriefcaseBusiness size={14} className="text-primary/70" />
                <span>{t("stats.experience")}</span>
              </div>
              <p className="text-2xl font-extrabold text-text-primary dark:text-white/95">
                {p.yearsExperience} {isAr ? "سنة" : "years"}
              </p>
            </div>

            <div className="space-y-1 border-s border-border-light/65 ps-4 md:ps-6 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <Globe size={14} className="text-primary/70" />
                <span>{t("sections.languages")}</span>
              </div>
              <p className="text-base font-bold text-text-primary dark:text-white/95 leading-normal">
                {displayedLanguages || "-"}
              </p>
            </div>

            <div className="space-y-1 border-s border-border-light/65 ps-4 md:ps-6 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <Star size={14} className="text-primary/70 fill-primary/10" />
                <span>{t("header.specialtyFocus")}</span>
              </div>
              <p className="text-base font-bold text-text-primary dark:text-white/95 leading-normal">
                {primarySpecialties.length > 0
                  ? specialtyLabels[primarySpecialties[0]] ?? primarySpecialties[0]
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
