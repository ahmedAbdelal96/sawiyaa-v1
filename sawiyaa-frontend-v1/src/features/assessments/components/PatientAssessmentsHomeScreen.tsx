"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Activity,
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  HeartHandshake,
  LifeBuoy,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Zap,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { usePatientAssessmentsHistory } from "../hooks/use-assessments";
import type { AssessmentDefinition, AssessmentResultBand } from "../types/assessments.types";

type PatientAssessmentsHomeScreenProps = {
  items: AssessmentDefinition[];
  loadFailed?: boolean;
};

const assessmentIcons = [Brain, Activity, Sparkles, HeartHandshake, ShieldCheck, Target];

const cardGradientTones = [
  "from-violet-500/10 via-purple-500/5 to-transparent border-violet-200/70 dark:border-violet-800/40",
  "from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-200/70 dark:border-emerald-800/40",
  "from-amber-500/10 via-orange-500/5 to-transparent border-amber-200/70 dark:border-amber-800/40",
  "from-sky-500/10 via-blue-500/5 to-transparent border-sky-200/70 dark:border-sky-800/40",
  "from-rose-500/10 via-pink-500/5 to-transparent border-rose-200/70 dark:border-rose-800/40",
];

const iconColorTones = [
  "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
  "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
  "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
  "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300",
  "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
];

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function hashToken(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function HistoryBandChip({ band }: { band: AssessmentResultBand | null }) {
  const t = useTranslations("assessments");

  if (!band) return null;

  const bandStyles: Record<AssessmentResultBand, string> = {
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    MILD: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    MODERATE: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    HIGH: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
        bandStyles[band] || "bg-surface-tertiary text-text-secondary"
      }`}
    >
      <CheckCircle2 className="h-3 w-3" />
      {t(`result.bands.${band}.title` as Parameters<typeof t>[0])}
    </span>
  );
}

export default function PatientAssessmentsHomeScreen({
  items,
  loadFailed = false,
}: PatientAssessmentsHomeScreenProps) {
  const t = useTranslations("assessments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const history = usePatientAssessmentsHistory({ page: 1, limit: 6, status: "COMPLETED" });
  const firstAvailableAssessment = items[0] ?? null;

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedCategory !== "ALL") {
      result = result.filter((item) => item.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [items, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 text-start">
      {/* Overview Trust Hero Card */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-r from-primary-light/40 via-teal-50/30 to-white p-5 sm:p-7 shadow-xs dark:from-primary/10 dark:via-surface-secondary dark:to-surface-secondary dark:border-primary/25">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t("home.trustTitle")}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
              {t("home.title")}
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed text-text-secondary dark:text-text-muted">
              {t("home.trustNote")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-2xl border border-border-light bg-white/90 p-3.5 text-center shadow-xs dark:bg-surface-secondary dark:border-border-dark">
              <p className="text-2xl font-extrabold text-primary font-mono">{items.length}</p>
              <p className="text-[11px] font-semibold text-text-muted mt-0.5">اختبارات متاحة</p>
            </div>
            <div className="rounded-2xl border border-border-light bg-white/90 p-3.5 text-center shadow-xs dark:bg-surface-secondary dark:border-border-dark">
              <p className="text-2xl font-extrabold text-emerald-600 font-mono">
                {history.data?.items.length ?? 0}
              </p>
              <p className="text-[11px] font-semibold text-text-muted mt-0.5">مكتملة لك</p>
            </div>
          </div>
        </div>
      </section>

      {/* Available Assessments Section */}
      <section className="space-y-4">
        {/* Controls Bar: Category Filter & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedCategory === "ALL"
                  ? "border-primary bg-primary text-white shadow-xs"
                  : "border-border-light bg-white text-text-secondary hover:border-primary/40 hover:text-text-primary dark:bg-surface-secondary dark:border-border-dark"
              }`}
            >
              الكل ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedCategory === cat
                    ? "border-primary bg-primary text-white shadow-xs"
                    : "border-border-light bg-white text-text-secondary hover:border-primary/40 hover:text-text-primary dark:bg-surface-secondary dark:border-border-dark"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {items.length > 3 ? (
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اختبار..."
                className="w-full rounded-xl border border-border-light bg-white py-1.5 ps-9 pe-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-hidden dark:bg-surface-secondary dark:border-border-dark"
              />
            </div>
          ) : null}
        </div>

        {loadFailed ? (
          <StateCard
            className="mt-4"
            centered={false}
            title={t("states.catalogError.heading")}
            note={t("states.catalogError.note")}
          />
        ) : filteredItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item, index) => {
              const seed = hashToken(`${item.slug}-${index}`);
              const Icon = assessmentIcons[seed % assessmentIcons.length];
              const gradientTone = cardGradientTones[seed % cardGradientTones.length];
              const iconTone = iconColorTones[seed % iconColorTones.length];

              return (
                <article
                  key={item.slug}
                  className={`group relative flex flex-col justify-between rounded-3xl border bg-linear-to-b ${gradientTone} bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:bg-surface-secondary`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform duration-200 group-hover:scale-105 ${iconTone}`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      {item.estimatedDurationMinutes !== null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-text-secondary shadow-2xs dark:bg-surface-tertiary dark:text-text-muted">
                          <Clock className="h-3 w-3 text-primary" />
                          <span>{t("home.card.minutes", { value: item.estimatedDurationMinutes })}</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {item.category}
                      </span>
                      <h3
                        dir="auto"
                        className="mt-0.5 text-base font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors line-clamp-1"
                      >
                        {item.title}
                      </h3>
                      <p
                        dir="auto"
                        className="mt-1.5 text-xs leading-relaxed text-text-secondary dark:text-text-muted line-clamp-2"
                      >
                        {item.description ?? t("home.card.noDescription")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border-light/60 pt-3.5">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>تجربة خاصة وسرية</span>
                    </span>

                    <Link
                      href={`/patient/assessments/${item.slug}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.98]"
                    >
                      <span>{t("home.card.open")}</span>
                      <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <StateCard
            className="mt-4"
            centered={false}
            title={t("home.empty.heading")}
            note={t("home.empty.note")}
            action={{
              label: t("result.actions.guidedMatching"),
              href: (
                <Link
                  href="/patient/matching"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  {t("result.actions.guidedMatching")}
                </Link>
              ),
            }}
          />
        )}
      </section>

      {/* Recent History Panel */}
      {history.data && history.data.items.length > 0 ? (
        <section className="rounded-3xl border border-border-light/80 bg-white p-5 sm:p-6 shadow-xs dark:bg-surface-secondary dark:border-border-dark">
          <div className="flex items-center gap-3 pb-4 border-b border-border-light/60">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-light">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">
                {t("history.heading")}
              </h2>
              <p className="text-xs text-text-secondary dark:text-text-muted mt-0.5">
                {t("history.note")}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.data.items.map((item) => (
              <div
                key={item.submissionId}
                className="flex flex-col justify-between rounded-2xl border border-border-light/80 bg-surface-tertiary/30 p-4 transition hover:border-primary/40 dark:bg-surface-secondary dark:border-border-dark"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 dir="auto" className="text-sm font-bold text-text-primary dark:text-white line-clamp-1">
                      {item.assessmentTitle}
                    </h3>
                    {item.totalScore !== null && (
                      <span className="shrink-0 rounded-md bg-primary-light/60 px-2 py-0.5 text-xs font-mono font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
                        {t("history.score", { value: item.totalScore })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <HistoryBandChip band={item.resultBand} />
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(item.completedAt ?? item.createdAt, numLocale)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-border-light/60 pt-3">
                  <Link
                    href={`/patient/assessments/submissions/${item.submissionId}`}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover"
                  >
                    <span>{t("history.viewResult")}</span>
                    <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                  </Link>
                  <Link
                    href={`/patient/assessments/${item.assessmentSlug}`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-primary/40 hover:text-primary dark:bg-surface-secondary dark:border-border-dark"
                    title={t("history.retake")}
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{t("history.retake")}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Next Steps Support & Matching Links */}
      <section className="rounded-3xl border border-border-light/80 bg-white p-5 sm:p-6 shadow-xs dark:bg-surface-secondary dark:border-border-dark">
        <div className="flex items-center gap-3 pb-3.5 border-b border-border-light/60">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300">
            <HeartHandshake className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-white">
              {t("home.nextHeading")}
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-muted mt-0.5">
              {t("home.nextNote")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/patient/matching"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-surface-tertiary/20 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary-light/10 dark:bg-surface-secondary dark:border-border-dark"
          >
            <div>
              <p className="text-sm font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                {t("home.nextMatching")}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary dark:text-text-muted">
                {t("home.nextMatchingNote")}
              </p>
            </div>
            <HeartHandshake className="h-5 w-5 shrink-0 text-primary transition group-hover:scale-110" />
          </Link>

          <Link
            href="/patient/messages?lane=support"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-surface-tertiary/20 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary-light/10 dark:bg-surface-secondary dark:border-border-dark"
          >
            <div>
              <p className="text-sm font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors">
                {t("home.nextSupport")}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary dark:text-text-muted">
                {t("home.nextSupportNote")}
              </p>
            </div>
            <LifeBuoy className="h-5 w-5 shrink-0 text-primary transition group-hover:scale-110" />
          </Link>
        </div>
      </section>
    </div>
  );
}
