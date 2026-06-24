"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  ShieldCheck,
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
      <div className="mx-auto max-w-3xl">
        <div className="app-panel rounded-[28px] p-5 sm:p-6 text-start">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-text-primary dark:text-white/95">
                {t("states.unsupported.heading")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t("states.unsupported.note")}
              </p>
            </div>
          </div>
          <Link
            href="/patient/assessments"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {t("actions.backToList")}
          </Link>
        </div>
      </div>
    );
  }

  const locale = useLocale();

  if (!started) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[32px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary sm:p-8">
          {/* Eyebrow & Title */}
          <div className="text-start space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {item.category}
            </span>
            <h1 className="text-3xl font-extrabold text-text-primary dark:text-white/95 leading-tight">
              {item.title}
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed max-w-3xl pt-2">
              {item.introText ?? item.description ?? t("detail.note")}
            </p>
          </div>

          {/* Metadata Parameters Grid (Non-Card Text Grid) */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-6 border-t border-b border-border-light/60 py-6 text-start">
            <div>
              <p className="text-xs font-semibold text-text-muted">{locale === "ar" ? "المدة المقدرة" : "Estimated Duration"}</p>
              <p className="mt-1.5 text-sm sm:text-base font-bold text-text-primary dark:text-white">
                {item.estimatedDurationMinutes !== null ? t("detail.meta.duration", { value: item.estimatedDurationMinutes }) : t("detail.optional")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted">{locale === "ar" ? "عدد الأسئلة" : "Questions Count"}</p>
              <p className="mt-1.5 text-sm sm:text-base font-bold text-text-primary dark:text-white">
                {t("detail.meta.questionCount", { value: questions.length })}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted">{locale === "ar" ? "الخصوصية" : "Privacy"}</p>
              <p className="mt-1.5 text-sm sm:text-base font-bold text-text-primary dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>{t("detail.trustTitle")}</span>
              </p>
            </div>
          </div>

          {/* Before You Begin / Guidelines */}
          <div className="mt-8 text-start space-y-4">
            <h2 className="text-base font-bold text-text-primary dark:text-white/95">
              {t("detail.beforeYouBegin.heading")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                t("detail.beforeYouBegin.first"),
                t("detail.beforeYouBegin.second"),
                t("detail.beforeYouBegin.third"),
              ].map((note, index) => (
                <div key={note} className="rounded-2xl bg-surface-tertiary/40 p-4 border border-border-light/40 flex items-start gap-2.5">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-xs leading-5 text-text-secondary">{note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-border-light/60">
            <Link
              href="/patient/assessments"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-6 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface-tertiary/20"
            >
              {t("actions.backToList")}
            </Link>
            <Button
              type="button"
              onClick={() => setStarted(true)}
              className="w-full sm:w-auto rounded-2xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-hover"
            >
              {t("actions.start")}
            </Button>
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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Questionnaire Card */}
      <div className="rounded-[32px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary sm:p-8">
        
        {/* Header with Title and Progress */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-light/60">
          <div className="text-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {item.title}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {t("detail.flow.progressLabel", {
                current: currentIndex + 1,
                total: questions.length,
              })}
            </h2>
          </div>
          <span className="inline-flex rounded-full bg-primary-light/60 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
            {progress}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-tertiary dark:bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Prompt */}
        <div className="mt-8 text-start space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary dark:text-white/95 leading-snug">
              {currentQuestion.prompt}
            </h1>
            {!currentQuestion.isRequired && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-0.5 text-xs font-semibold text-text-muted">
                {t("detail.optional")}
              </span>
            )}
          </div>
          {currentQuestion.description && (
            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
              {currentQuestion.description}
            </p>
          )}
        </div>

        {/* Multiple Choice Options (Single list of wide, hover-lift rows) */}
        <fieldset className="mt-8">
          <legend className="sr-only">{currentQuestion.prompt}</legend>
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const checked = answers[currentQuestion.key] === option.key;
              return (
                <label
                  key={option.key}
                  className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 text-start ${
                    checked
                      ? "border-primary bg-primary-light/35 shadow-sm dark:bg-primary/10 dark:border-primary"
                      : "border-border-light bg-white hover:border-primary/20 hover:bg-surface-secondary dark:bg-surface-secondary dark:border-border-light/40 dark:hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.key}
                    value={option.key}
                    checked={checked}
                    onChange={() => setAnswer(currentQuestion.key, option.key)}
                    className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
                  />
                  <span className="min-w-0 text-sm font-semibold text-text-primary dark:text-white/90">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Step or Submit Error */}
        {(stepError || submitError) && (
          <div className="mt-4 rounded-xl border border-error/20 bg-error-light/50 px-4 py-3 text-sm text-error text-start flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{stepError || submitError}</span>
          </div>
        )}

        {/* Navigation Action Buttons at the bottom of the card */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border-light/60 pt-6">
          <p className="text-xs text-text-muted text-start leading-normal order-last sm:order-first">
            {t("detail.flow.footerNote")}
          </p>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goBack}
              className="flex-1 sm:flex-initial rounded-xl"
            >
              {currentIndex === 0 ? t("actions.backToOverview") : t("actions.back")}
            </Button>

            {currentIndex < questions.length - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={goNext}
                className="flex-1 sm:flex-initial rounded-xl bg-primary text-white hover:bg-primary-hover"
              >
                {t("actions.next")}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={submitAssessment.isPending}
                onClick={handleSubmit}
                className="flex-1 sm:flex-initial rounded-xl bg-primary text-white hover:bg-primary-hover"
                endIcon={
                  submitAssessment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )
                }
              >
                {submitAssessment.isPending ? t("actions.submitting") : t("actions.submit")}
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
