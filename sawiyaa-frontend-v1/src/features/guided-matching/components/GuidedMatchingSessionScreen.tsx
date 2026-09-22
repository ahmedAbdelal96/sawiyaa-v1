"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useMatchingSession } from "../hooks/use-guided-matching";
import { useSpecialties } from "@/features/specialties/hooks/use-specialties";
import { getLocalizedSpecialtyName } from "@/features/specialties/utils/localized-specialty";
import type {
  MatchingRecommendationItem,
  MatchingSession,
} from "../types/guided-matching.types";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Globe,
  HeartHandshake,
  LifeBuoy,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Stethoscope,
  Tag,
  Video,
  Mic,
  Clock,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import {
  getLocalizedLanguageLabel,
  getProfessionalTitleLabel,
} from "@/constants/reference-data";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";

type GuidedMatchingSessionScreenProps = {
  sessionId: string;
};

function avatarInitials(name: string | null | undefined): string {
  const clean = name?.trim() ?? "";
  if (!clean) return "DR";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function formatAmount(
  amount: string | null,
  currency: string,
  locale: string,
): string | null {
  if (!amount) return null;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function PreferenceTag({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border-light/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-text-primary shadow-2xs dark:border-border-dark dark:bg-surface-secondary dark:text-white/90">
      <span className="text-primary dark:text-primary-light">{icon}</span>
      <span className="text-text-muted">{label}:</span>
      <span className="font-semibold text-text-primary dark:text-white">{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="app-max-content mx-auto space-y-4">
      <ListStateSkeleton items={3} heightClass="h-48" />
    </div>
  );
}

function buildReasonKeys(
  session: MatchingSession,
  item: MatchingRecommendationItem,
): string[] {
  const keys: string[] = [];

  if (item.rationale.matchedSpecialty && session.answers.preferredSpecialtySlug) {
    keys.push("specialty");
  }
  if (item.rationale.matchedLanguage && session.answers.preferredLanguage) {
    keys.push("language");
  }
  if (item.rationale.matchedBudget) {
    keys.push("budget");
  }
  if (item.rationale.matchedUrgency) {
    keys.push("urgency");
  }
  if (item.rationale.matchedProviderType) {
    keys.push("providerType");
  }
  if (item.rationale.matchedInstantBooking) {
    keys.push("instantBooking");
  }
  if (
    session.answers.preferredPractitionerGender !== "ANY" &&
    !item.rationale.matchedGenderPreference
  ) {
    keys.push("genderPartial");
  }

  return keys.slice(0, 4);
}

export default function GuidedMatchingSessionScreen({
  sessionId,
}: GuidedMatchingSessionScreenProps) {
  const t = useTranslations("guided-matching");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const numberLocale = isArabic ? "ar-SA" : "en-US";

  const { data, isLoading, isError, refetch } = useMatchingSession(sessionId);
  const { data: specialtiesData } = useSpecialties();

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          title={t("states.loadError.heading")}
          note={t("states.loadError.note")}
          action={{
            label: t("states.loadError.retry"),
            href: (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  {t("states.loadError.retry")}
                </button>
                <Link
                  href="/patient/matching"
                  className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2.5 text-sm font-semibold text-text-primary hover:border-primary hover:text-primary"
                >
                  {t("states.loadError.restart")}
                </Link>
              </div>
            ),
          }}
        />
      </div>
    );
  }

  const totalMatches = data.items.length;
  const topScore = totalMatches > 0 ? data.items[0]?.score ?? null : null;

  // Resolve localized specialty name if user selected one
  const resolvedSpecialtyName = (() => {
    const slug = data.answers.preferredSpecialtySlug;
    if (!slug) return null;
    const list = specialtiesData?.specialties ?? [];
    const found = list.find((item) => item.slug === slug);
    if (found) {
      return getLocalizedSpecialtyName(found, locale);
    }
    // Pretty fallback if not yet loaded
    return slug.replace(/-/g, " ");
  })();

  return (
    <div className="app-max-content mx-auto space-y-6">
      {/* 1. Header & Preferences Summary (Clean, Compact, Supportive) */}
      <section className="app-panel relative overflow-hidden rounded-[28px] border border-border-light/80 bg-gradient-to-br from-white via-surface-cream/20 to-white p-5 sm:p-7 shadow-xs dark:from-surface-secondary dark:via-surface-secondary dark:to-surface-secondary dark:border-border-dark">
        {/* Top Decorative Color Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary/60" />

        <div className="flex flex-col gap-5">
          {/* Main Title Row + Action */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("result.eyebrow")}
                </span>
                {topScore !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-300">
                    {t("result.topScoreBadge", { score: topScore })}
                  </span>
                )}
                <span className="rounded-full bg-surface-tertiary px-2.5 py-0.5 text-xs font-semibold text-text-secondary dark:bg-surface-secondary dark:text-text-muted">
                  {t("result.matchesCount", { count: totalMatches })}
                </span>
              </div>

              <h1 className="text-xl font-bold tracking-tight text-text-primary dark:text-white sm:text-2xl">
                {totalMatches > 0 ? t("result.title") : t("result.empty.title")}
              </h1>

              <p className="text-xs sm:text-sm leading-relaxed text-text-secondary max-w-2xl">
                {totalMatches > 0 ? t("result.note") : t("result.empty.note")}
              </p>
            </div>

            {/* Retake / Modify Button */}
            <div className="shrink-0">
              <Link
                href="/patient/matching"
                className="inline-flex items-center gap-2 rounded-xl border border-border-light bg-white px-3.5 py-2 text-xs font-bold text-text-primary shadow-2xs transition hover:border-primary hover:text-primary active:scale-[0.98] dark:bg-surface-secondary dark:border-border-dark dark:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5 text-primary" />
                <span>{t("result.retake")}</span>
              </Link>
            </div>
          </div>

          {/* Preferences Tags Strip */}
          <div className="pt-2 border-t border-border-light/60 dark:border-border-dark/60">
            <div className="flex flex-wrap items-center gap-2">
              {data.answers.primaryConcern && (
                <PreferenceTag
                  icon={<MessageSquare className="h-3.5 w-3.5" />}
                  label={isArabic ? "الاحتياج" : "Concern"}
                  value={data.answers.primaryConcern}
                />
              )}
              {resolvedSpecialtyName && (
                <PreferenceTag
                  icon={<Tag className="h-3.5 w-3.5" />}
                  label={isArabic ? "التخصص" : "Specialty"}
                  value={resolvedSpecialtyName}
                />
              )}
              {data.answers.preferredLanguage && (
                <PreferenceTag
                  icon={<Globe className="h-3.5 w-3.5" />}
                  label={isArabic ? "اللغة" : "Language"}
                  value={getLocalizedLanguageLabel(data.answers.preferredLanguage, locale)}
                />
              )}
              {data.answers.sessionMode && (
                <PreferenceTag
                  icon={
                    data.answers.sessionMode === "VIDEO" ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : (
                      <Mic className="h-3.5 w-3.5" />
                    )
                  }
                  label={isArabic ? "نوع الجلسة" : "Session Mode"}
                  value={t(
                    `choices.mode.${data.answers.sessionMode}` as Parameters<typeof t>[0],
                  )}
                />
              )}
              {data.answers.urgency && (
                <PreferenceTag
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label={isArabic ? "التوقيت" : "Timeline"}
                  value={t(
                    `choices.urgency.${data.answers.urgency}.title` as Parameters<typeof t>[0],
                  )}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Recommended Practitioners Cards */}
      {data.items.length > 0 ? (
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => {
            const reasons = buildReasonKeys(data, item);
            const price30 = formatAmount(item.practitioner.sessionPrice30, "EGP", numberLocale);
            const price60 = formatAmount(item.practitioner.sessionPrice60, "EGP", numberLocale);
            const startingPrice = price30 ?? price60;
            const docName =
              (isArabic ? item.practitioner.nameAr : item.practitioner.nameEn) ||
              item.practitioner.displayName ||
              item.practitioner.slug;
            const initials = avatarInitials(docName);
            const rank = item.rank;

            return (
              <article
                key={item.practitioner.id}
                className="group flex flex-col justify-between rounded-[24px] border border-border-light/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md dark:bg-surface-secondary dark:border-border-dark"
              >
                <div className="space-y-4">
                  {/* Top Doctor Identity Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {/* Avatar */}
                      <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-surface-cream p-0.5 dark:bg-surface-secondary">
                        <PractitionerAvatar
                          src={item.practitioner.avatarUrl}
                          alt={docName}
                          initials={initials}
                          className="h-full w-full rounded-full object-cover"
                        />
                        {item.practitioner.isVerified && (
                          <span
                            className="absolute bottom-0 end-0 inline-flex h-4 w-4 items-center justify-center rounded-full border border-white bg-primary text-white"
                            title="مختص معتمد"
                          >
                            <BadgeCheck className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      {/* Name & Title */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-text-primary dark:text-white leading-snug truncate">
                          {docName}
                        </h3>
                        <p className="text-xs font-medium text-text-secondary dark:text-text-muted line-clamp-1 mt-0.5">
                          {item.practitioner.professionalTitle
                            ? getProfessionalTitleLabel(item.practitioner.professionalTitle, locale)
                            : "مختص نفسي ومعالج معتمد"}
                        </p>
                      </div>
                    </div>

                    {/* Match Score & Rank Badges */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{item.score}% توافق</span>
                      </span>
                      <span className="text-[10px] font-semibold text-text-muted">
                        {t("result.card.rankBadge", { rank })}
                      </span>
                    </div>
                  </div>

                  {/* Specialties Pills */}
                  {item.practitioner.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.practitioner.specialties.slice(0, 3).map((specialty) => (
                        <span
                          key={specialty}
                          className="rounded-lg bg-surface-tertiary px-2.5 py-1 text-[11px] font-medium text-text-secondary dark:bg-surface-secondary dark:border dark:border-border-dark dark:text-text-muted"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Languages & Price Strip */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border-light/60 bg-surface-tertiary/40 p-3 text-xs dark:bg-surface-secondary/40 dark:border-border-dark">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
                        <Globe className="h-3 w-3" />
                        <span>{t("result.card.languagesLabel")}</span>
                      </div>
                      <p className="font-semibold text-text-primary dark:text-white truncate">
                        {item.practitioner.languages.length > 0
                          ? item.practitioner.languages
                              .map((language) => getLocalizedLanguageLabel(language, locale))
                              .join(" · ")
                          : t("result.card.none")}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
                        <CircleDollarSign className="h-3 w-3" />
                        <span>{t("result.card.sessionFrom")}</span>
                      </div>
                      <p className="font-bold text-primary dark:text-primary-light">
                        {startingPrice ?? t("result.card.notAvailable")}
                      </p>
                    </div>
                  </div>

                  {/* Why Matched Reasons */}
                  {reasons.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                        {t("result.card.whyHeading")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {reasons.map((key) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-light/40 px-2.5 py-0.5 text-[11px] font-semibold text-primary dark:bg-primary/10 dark:text-primary-light"
                          >
                            ✓ {t(`result.reasons.${key}` as Parameters<typeof t>[0])}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="pt-4 mt-auto">
                  <Link
                    href={`/patient/practitioners/${item.practitioner.slug}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.98]"
                  >
                    <span>{t("result.card.viewProfile")}</span>
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="app-panel rounded-[28px] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
              <AlertCircle className="h-6 w-6" />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-text-primary dark:text-white">
                {t("result.empty.heading")}
              </h2>
              <p className="text-sm leading-relaxed text-text-secondary">
                {t("result.empty.note")}
              </p>
              <div className="pt-2">
                <Link
                  href="/patient/matching"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-hover"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t("actions.startAgain")}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Next Steps (Compact, Clean 4-Tile Grid) */}
      <section className="app-panel rounded-[28px] p-5 sm:p-6 shadow-xs dark:border-border-dark">
        <div className="mb-4">
          <h2 className="text-base font-bold text-text-primary dark:text-white">
            {t("result.nextHeading")}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {t("result.nextNote")}
          </p>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/patient/matching"
            className="app-panel-soft group flex flex-col justify-between gap-3 rounded-2xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-2xs dark:hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors dark:bg-primary/20">
                <RotateCcw className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                {t("actions.startAgain")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                {t("actions.startAgainNote")}
              </p>
            </div>
          </Link>

          <Link
            href="/patient/assessments"
            className="app-panel-soft group flex flex-col justify-between gap-3 rounded-2xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-2xs dark:hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors dark:bg-emerald-950/50 dark:text-emerald-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                {t("actions.reviewAssessments")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                {t("actions.reviewAssessmentsNote")}
              </p>
            </div>
          </Link>

          <Link
            href="/patient/practitioners"
            className="app-panel-soft group flex flex-col justify-between gap-3 rounded-2xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-2xs dark:hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors dark:bg-amber-950/50 dark:text-amber-300">
                <HeartHandshake className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                {t("actions.browseAll")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                {t("actions.browseAllNote")}
              </p>
            </div>
          </Link>

          <Link
            href="/patient/messages?lane=support"
            className="app-panel-soft group flex flex-col justify-between gap-3 rounded-2xl p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-2xs dark:hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors dark:bg-blue-950/50 dark:text-blue-300">
                <LifeBuoy className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                {t("actions.openSupport")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                {t("actions.openSupportNote")}
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
