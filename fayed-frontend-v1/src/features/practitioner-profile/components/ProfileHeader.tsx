import { getTranslations, getLocale } from "next-intl/server";
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
import type { PractitionerProfile } from "../types/profile";

type Props = {
  profile: PractitionerProfile;
  countryLabel: string;
  specialtyLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  backHref?: string;
  showBackLink?: boolean;
  showBookingCta?: boolean;
};

export default async function ProfileHeader({
  profile: p,
  countryLabel,
  specialtyLabels,
  languageLabels,
  backHref = "/practitioners",
  showBackLink = true,
  showBookingCta = false,
}: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioner-profile"),
    getLocale(),
  ]);
  const isAr = locale === "ar";
  const displayName = isAr ? p.nameAr : p.nameEn;
  const displayTitle = isAr ? p.titleAr : p.titleEn;
  const primarySpecialties = p.specialties.slice(0, 3);
  const displayedLanguages = p.languages
    .slice(0, 2)
    .map((language) => languageLabels[language] ?? language)
    .join(" · ");

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
    <div className="app-page-hero px-6 py-8">
      <div className="mx-auto max-w-7xl">
        {showBackLink ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-primary dark:text-white/70 dark:hover:text-white"
          >
            <ArrowLeft size={15} className="rtl:rotate-180" />
            <span>{t("page.backToListing")}</span>
          </Link>
        ) : null}

        <div className="app-panel mt-5 rounded-[34px] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="space-y-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] bg-primary-light text-2xl font-bold text-primary shadow-[0_20px_32px_-24px_rgba(95,143,139,0.32)] dark:bg-primary/15 dark:text-primary-light"
                >
                  {p.initials}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-text-brand ring-1 ring-inset ring-primary/8 dark:bg-primary/15">
                        <BadgeCheck size={13} className="text-primary" />
                        {t("header.verified")}
                      </span>
                    )}
                    <span className="app-chip inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold">
                      <ShieldCheck size={13} className="text-primary" />
                      {t("badges.secure")}
                    </span>
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-[-0.03em] text-text-primary dark:text-white/95 md:text-4xl">
                      {displayName}
                    </h1>
                    <p className="mt-2 text-base font-medium text-text-secondary md:text-lg">
                      {displayTitle}
                    </p>
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-text-secondary">
                    {t("header.summary")}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {primarySpecialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="app-chip rounded-full px-3 py-1.5 text-sm font-medium"
                      >
                        {specialtyLabels[specialty] ?? specialty}
                      </span>
                    ))}
                  </div>

                  {showBookingCta ? (
                    <a
                      href="#booking-panel"
                      className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                    >
                      {t("booking.jumpToAvailability")}
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="app-panel-soft rounded-2xl p-4">
                  <div className="mb-2 flex items-center gap-2 text-text-muted">
                    <MapPin size={15} />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                      {t("header.location")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                    {countryLabel}
                  </p>
                </div>

                <div className="app-panel-soft rounded-2xl p-4">
                  <div className="mb-2 flex items-center gap-2 text-text-muted">
                    <Star size={15} className="fill-secondary text-secondary" />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                      {t("header.specialtyFocus")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                    {primarySpecialties.length > 0
                      ? specialtyLabels[primarySpecialties[0]] ?? primarySpecialties[0]
                      : "-"}
                  </p>
                </div>

                <div className="app-panel-soft rounded-2xl p-4">
                  <div className="mb-2 flex items-center gap-2 text-text-muted">
                    <Globe size={15} />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                      {t("sections.languages")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                    {displayedLanguages || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="app-panel rounded-[30px] p-5">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="app-panel-soft rounded-2xl p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                          {stat.label}
                        </span>
                        <Icon size={16} className="text-primary" />
                      </div>
                      <p className="text-xl font-bold text-text-primary dark:text-white/90">
                        {stat.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
