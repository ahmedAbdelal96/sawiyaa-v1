"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
        <div className="app-panel rounded-[32px] p-6 sm:p-7">
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

  if (!started) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
        <section className="app-panel rounded-[32px] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("detail.eyebrow")}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
                {item.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
                {item.introText ?? item.description ?? t("detail.note")}
              </p>
            </div>

            <div className="app-panel-soft rounded-2xl px-4 py-3 text-sm text-text-secondary">
              <div className="flex items-center gap-2 text-text-primary dark:text-white/90">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-medium">{t("detail.trustTitle")}</span>
              </div>
              <p className="mt-1 max-w-xs text-xs leading-5 text-text-muted">
                {t("detail.trustNote")}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
              {item.category}
            </span>
            {item.estimatedDurationMinutes !== null && (
              <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
                {t("detail.meta.duration", { value: item.estimatedDurationMinutes })}
              </span>
            )}
            <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
              {t("detail.meta.questionCount", { value: questions.length })}
            </span>
          </div>
        </section>

        <section className="app-panel rounded-[32px] p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
            {t("detail.beforeYouBegin.heading")}
          </h2>
          <div className="mt-4 space-y-3">
            {[
              t("detail.beforeYouBegin.first"),
              t("detail.beforeYouBegin.second"),
              t("detail.beforeYouBegin.third"),
            ].map((note) => (
              <div key={note} className="app-panel-soft rounded-[24px] p-4">
                <p className="text-sm leading-6 text-text-secondary">{note}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setStarted(true)}>
            {t("actions.start")}
          </Button>
          <Link
            href="/patient/assessments"
            className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-3 text-sm font-medium text-text-primary hover:border-primary/25 hover:text-primary"
          >
            {t("actions.backToList")}
          </Link>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const progress = buildProgress(currentIndex, questions.length);

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("detail.flow.progressLabel", {
                current: currentIndex + 1,
                total: questions.length,
              })}
            </p>
            <h1 className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">
              {item.title}
            </h1>
          </div>
          <span className="app-chip rounded-full px-3 py-1.5 text-xs font-medium">
            {progress}%
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-tertiary dark:bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-text-primary dark:text-white/95">
              {currentQuestion.prompt}
            </h2>
            {currentQuestion.description && (
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {currentQuestion.description}
              </p>
            )}
          </div>
          {!currentQuestion.isRequired && (
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              {t("detail.optional")}
            </span>
          )}
        </div>

        <fieldset className="mt-5 space-y-3">
          <legend className="sr-only">{currentQuestion.prompt}</legend>
          {currentQuestion.options.map((option) => {
            const checked = answers[currentQuestion.key] === option.key;
            return (
              <label
                key={option.key}
                className={`flex cursor-pointer items-start gap-3 rounded-[24px] border p-4 transition ${
                  checked
                    ? "border-primary/25 bg-primary-light"
                    : "border-border-light bg-white/80 hover:border-primary/20 hover:bg-surface-secondary dark:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name={currentQuestion.key}
                  value={option.key}
                  checked={checked}
                  onChange={() => setAnswer(currentQuestion.key, option.key)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 text-sm leading-6 text-text-primary dark:text-white/90">
                  {option.label}
                </span>
              </label>
            );
          })}
        </fieldset>

        {stepError && (
          <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-primary dark:text-white/90">
            {stepError}
          </div>
        )}

        {submitError && (
          <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-primary dark:text-white/90">
            {submitError}
          </div>
        )}
      </section>

      <div className="app-panel sticky bottom-20 rounded-[28px] p-4 sm:bottom-6 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">{t("detail.flow.footerNote")}</p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              startIcon={<ChevronLeft className="h-4 w-4 rtl:rotate-180" />}
              onClick={goBack}
            >
              {currentIndex === 0 ? t("actions.backToOverview") : t("actions.back")}
            </Button>

            {currentIndex < questions.length - 1 ? (
              <Button type="button" size="sm" onClick={goNext}>
                {t("actions.next")}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={submitAssessment.isPending}
                onClick={handleSubmit}
                endIcon={
                  submitAssessment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )
                }
              >
                {submitAssessment.isPending
                  ? t("actions.submitting")
                  : t("actions.submit")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
