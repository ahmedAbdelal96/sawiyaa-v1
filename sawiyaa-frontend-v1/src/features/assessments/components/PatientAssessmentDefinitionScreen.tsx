"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useSubmitAssessment } from "../hooks/use-assessments";
import type {
  AssessmentDefinitionDetails,
  SubmitAssessmentRequest,
} from "../types/assessments.types";

type PatientAssessmentDefinitionScreenProps = {
  item: AssessmentDefinitionDetails;
};

function buildProgress(current: number, total: number) {
  if (total <= 0) return 0;
  return Math.round(((current + 1) / total) * 100);
}

export default function PatientAssessmentDefinitionScreen({
  item,
}: PatientAssessmentDefinitionScreenProps) {
  const t = useTranslations("assessments");
  const router = useRouter();
  const submitAssessment = useSubmitAssessment(item.slug);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const questions = useMemo(
    () => item.questions.filter((question) => question.inputType === "SINGLE_CHOICE"),
    [item.questions],
  );
  const hasUnsupportedQuestions = questions.length !== item.questions.length;
  const currentQuestion = questions[currentIndex];

  const setAnswer = (questionKey: string, optionKey: string) => {
    setAnswers((current) => ({
      ...current,
      [questionKey]: optionKey,
    }));
    setStepError(null);
    setSubmitError(null);
  };

  const goNext = () => {
    if (!currentQuestion) return;

    if (currentQuestion.isRequired && !answers[currentQuestion.key]) {
      setStepError(t("detail.flow.requiredError"));
      return;
    }

    setStepError(null);
    setCurrentIndex((value) => Math.min(value + 1, questions.length - 1));
  };

  const goBack = () => {
    setStepError(null);

    if (currentIndex === 0) {
      setStarted(false);
      return;
    }

    setCurrentIndex((value) => Math.max(value - 1, 0));
  };

  const handleSubmit = async () => {
    setStepError(null);
    setSubmitError(null);

    const firstMissingRequired = questions.findIndex(
      (question) => question.isRequired && !answers[question.key],
    );

    if (firstMissingRequired >= 0) {
      setCurrentIndex(firstMissingRequired);
      setStarted(true);
      setStepError(t("detail.flow.requiredError"));
      return;
    }

    const payload: SubmitAssessmentRequest = {
      answers: questions
        .filter((question) => answers[question.key])
        .map((question) => ({
          questionKey: question.key,
          selectedOptionKey: answers[question.key],
        })),
    };

    try {
      const result = await submitAssessment.mutateAsync(payload);
      router.push(`/patient/assessments/submissions/${result.submissionId}`);
      router.refresh();
    } catch {
      setSubmitError(t("states.submitError"));
    }
  };

  if (hasUnsupportedQuestions) {
    return (
      <div className="mx-auto max-w-2xl text-start">
        <div className="rounded-3xl border border-border-light bg-white p-6 shadow-xs dark:bg-surface-secondary dark:border-border-dark">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-light">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-bold text-text-primary dark:text-white">
                {t("states.unsupported.heading")}
              </h1>
              <p className="mt-1 text-xs text-text-secondary dark:text-text-muted">
                {t("states.unsupported.note")}
              </p>
            </div>
          </div>
          <Link
            href="/patient/assessments"
            className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
          >
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            <span>{t("actions.backToList")}</span>
          </Link>
        </div>
      </div>
    );
  }

  // SCREEN 1: Overview & Before You Begin Screen
  if (!started) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 text-start">
        <div className="relative overflow-hidden rounded-3xl border border-border-light/80 bg-white p-6 sm:p-8 shadow-xs dark:bg-surface-secondary dark:border-border-dark">
          {/* Header Banner */}
          <div className="text-center space-y-3 pb-6 border-b border-border-light/60">
            <div className="inline-flex">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 via-teal-500/10 to-primary/5 text-primary shadow-xs dark:text-primary-light">
                <Brain className="h-8 w-8" />
              </span>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{item.category || t("detail.eyebrow")}</span>
              </span>
              <h1
                dir="auto"
                className="text-2xl sm:text-3xl font-extrabold text-text-primary dark:text-white tracking-tight"
              >
                {item.title}
              </h1>
            </div>

            <p
              dir="auto"
              className="text-xs sm:text-sm leading-relaxed text-text-secondary dark:text-text-muted max-w-xl mx-auto"
            >
              {item.introText ?? item.description ?? t("detail.note")}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 py-5 border-b border-border-light/60">
            <div className="rounded-2xl bg-surface-tertiary/40 p-3.5 text-center dark:bg-surface-secondary/60">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-text-muted">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>{t("detail.meta.estimatedDuration")}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-text-primary dark:text-white font-mono">
                {item.estimatedDurationMinutes !== null
                  ? t("detail.meta.duration", { value: item.estimatedDurationMinutes })
                  : "3 دقائق"}
              </p>
            </div>

            <div className="rounded-2xl bg-surface-tertiary/40 p-3.5 text-center dark:bg-surface-secondary/60">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-text-muted">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                <span>{t("detail.meta.questionCountLabel")}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-text-primary dark:text-white font-mono">
                {t("detail.meta.questionCount", { value: questions.length })}
              </p>
            </div>

            <div className="rounded-2xl bg-surface-tertiary/40 p-3.5 text-center dark:bg-surface-secondary/60">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>{t("detail.meta.privacy")}</span>
              </div>
              <p className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                خاصة ومحمية
              </p>
            </div>
          </div>

          {/* Before You Begin Guidelines */}
          <div className="py-6 space-y-3.5">
            <h2 className="text-sm font-bold text-text-primary dark:text-white">
              {t("detail.beforeYouBegin.heading")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  text: t("detail.beforeYouBegin.first"),
                  num: "1",
                  tone: "bg-teal-50 border-teal-200/70 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
                },
                {
                  text: t("detail.beforeYouBegin.second"),
                  num: "2",
                  tone: "bg-amber-50 border-amber-200/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
                },
                {
                  text: t("detail.beforeYouBegin.third"),
                  num: "3",
                  tone: "bg-violet-50 border-violet-200/70 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
                },
              ].map((tip) => (
                <div
                  key={tip.num}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-2.5 ${tip.tone}`}
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/20 text-xs font-bold font-mono">
                    {tip.num}
                  </span>
                  <p className="text-xs leading-relaxed font-medium">{tip.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border-light/60 pt-6">
            <Link
              href="/patient/assessments"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-border-light bg-white px-5 py-2.5 text-xs font-bold text-text-secondary hover:border-primary/40 hover:text-text-primary transition dark:bg-surface-secondary dark:border-border-dark cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
              <span>{t("actions.backToList")}</span>
            </Link>

            <button
              type="button"
              onClick={() => setStarted(true)}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-xs font-bold text-white shadow-md transition hover:bg-primary-hover active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>{t("actions.start")}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const progress = buildProgress(currentIndex, questions.length);

  return (
    <div className="mx-auto max-w-2xl space-y-4 text-start">
      {/* Top Header & Progress */}
      <section className="rounded-3xl border border-border-light/80 bg-white p-4 sm:p-5 shadow-xs dark:bg-surface-secondary dark:border-border-dark">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span dir="auto" className="text-[11px] font-bold text-primary">
              {item.title}
            </span>
            <h2 className="text-xs font-bold text-text-secondary dark:text-text-muted">
              {t("detail.flow.progressLabel", {
                current: currentIndex + 1,
                total: questions.length,
              })}
            </h2>
          </div>

          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-mono font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
            {progress}%
          </span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-tertiary dark:bg-surface-tertiary">
          <div
            className="h-full rounded-full bg-linear-to-r from-primary via-teal-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      {/* Main Question Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border-light/80 bg-white p-5 sm:p-7 shadow-xs dark:bg-surface-secondary dark:border-border-dark">
        {/* Question Prompt */}
        <div className="space-y-2 pb-6 border-b border-border-light/60">
          <div className="flex items-start justify-between gap-3">
            <h1
              dir="auto"
              className="text-lg sm:text-xl font-bold text-text-primary dark:text-white leading-relaxed"
            >
              {currentQuestion.prompt}
            </h1>
            {!currentQuestion.isRequired && (
              <span className="shrink-0 rounded-full bg-surface-tertiary px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
                {t("detail.optional")}
              </span>
            )}
          </div>

          {currentQuestion.description && (
            <p dir="auto" className="text-xs text-text-secondary dark:text-text-muted leading-relaxed">
              {currentQuestion.description}
            </p>
          )}
        </div>

        {/* Options List */}
        <fieldset className="py-6 space-y-3">
          <legend className="sr-only">{currentQuestion.prompt}</legend>
          {currentQuestion.options.map((option, optIdx) => {
            const isSelected = answers[currentQuestion.key] === option.key;
            const numberLabel = optIdx + 1;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setAnswer(currentQuestion.key, option.key)}
                className={`group relative flex w-full items-center justify-between gap-3.5 rounded-2xl border p-4 text-start transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-primary bg-linear-to-r from-primary/10 via-primary/5 to-transparent ring-2 ring-primary/25 shadow-xs"
                    : "border-border-light bg-white hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-tertiary/40 dark:bg-surface-secondary dark:border-border-dark"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold font-mono transition-all duration-200 ${
                      isSelected
                        ? "bg-primary text-white shadow-xs"
                        : "bg-surface-tertiary text-text-secondary group-hover:bg-primary/10 group-hover:text-primary dark:bg-white/10 dark:text-white/80"
                    }`}
                  >
                    {numberLabel}
                  </span>

                  <span
                    dir="auto"
                    className={`text-xs sm:text-sm font-bold transition-colors ${
                      isSelected
                        ? "text-text-primary dark:text-white"
                        : "text-text-primary group-hover:text-primary dark:text-white/90"
                    }`}
                  >
                    {option.label}
                  </span>
                </div>

                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary text-white scale-110 shadow-xs"
                      : "border-border-strong text-transparent group-hover:border-primary/50"
                  }`}
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              </button>
            );
          })}
        </fieldset>

        {/* Validation / Submit Error */}
        {(stepError || submitError) && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{stepError || submitError}</span>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-light/60 pt-5">
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <Lock className="h-3.5 w-3.5 text-primary" />
            <span>{t("detail.flow.footerNote")}</span>
          </div>

          <div className="flex w-full sm:w-auto items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border-light bg-white px-4 text-xs font-semibold text-text-secondary transition hover:border-primary/40 hover:text-text-primary dark:bg-surface-secondary dark:border-border-dark cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
              <span>{currentIndex === 0 ? t("actions.backToOverview") : t("actions.back")}</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.98] cursor-pointer"
              >
                <span>{t("actions.next")}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitAssessment.isPending}
                onClick={handleSubmit}
                className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary to-teal-600 px-6 text-xs font-bold text-white shadow-md transition hover:from-primary-hover hover:to-teal-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {submitAssessment.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("actions.submitting")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t("actions.submit")}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
