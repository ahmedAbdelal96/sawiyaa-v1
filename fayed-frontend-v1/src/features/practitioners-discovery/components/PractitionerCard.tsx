"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, BadgeCheck, Briefcase, Star } from "lucide-react";
import type { PublicPractitioner } from "../types/practitioner";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";

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

export default function PractitionerCard({
  practitioner,
  specialtyLabels,
  languageLabels,
  basePath = "/practitioners",
}: Props) {
  const t = useTranslations("practitioners-listing.card");
  const locale = useLocale();

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
  const filledStars = Math.max(0, Math.min(5, Math.round(rating)));

  const visibleSpecialties = practitioner.specialties.slice(0, 2);

  // Short language tags for horizontal stats layout
  const languagesList = practitioner.languages.map((code) => code.toUpperCase()).join(", ");

  const profileHref = `${basePath}/${practitioner.slug}`;

  return (
    <article className="rounded-[26px] border border-border-light bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_18px_30px_-24px_rgba(34,52,56,0.18)] dark:bg-surface-secondary">
      <div className={`flex items-start justify-between gap-3 ${isArabic ? "flex-row" : "flex-row-reverse"}`}>
        <div className={`min-w-0 flex-1 ${isArabic ? "text-right" : "text-left"}`}>
          <p className="text-[15px] sm:text-base font-bold text-text-primary dark:text-white/95 leading-snug">{name}</p>
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-text-brand">{title}</p>
          
          <div
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
              practitioner.isOnlineNow
                ? "bg-emerald-500/5 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-surface-secondary text-text-secondary border-border-light/60 dark:bg-white/5"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                practitioner.isOnlineNow ? "bg-emerald-500 animate-pulse" : "bg-text-muted/70"
              }`}
              aria-hidden="true"
            />
            <span>{practitioner.isOnlineNow ? t("onlineNow") : t("offline")}</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div
              className="inline-flex items-center gap-0.5"
              aria-label={`${t("rating")} ${rating.toFixed(1)}`}
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  size={12}
                  className={
                    index < filledStars
                      ? "fill-amber-400 text-amber-400"
                      : "fill-transparent text-border-light dark:text-white/25"
                  }
                />
              ))}
            </div>
            <p className="text-[11px] text-text-muted font-medium pt-0.5">
              {rating.toFixed(1)} · {reviewCount} {t("reviews")}
            </p>
          </div>
        </div>

        {/* Dual ring avatar wrap */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 p-0.5 bg-surface-secondary">
          <PractitionerAvatar
            src={practitioner.avatarUrl}
            alt={name}
            initials={avatarText(practitioner.initials)}
            className="h-full w-full rounded-full object-cover"
          />
          {practitioner.isVerified ? (
            <span className={`absolute bottom-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white bg-primary px-1 text-white ${isArabic ? "start-0" : "end-0"}`}>
              <BadgeCheck size={10} />
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3.5">
        {/* Specialties Tags */}
        <div className="flex flex-wrap gap-1.5">
          {visibleSpecialties.map((specialtySlug) => (
            <span
              key={specialtySlug}
              className="rounded-full bg-primary-light/75 dark:bg-primary/10 border border-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-text-brand"
            >
              {specialtyLabels[specialtySlug] ?? specialtySlug}
            </span>
          ))}
          {practitioner.specialties.length > visibleSpecialties.length ? (
            <span className="rounded-full bg-surface-secondary dark:bg-white/5 border border-border-light/40 px-2 py-0.5 text-[11px] font-semibold text-text-muted">
              +{practitioner.specialties.length - visibleSpecialties.length}
            </span>
          ) : null}
        </div>

        {/* Horizontal Stats Bar (replaces vertical stack) */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-secondary/60 dark:bg-white/5 border border-border-light/35 p-2 text-center text-xs">
          <div>
            <p className="text-[10px] text-text-muted font-medium mb-0.5">{t("sessions")}</p>
            <p className="font-bold text-text-primary dark:text-white/90">{sessionCount}+</p>
          </div>
          <div className="border-s border-border-light/50 dark:border-white/10">
            <p className="text-[10px] text-text-muted font-medium mb-0.5">{t("languages")}</p>
            <p className="font-bold text-text-primary dark:text-white/90 truncate px-0.5" title={languagesList}>
              {languagesList || "-"}
            </p>
          </div>
          <div className="border-s border-border-light/50 dark:border-white/10">
            <p className="text-[10px] text-text-muted font-medium mb-0.5">{t("yearsExp")}</p>
            <p className="font-bold text-text-primary dark:text-white/90">{yearsExperience}</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={profileHref}
          className="sawiyaa-btn-press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover hover:-translate-y-0.5 shadow-theme-xs hover:shadow"
        >
          {t("viewProfile")}
          <ArrowRight size={14} className="rtl:rotate-180" />
        </Link>
      </div>
    </article>
  );
}
