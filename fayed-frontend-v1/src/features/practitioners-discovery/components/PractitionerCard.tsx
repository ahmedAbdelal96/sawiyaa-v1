import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, BadgeCheck, Clock3, Globe, MessageSquare, Star } from "lucide-react";
import type { PublicPractitioner } from "../types/practitioner";

type Props = {
  practitioner: PublicPractitioner;
  specialtyLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  basePath?: string;
};

function avatarText(value: string | null | undefined) {
  const clean = value?.trim() ?? "";
  if (!clean) return "DR";
  return clean.slice(0, 2).toUpperCase();
}

export default async function PractitionerCard({
  practitioner,
  specialtyLabels,
  languageLabels,
  basePath = "/practitioners",
}: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("practitioners-listing.card"),
    getLocale(),
  ]);

  const isArabic = locale === "ar";
  const name = (isArabic ? practitioner.nameAr : practitioner.nameEn) || practitioner.slug;
  const title = (isArabic ? practitioner.titleAr : practitioner.titleEn) || "-";
  const rating = typeof practitioner.rating === "number" ? practitioner.rating : 0;
  const reviewCount =
    typeof practitioner.reviewCount === "number" ? practitioner.reviewCount : 0;
  const sessionCount =
    typeof practitioner.sessionCount === "number" ? practitioner.sessionCount : reviewCount;
  const yearsExperience =
    typeof practitioner.yearsExperience === "number" ? practitioner.yearsExperience : 0;

  const visibleSpecialties = practitioner.specialties.slice(0, 2);
  const visibleLanguages = practitioner.languages
    .slice(0, 2)
    .map((code) => languageLabels[code] ?? code)
    .join(" | ");

  const profileHref = `${basePath}/${practitioner.slug}`;

  return (
    <article className="rounded-[26px] border border-border-light bg-white p-4 shadow-theme-xs dark:bg-surface-secondary">
      <div className={`flex items-start justify-between gap-3 ${isArabic ? "flex-row" : "flex-row-reverse"}`}>
        <div className={`min-w-0 ${isArabic ? "text-right" : "text-left"}`}>
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">{name}</p>
          <p className="mt-1 text-sm text-text-brand">{title}</p>
          <div
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              practitioner.isOnlineNow
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-surface-secondary text-text-muted"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                practitioner.isOnlineNow ? "bg-emerald-500" : "bg-red-500"
              }`}
              aria-hidden="true"
            />
            <span>{practitioner.isOnlineNow ? t("onlineNow") : t("offline")}</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-sm text-secondary">
            <Star size={14} className="fill-secondary text-secondary" />
            <Star size={14} className="fill-secondary text-secondary" />
            <Star size={14} className="fill-secondary text-secondary" />
            <Star size={14} className="fill-secondary text-secondary" />
            <Star size={14} className="fill-secondary text-secondary" />
          </div>
          <p className="mt-1 text-xs text-text-muted">
            ({reviewCount}) {rating.toFixed(1)}
          </p>
        </div>

        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border-light bg-primary-light/70">
          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-text-brand">
            {avatarText(practitioner.initials)}
          </div>
          {practitioner.isVerified ? (
            <span className={`absolute bottom-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white bg-primary px-1 text-white ${isArabic ? "start-0" : "end-0"}`}>
              <BadgeCheck size={10} />
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          {visibleSpecialties.map((specialtySlug) => (
            <span
              key={specialtySlug}
              className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-text-brand"
            >
              {specialtyLabels[specialtySlug] ?? specialtySlug}
            </span>
          ))}
          {practitioner.specialties.length > visibleSpecialties.length ? (
            <span className="rounded-full bg-surface-secondary px-3 py-1 text-xs font-medium text-text-muted">
              +{practitioner.specialties.length - visibleSpecialties.length}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} />
            {t("sessions")}
          </span>
          <span className="font-semibold text-text-primary">{sessionCount}+</span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Globe size={14} />
            {t("languages")}
          </span>
          <span className="font-medium text-text-primary">{visibleLanguages || "-"}</span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare size={14} />
            {t("yearsExp")}
          </span>
          <span className="font-semibold text-text-primary">{yearsExperience}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Link
          href={profileHref}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          {t("viewProfile")}
          <ArrowRight size={14} className="rtl:rotate-180" />
        </Link>
        <Link
          href={profileHref}
          className="inline-flex items-center justify-center rounded-xl border border-border-light bg-white px-3 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-primary hover:text-primary dark:bg-surface"
        >
          {t("sessions")}
        </Link>
      </div>
    </article>
  );
}
