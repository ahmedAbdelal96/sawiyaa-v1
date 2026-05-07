"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useMatchingSession } from "../hooks/use-guided-matching";
import type {
  MatchingRecommendationItem,
  MatchingSession,
} from "../types/guided-matching.types";
import {
  AlertCircle,
  ArrowRight,
  CircleDollarSign,
  Globe,
  HeartHandshake,
  LifeBuoy,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";

type GuidedMatchingSessionScreenProps = {
  sessionId: string;
};

type StatCardProps = {
  label: string;
  value: ReactNode;
  helper?: string;
};

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

function SummaryChip({ children }: { children: ReactNode }) {
  return <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">{children}</span>;
}

function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className="app-panel-soft rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95">
        {value}
      </div>
      {helper ? <p className="mt-1 text-xs leading-6 text-text-secondary">{helper}</p> : null}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="app-max-content mx-auto">
      <ListStateSkeleton items={3} heightClass="h-40" />
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
  const numberLocale = locale === "ar" ? "ar-SA" : "en-US";
  const { data, isLoading, isError, refetch } = useMatchingSession(sessionId);

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
  const averageScore =
    totalMatches > 0
      ? Math.round(data.items.reduce((sum, item) => sum + item.score, 0) / totalMatches)
      : null;

  return (
    <div className="app-max-content mx-auto space-y-5 sm:space-y-6">
      <section className="app-panel rounded-[32px] p-5 sm:p-7 xl:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] xl:items-start">
          <div className="space-y-5">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("result.eyebrow")}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
                {data.items.length > 0 ? t("result.title") : t("result.empty.title")}
              </h1>
              <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
                {data.items.length > 0 ? t("result.note") : t("result.empty.note")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label={t("result.stats.matchesLabel")}
                value={totalMatches}
                helper={t("result.stats.matchesHint")}
              />
              <StatCard
                label={t("result.stats.topScoreLabel")}
                value={topScore !== null ? `${topScore}%` : "—"}
                helper={t("result.stats.topScoreHint")}
              />
              <StatCard
                label={t("result.stats.averageScoreLabel")}
                value={averageScore !== null ? `${averageScore}%` : "—"}
                helper={t("result.stats.averageScoreHint")}
              />
            </div>
          </div>

          <aside className="xl:sticky xl:top-6">
            <div className="app-panel-soft rounded-[28px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("result.sessionPanel.title")}
                  </p>
                  <p className="mt-2 text-sm font-medium text-text-primary dark:text-white/90">
                    {t("result.sessionId", { id: data.sessionId })}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{t("result.sessionSaved")}</p>
                </div>
                <div className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary dark:bg-primary/15">
                  {t("result.sessionPanel.quickView")}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {t("result.sessionPanel.preferences")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.answers.primaryConcern && (
                    <SummaryChip>
                      {t("result.summary.concern", { value: data.answers.primaryConcern })}
                    </SummaryChip>
                  )}
                  {data.answers.preferredSpecialtySlug && (
                    <SummaryChip>
                      {t("result.summary.specialty", {
                        value: data.answers.preferredSpecialtySlug,
                      })}
                    </SummaryChip>
                  )}
                  {data.answers.preferredLanguage && (
                    <SummaryChip>
                      {t("result.summary.language", {
                        value: t(
                          `choices.language.${data.answers.preferredLanguage}` as Parameters<
                            typeof t
                          >[0],
                        ),
                      })}
                    </SummaryChip>
                  )}
                  {data.answers.sessionMode && (
                    <SummaryChip>
                      {t("result.summary.mode", {
                        value: t(
                          `choices.mode.${data.answers.sessionMode}` as Parameters<
                            typeof t
                          >[0],
                        ),
                      })}
                    </SummaryChip>
                  )}
                  <SummaryChip>
                    {t("result.summary.urgency", {
                      value: t(
                        `choices.urgency.${data.answers.urgency}.title` as Parameters<typeof t>[0],
                      ),
                    })}
                  </SummaryChip>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {data.items.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {data.items.map((item) => {
            const reasons = buildReasonKeys(data, item);
            const price30 = formatAmount(item.practitioner.sessionPrice30, "EGP", numberLocale);
            const price60 = formatAmount(item.practitioner.sessionPrice60, "EGP", numberLocale);

            return (
              <article key={item.practitioner.id} className="app-panel h-full rounded-[28px] p-4 sm:p-5">
                <div className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
                        <Stethoscope className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold leading-7 text-text-primary dark:text-white/95">
                          {item.practitioner.displayName ?? item.practitioner.slug}
                        </p>
                        {item.practitioner.professionalTitle && (
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-text-secondary">
                            {item.practitioner.professionalTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="app-chip rounded-full px-3 py-1.5 text-xs font-semibold text-primary">
                        #{item.rank}
                      </span>
                      <span className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary dark:bg-primary/15">
                        {item.score}%
                      </span>
                    </div>
                  </div>

                  {item.practitioner.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.practitioner.specialties.slice(0, 3).map((specialty) => (
                        <SummaryChip key={specialty}>{specialty}</SummaryChip>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="app-panel-soft rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                        <Globe className="h-4 w-4" />
                        <span>{t("result.card.languagesLabel")}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-text-primary dark:text-white/90">
                        {item.practitioner.languages.length > 0
                          ? item.practitioner.languages.join(" · ")
                          : t("result.card.none")}
                      </p>
                    </div>

                    <div className="app-panel-soft rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                        <CircleDollarSign className="h-4 w-4" />
                        <span>{t("result.card.priceLabel")}</span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm font-medium text-text-primary dark:text-white/90">
                        <p>
                          {t("result.card.price30", {
                            value: price30 ?? t("result.card.notAvailable"),
                          })}
                        </p>
                        <p>
                          {t("result.card.price60", {
                            value: price60 ?? t("result.card.notAvailable"),
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {reasons.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                        {t("result.card.whyHeading")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {reasons.map((key) => (
                          <SummaryChip key={key}>
                            {t(`result.reasons.${key}` as Parameters<typeof t>[0])}
                          </SummaryChip>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-1">
                    <Link
                      href={`/patient/practitioners/${item.practitioner.slug}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    >
                      {t("result.card.viewProfile")}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="app-panel rounded-[32px] p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
                {t("result.empty.heading")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t("result.empty.note")}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
            {t("result.nextHeading")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t("result.nextNote")}
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link
            href="/patient/matching"
            className="app-panel-soft flex items-center justify-between gap-4 rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("actions.startAgain")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{t("actions.startAgainNote")}</p>
            </div>
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          </Link>

          <Link
            href="/patient/assessments"
            className="app-panel-soft flex items-center justify-between gap-4 rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("actions.reviewAssessments")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {t("actions.reviewAssessmentsNote")}
              </p>
            </div>
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          </Link>

          <Link
            href="/patient/support"
            className="app-panel-soft flex items-center justify-between gap-4 rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("actions.openSupport")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{t("actions.openSupportNote")}</p>
            </div>
            <LifeBuoy className="h-5 w-5 shrink-0 text-primary" />
          </Link>

          <Link
            href="/patient/practitioners"
            className="app-panel-soft flex items-center justify-between gap-4 rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("actions.browseAll")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{t("actions.browseAllNote")}</p>
            </div>
            <HeartHandshake className="h-5 w-5 shrink-0 text-primary" />
          </Link>
        </div>
      </section>
    </div>
  );
}
