"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import {
  ADMIN_ASSESSMENT_BAND_ORDER,
  ADMIN_ASSESSMENT_STATUS_STYLES,
  getAdminAssessmentsErrorKey,
} from "../lib/admin-assessments";
import {
  useAdminAssessmentDetails,
  useAdminAssessmentsList,
  useCreateAdminAssessmentOption,
  useCreateAdminAssessmentQuestion,
  useDeleteAdminAssessmentOption,
  useDeleteAdminAssessmentQuestion,
  useForkAdminAssessmentDraft,
  usePreviewAdminAssessmentScore,
  usePublishAdminAssessment,
  useReorderAdminAssessmentOptions,
  useReorderAdminAssessmentQuestions,
  useUnpublishAdminAssessment,
  useUpdateAdminAssessmentMetadata,
  useUpdateAdminAssessmentOption,
  useUpdateAdminAssessmentQuestion,
  useUpdateAdminAssessmentScoringConfig,
} from "../hooks/use-admin-assessments";
import type {
  AdminAssessmentOption,
  AdminAssessmentQuestion,
  AdminAssessmentResultBand,
  PreviewAdminAssessmentAnswerInput,
} from "../types/admin-assessments.types";

type Props = { assessmentId: string };
type AuthoringStage = "setup" | "questions" | "scoring" | "preview";

type ThresholdRow = {
  band: AdminAssessmentResultBand;
  minInclusive: number;
  maxInclusive: number;
};

type QuestionEditorState = {
  id: string;
  key: string;
  prompt: string;
  description: string;
  isRequired: boolean;
};

type OptionEditorState = {
  questionId: string;
  optionId: string;
  key: string;
  label: string;
  scoreValue: string;
};

const INITIAL_QUESTION_EDITOR: QuestionEditorState = {
  id: "",
  key: "",
  prompt: "",
  description: "",
  isRequired: true,
};

const INITIAL_OPTION_EDITOR: OptionEditorState = {
  questionId: "",
  optionId: "",
  key: "",
  label: "",
  scoreValue: "0",
};

function buildThresholdRows(
  thresholds:
    | Array<{ band: AdminAssessmentResultBand; minInclusive: number; maxInclusive: number }>
    | undefined,
) {
  const map = new Map((thresholds ?? []).map((item) => [item.band, item]));
  return ADMIN_ASSESSMENT_BAND_ORDER.map((band, index) => {
    const existing = map.get(band);
    if (existing) return existing;
    return { band, minInclusive: index * 25, maxInclusive: index * 25 + 24 };
  });
}

function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildAssessmentSlug(value: string, fallbackSlug?: string) {
  const baseSlug = slugifyValue(value);
  if (baseSlug.length > 0) return baseSlug;
  if (fallbackSlug && fallbackSlug.trim().length > 0) return fallbackSlug.trim().toLowerCase();
  return `assessment-${Date.now()}`;
}

function buildUniqueAutoKey(
  seedValue: string,
  existingKeys: string[],
  fallbackPrefix: string,
) {
  const normalizedExisting = new Set(existingKeys.map((key) => key.trim().toLowerCase()));
  const base = slugifyValue(seedValue) || fallbackPrefix;
  if (!normalizedExisting.has(base)) return base;

  let suffix = 2;
  while (normalizedExisting.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

function normalizePreviewAnswers(
  questions: AdminAssessmentQuestion[],
  selected: Record<string, string>,
) {
  return questions.reduce<PreviewAdminAssessmentAnswerInput[]>((acc, question) => {
    const selectedOptionKey = selected[question.id]?.trim();
    if (!selectedOptionKey) return acc;
    acc.push({ questionKey: question.key, selectedOptionKey });
    return acc;
  }, []);
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
      {children}
    </span>
  );
}

function EditorSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  }) {
  return (
    <SurfaceCard as="section" variant="section">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">{title}</h2>
        {action}
      </div>
      {children}
    </SurfaceCard>
  );
}

export default function AdminAssessmentEditorScreen({ assessmentId }: Props) {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const router = useRouter();

  const detailsQuery = useAdminAssessmentDetails(assessmentId);
  const categoriesQuery = useAdminAssessmentsList({ page: 1, limit: 100 });
  const metadataMutation = useUpdateAdminAssessmentMetadata();
  const scoringMutation = useUpdateAdminAssessmentScoringConfig();
  const createQuestionMutation = useCreateAdminAssessmentQuestion();
  const updateQuestionMutation = useUpdateAdminAssessmentQuestion();
  const deleteQuestionMutation = useDeleteAdminAssessmentQuestion();
  const reorderQuestionMutation = useReorderAdminAssessmentQuestions();
  const createOptionMutation = useCreateAdminAssessmentOption();
  const updateOptionMutation = useUpdateAdminAssessmentOption();
  const deleteOptionMutation = useDeleteAdminAssessmentOption();
  const reorderOptionMutation = useReorderAdminAssessmentOptions();
  const publishMutation = usePublishAdminAssessment();
  const unpublishMutation = useUnpublishAdminAssessment();
  const forkMutation = useForkAdminAssessmentDraft();
  const previewMutation = usePreviewAdminAssessmentScore();

  const item = detailsQuery.data?.item;
  const isDraft = item?.status === "DRAFT";

  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [metadata, setMetadata] = useState<{
    title: string;
    slug: string;
    category: string;
    description: string;
    introText: string;
    outroText: string;
    estimatedDurationMinutes: string;
  } | null>(null);
  const [thresholds, setThresholds] = useState<ThresholdRow[] | null>(null);
  const [questionEditor, setQuestionEditor] = useState<QuestionEditorState>(INITIAL_QUESTION_EDITOR);
  const [optionEditor, setOptionEditor] = useState<OptionEditorState>(INITIAL_OPTION_EDITOR);
  const [showQuestionDescriptionEditor, setShowQuestionDescriptionEditor] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string>("");
  const [currentStage, setCurrentStage] = useState<AuthoringStage>("setup");
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<{
    score: number;
    maxScore: number;
    band: AdminAssessmentResultBand;
    summaryPreview: string;
    nextStepsPreview: string[];
  } | null>(null);
  const [questionDeleteTarget, setQuestionDeleteTarget] = useState<AdminAssessmentQuestion | null>(
    null,
  );
  const [optionDeleteTarget, setOptionDeleteTarget] = useState<{
    question: AdminAssessmentQuestion;
    option: AdminAssessmentOption;
  } | null>(null);

  const questions = useMemo(
    () => [...(item?.questions ?? [])].sort((a, b) => a.order - b.order),
    [item?.questions],
  );
  const activeQuestion = useMemo(
    () => questions.find((question) => question.id === activeQuestionId) ?? questions[0] ?? null,
    [activeQuestionId, questions],
  );
  const previewQuestions = useMemo(
    () =>
      questions.filter((question) =>
        question.options.some((option) => option.key.trim().length > 0),
      ),
    [questions],
  );
  const nonPreviewableQuestions = useMemo(
    () =>
      questions.filter(
        (question) => !question.options.some((option) => option.key.trim().length > 0),
      ),
    [questions],
  );
  const nonPreviewableCount = questions.length - previewQuestions.length;
  const publishMissingOptionsQuestions = useMemo(
    () => questions.filter((question) => question.options.length === 0),
    [questions],
  );

  const effectiveMetadata = metadata ?? {
    title: item?.title ?? "",
    slug: item?.slug ?? "",
    category: item?.category ?? "",
    description: item?.description ?? "",
    introText: item?.introText ?? "",
    outroText: item?.outroText ?? "",
    estimatedDurationMinutes: item?.estimatedDurationMinutes?.toString() ?? "",
  };
  const effectiveThresholds = thresholds ?? buildThresholdRows(item?.scoringConfigJson?.thresholds);
  const autoSlug = buildAssessmentSlug(effectiveMetadata.title, item?.slug);
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const itemRow of categoriesQuery.data?.items ?? []) {
      const value = itemRow.category.trim();
      if (value.length > 0) categories.add(value);
    }
    const currentCategory = effectiveMetadata.category.trim();
    if (currentCategory.length > 0) categories.add(currentCategory);
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [categoriesQuery.data?.items, effectiveMetadata.category]);
  const publishChecklist = useMemo(
    () => [
      {
        key: "metadata" as const,
        done: effectiveMetadata.title.trim().length > 0 && effectiveMetadata.category.trim().length > 0,
      },
      { key: "questions" as const, done: questions.length > 0 },
      {
        key: "options" as const,
        done: questions.length > 0 && questions.every((question) => question.options.length > 0),
      },
      {
        key: "scoring" as const,
        done:
          effectiveThresholds.length > 0 &&
          effectiveThresholds.every((row) => row.minInclusive <= row.maxInclusive),
      },
    ],
    [effectiveMetadata.category, effectiveMetadata.title, effectiveThresholds, questions],
  );

  const setError = (error: unknown) =>
    setFeedback({
      tone: "error",
      message: t(getAdminAssessmentsErrorKey(error) as Parameters<typeof t>[0]),
    });

  const stageOrder: AuthoringStage[] = ["setup", "questions", "scoring", "preview"];
  const stageIndex = stageOrder.indexOf(currentStage);

  const resetQuestionEditor = () => {
    setQuestionEditor(INITIAL_QUESTION_EDITOR);
    setShowQuestionDescriptionEditor(false);
  };
  const resetOptionEditor = () => setOptionEditor(INITIAL_OPTION_EDITOR);

  const startEditQuestion = (question: AdminAssessmentQuestion) => {
    setActiveQuestionId(question.id);
    setQuestionEditor({
      id: question.id,
      key: question.key,
      prompt: question.prompt,
      description: question.description ?? "",
      isRequired: question.isRequired,
    });
    setShowQuestionDescriptionEditor(Boolean(question.description?.trim()));
  };

  const startEditOption = (questionId: string, option: AdminAssessmentOption) => {
    setActiveQuestionId(questionId);
    setOptionEditor({
      questionId,
      optionId: option.id,
      key: option.key,
      label: option.label,
      scoreValue: option.scoreValue.toString(),
    });
  };

  const saveMetadata = async () => {
    if (!item) return;
    if (!effectiveMetadata.title.trim() || !effectiveMetadata.category.trim()) {
      setFeedback({
        tone: "error",
        message: t("assessmentsAdmin.feedback.validation"),
      });
      return;
    }
    try {
      await metadataMutation.mutateAsync({
        id: item.id,
        data: {
          title: effectiveMetadata.title.trim(),
          slug: autoSlug,
          category: effectiveMetadata.category.trim(),
          description: effectiveMetadata.description.trim() || undefined,
          introText: effectiveMetadata.introText.trim() || undefined,
          outroText: effectiveMetadata.outroText.trim() || undefined,
          estimatedDurationMinutes: effectiveMetadata.estimatedDurationMinutes.trim()
            ? Number.parseInt(effectiveMetadata.estimatedDurationMinutes, 10)
            : null,
        },
      });
      setFeedback({ tone: "success", message: t("assessmentsAdmin.feedback.metadataSaved") });
    } catch (error) {
      setError(error);
    }
  };

  const saveScoring = async () => {
    if (!item) return;
    try {
      await scoringMutation.mutateAsync({
        id: item.id,
        data: { thresholds: effectiveThresholds },
      });
      setFeedback({ tone: "success", message: t("assessmentsAdmin.feedback.scoringSaved") });
    } catch (error) {
      setError(error);
    }
  };

  const saveQuestion = async () => {
    if (!item) return;
    if (!questionEditor.prompt.trim()) {
      setFeedback({
        tone: "error",
        message: t("assessmentsAdmin.feedback.validation"),
      });
      return;
    }
    const normalizedQuestionKey = questionEditor.id
      ? questionEditor.key.trim().toLowerCase()
      : buildUniqueAutoKey(
          questionEditor.prompt,
          questions.map((question) => question.key),
          "question",
        );
    try {
      if (!questionEditor.id) {
        await createQuestionMutation.mutateAsync({
          assessmentId: item.id,
          data: {
            key: normalizedQuestionKey,
            prompt: questionEditor.prompt.trim(),
            description: questionEditor.description.trim() || undefined,
            isRequired: questionEditor.isRequired,
          },
        });
        setFeedback({ tone: "success", message: t("assessmentsAdmin.feedback.questionCreated") });
      } else {
        await updateQuestionMutation.mutateAsync({
          assessmentId: item.id,
          questionId: questionEditor.id,
          data: {
            key: normalizedQuestionKey,
            prompt: questionEditor.prompt.trim(),
            description: questionEditor.description.trim() || null,
            isRequired: questionEditor.isRequired,
          },
        });
        setFeedback({ tone: "success", message: t("assessmentsAdmin.feedback.questionUpdated") });
      }
      resetQuestionEditor();
    } catch (error) {
      setError(error);
    }
  };

  const moveQuestion = async (questionId: string, direction: "up" | "down") => {
    if (!item) return;
    const ids = questions.map((question) => question.id);
    const currentIndex = ids.findIndex((id) => id === questionId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    [ids[currentIndex], ids[targetIndex]] = [ids[targetIndex], ids[currentIndex]];
    try {
      await reorderQuestionMutation.mutateAsync({
        assessmentId: item.id,
        data: { questionIds: ids },
      });
    } catch (error) {
      setError(error);
    }
  };

  const saveOption = async () => {
    if (!item || !optionEditor.questionId) return;
    if (!optionEditor.label.trim()) {
      setFeedback({
        tone: "error",
        message: t("assessmentsAdmin.feedback.validation"),
      });
      return;
    }
    const optionScope =
      questions.find((question) => question.id === optionEditor.questionId)?.options ?? [];
    const normalizedOptionKey = optionEditor.optionId
      ? optionEditor.key.trim().toLowerCase()
      : buildUniqueAutoKey(
          optionEditor.label,
          optionScope.map((option) => option.key),
          "option",
        );
    try {
      if (!optionEditor.optionId) {
        await createOptionMutation.mutateAsync({
          assessmentId: item.id,
          questionId: optionEditor.questionId,
          data: {
            key: normalizedOptionKey,
            label: optionEditor.label.trim(),
            scoreValue: Number.parseInt(optionEditor.scoreValue, 10),
          },
        });
        setFeedback({ tone: "success", message: t("assessmentsAdmin.feedback.optionCreated") });
      } else {
        await updateOptionMutation.mutateAsync({
          assessmentId: item.id,
          questionId: optionEditor.questionId,
          optionId: optionEditor.optionId,
          data: {
            key: normalizedOptionKey,
            label: optionEditor.label.trim(),
            scoreValue: Number.parseInt(optionEditor.scoreValue, 10),
          },
        });
        setFeedback({ tone: "success", message: t("assessmentsAdmin.feedback.optionUpdated") });
      }
      resetOptionEditor();
    } catch (error) {
      setError(error);
    }
  };

  const moveOption = async (
    question: AdminAssessmentQuestion,
    optionId: string,
    direction: "up" | "down",
  ) => {
    if (!item) return;
    const ids = [...question.options]
      .sort((a, b) => a.order - b.order)
      .map((option) => option.id);
    const currentIndex = ids.findIndex((id) => id === optionId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    [ids[currentIndex], ids[targetIndex]] = [ids[targetIndex], ids[currentIndex]];
    try {
      await reorderOptionMutation.mutateAsync({
        assessmentId: item.id,
        questionId: question.id,
        data: { optionIds: ids },
      });
    } catch (error) {
      setError(error);
    }
  };

  const runPreview = async () => {
    if (!item) return;
    try {
      const result = await previewMutation.mutateAsync({
        id: item.id,
        data: { answers: normalizePreviewAnswers(previewQuestions, previewAnswers) },
      });
      setPreviewResult(result);
    } catch (error) {
      setError(error);
    }
  };

  if (detailsQuery.isLoading) {
    return (
      <div className="app-panel rounded-[28px] p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (detailsQuery.isError || !item) {
    return (
      <div className="app-panel rounded-[28px] p-6">
        <p className="text-sm text-text-secondary">{t("assessmentsAdmin.states.error.note")}</p>
        <Button className="mt-4" variant="outline" onClick={() => detailsQuery.refetch()}>
          {t("assessmentsAdmin.states.error.retry")}
        </Button>
      </div>
    );
  }

  const orderedOptions = activeQuestion
    ? [...activeQuestion.options].sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[30px] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin/assessments"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary"
            >
              <DirectionalArrowIcon direction="back" className="h-4 w-4" />
              {t("assessmentsAdmin.actions.backToList")}
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95">
              {item.title}
            </h1>
            <p className="mt-1 font-mono text-xs text-text-muted">{item.slug}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                ADMIN_ASSESSMENT_STATUS_STYLES[item.status]
              }`}
            >
              {t(`assessmentsAdmin.statuses.${item.status}` as Parameters<typeof t>[0])}
            </span>
            <span className="app-chip rounded-full px-2.5 py-1 text-xs font-medium">
              {t("assessmentsAdmin.table.version")}: {item.version}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.status === "DRAFT" ? (
            <Button
              onClick={async () => {
                if (publishMissingOptionsQuestions.length > 0) {
                  const questionNames = publishMissingOptionsQuestions
                    .map((question) => question.prompt.trim() || question.key)
                    .join("، ");
                  setCurrentStage("questions");
                  setFeedback({
                    tone: "error",
                    message: t("assessmentsAdmin.feedback.publishMissingOptions", {
                      questions: questionNames,
                    }),
                  });
                  return;
                }
                try {
                  await publishMutation.mutateAsync(item.id);
                  setFeedback({
                    tone: "success",
                    message: t("assessmentsAdmin.feedback.published"),
                  });
                } catch (error) {
                  setError(error);
                }
              }}
              disabled={publishMutation.isPending}
            >
              {t("assessmentsAdmin.actions.publish")}
            </Button>
          ) : null}

          {item.status === "ACTIVE" && item.isPublished ? (
            <>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await unpublishMutation.mutateAsync(item.id);
                    setFeedback({
                      tone: "success",
                      message: t("assessmentsAdmin.feedback.unpublished"),
                    });
                  } catch (error) {
                    setError(error);
                  }
                }}
                disabled={unpublishMutation.isPending}
              >
                {t("assessmentsAdmin.actions.unpublish")}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const result = await forkMutation.mutateAsync(item.id);
                    router.push(`/admin/assessments/${result.item.id}` as never);
                  } catch (error) {
                    setError(error);
                  }
                }}
                disabled={forkMutation.isPending}
              >
                {t("assessmentsAdmin.actions.forkDraft")}
              </Button>
            </>
          ) : null}

        </div>
        {item.status === "DRAFT" ? (
          <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary/50 p-3">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("assessmentsAdmin.publishChecklist.title")}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {publishChecklist.map((entry) => (
                <div
                  key={entry.key}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    entry.done
                      ? "border-success-200 bg-success-50 text-success-800"
                      : "border-warning-200 bg-warning-50 text-warning-800"
                  }`}
                >
                  <span className="font-semibold">{entry.done ? "✓" : "!"}</span>{" "}
                  {t(`assessmentsAdmin.publishChecklist.${entry.key}` as Parameters<typeof t>[0])}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-primary/20 bg-primary-light text-text-brand"
              : "border-error-200 bg-error-50 text-error-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {!isDraft ? (
        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          {t("assessmentsAdmin.editor.readOnlyNotice")}
        </div>
      ) : null}

      <section className="app-panel rounded-[24px] p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={currentStage === "setup" ? "primary" : "outline"}
            size="sm"
            onClick={() => setCurrentStage("setup")}
          >
            {t("assessmentsAdmin.sections.metadata")}
          </Button>
          <Button
            variant={currentStage === "questions" ? "primary" : "outline"}
            size="sm"
            onClick={() => setCurrentStage("questions")}
          >
            {t("assessmentsAdmin.sections.questions")}
          </Button>
          <Button
            variant={currentStage === "scoring" ? "primary" : "outline"}
            size="sm"
            onClick={() => setCurrentStage("scoring")}
          >
            {t("assessmentsAdmin.sections.scoring")}
          </Button>
          <Button
            variant={currentStage === "preview" ? "primary" : "outline"}
            size="sm"
            onClick={() => setCurrentStage("preview")}
          >
            {t("assessmentsAdmin.sections.preview")}
          </Button>
        </div>
        <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary/50 p-3">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("assessmentsAdmin.workflow.guideTitle")}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {stageOrder.map((stage, index) => {
              const isActive = currentStage === stage;
              const isCompleted = stageIndex > index;
              return (
                <div
                  key={stage}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    isActive
                      ? "border-primary/30 bg-primary-light text-text-brand"
                      : isCompleted
                        ? "border-success-200 bg-success-50 text-success-800"
                        : "border-border-light bg-surface"
                  }`}
                >
                  <p className="text-xs font-semibold text-text-muted">#{index + 1}</p>
                  <p className="mt-1 font-medium">
                    {stage === "setup"
                      ? t("assessmentsAdmin.workflow.steps.setup")
                      : stage === "questions"
                        ? t("assessmentsAdmin.workflow.steps.questions")
                        : stage === "scoring"
                          ? t("assessmentsAdmin.workflow.steps.scoring")
                          : t("assessmentsAdmin.workflow.steps.preview")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3 text-sm text-text-secondary">
          {currentStage === "setup"
            ? t("assessmentsAdmin.workflow.setupHint")
            : currentStage === "questions"
              ? t("assessmentsAdmin.workflow.questionsHint")
              : currentStage === "scoring"
                ? t("assessmentsAdmin.workflow.scoringHint")
                : t("assessmentsAdmin.workflow.previewHint")}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={stageIndex <= 0}
            onClick={() => setCurrentStage(stageOrder[Math.max(0, stageIndex - 1)])}
          >
            {t("assessmentsAdmin.actions.previousStage")}
          </Button>
          <Button
            disabled={stageIndex >= stageOrder.length - 1}
            onClick={() => setCurrentStage(stageOrder[Math.min(stageOrder.length - 1, stageIndex + 1)])}
          >
            {t("assessmentsAdmin.actions.nextStage")}
          </Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {currentStage === "setup" ? (
            <EditorSection
              title={t("assessmentsAdmin.sections.metadata")}
              action={
                <Button
                  variant="outline"
                  onClick={saveMetadata}
                  disabled={!isDraft || metadataMutation.isPending}
                >
                  {t("assessmentsAdmin.actions.saveMetadata")}
                </Button>
              }
            >
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <FieldLabel>{t("assessmentsAdmin.form.title")}</FieldLabel>
                <input
                  className="app-control w-full px-4 py-3"
                  value={effectiveMetadata.title}
                  disabled={!isDraft}
                  onChange={(event) =>
                    setMetadata((current) => ({
                      ...(current ?? effectiveMetadata),
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <FieldLabel>{t("assessmentsAdmin.form.category")}</FieldLabel>
                <select
                  className="app-control w-full px-4 py-3"
                  value={effectiveMetadata.category}
                  disabled={!isDraft}
                  onChange={(event) =>
                    setMetadata((current) => ({
                      ...(current ?? effectiveMetadata),
                      category: event.target.value,
                    }))
                  }
                >
                  <option value="">{t("assessmentsAdmin.form.categoryPlaceholder")}</option>
                  {availableCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <FieldLabel>{t("assessmentsAdmin.form.estimatedDuration")}</FieldLabel>
                <input
                  className="app-control w-full px-4 py-3"
                  type="number"
                  min={1}
                  max={180}
                  value={effectiveMetadata.estimatedDurationMinutes}
                  disabled={!isDraft}
                  onChange={(event) =>
                    setMetadata((current) => ({
                      ...(current ?? effectiveMetadata),
                      estimatedDurationMinutes: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="md:col-span-2">
                <p className="text-xs text-text-muted">
                  {t("assessmentsAdmin.form.slugAutoLine", { slug: autoSlug || "-" })}
                </p>
              </div>

              <div className="md:col-span-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedSetup((current) => !current)}
                  disabled={!isDraft}
                >
                  {showAdvancedSetup
                    ? t("assessmentsAdmin.actions.hideAdvancedFields")
                    : t("assessmentsAdmin.actions.showAdvancedFields")}
                </Button>
              </div>

              {showAdvancedSetup ? (
                <>
                  <label className="md:col-span-2">
                    <FieldLabel>{t("assessmentsAdmin.form.description")}</FieldLabel>
                    <textarea
                      className="app-control w-full px-4 py-3"
                      rows={2}
                      value={effectiveMetadata.description}
                      disabled={!isDraft}
                      onChange={(event) =>
                        setMetadata((current) => ({
                          ...(current ?? effectiveMetadata),
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="md:col-span-2">
                    <FieldLabel>{t("assessmentsAdmin.form.introText")}</FieldLabel>
                    <textarea
                      className="app-control w-full px-4 py-3"
                      rows={2}
                      value={effectiveMetadata.introText}
                      disabled={!isDraft}
                      onChange={(event) =>
                        setMetadata((current) => ({
                          ...(current ?? effectiveMetadata),
                          introText: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="md:col-span-2">
                    <FieldLabel>{t("assessmentsAdmin.form.outroText")}</FieldLabel>
                    <textarea
                      className="app-control w-full px-4 py-3"
                      rows={2}
                      value={effectiveMetadata.outroText}
                      disabled={!isDraft}
                      onChange={(event) =>
                        setMetadata((current) => ({
                          ...(current ?? effectiveMetadata),
                          outroText: event.target.value,
                        }))
                      }
                    />
                  </label>
                </>
              ) : null}
            </div>
            </EditorSection>
          ) : null}

          {currentStage === "scoring" ? (
            <EditorSection
              title={t("assessmentsAdmin.sections.scoring")}
              action={
                <Button
                  variant="outline"
                  onClick={saveScoring}
                  disabled={!isDraft || scoringMutation.isPending}
                >
                  {t("assessmentsAdmin.actions.saveScoring")}
                </Button>
              }
            >
            <div className="grid gap-4 sm:grid-cols-2">
              {effectiveThresholds.map((row, index) => (
                <div key={row.band} className="rounded-2xl border border-border-light p-4">
                  <p className="text-sm font-semibold">
                    {t(`assessmentsAdmin.bands.${row.band}` as Parameters<typeof t>[0])}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label>
                      <FieldLabel>{t("assessmentsAdmin.scoring.minInclusive")}</FieldLabel>
                      <input
                        className="app-control w-full px-3 py-2"
                        type="number"
                        value={row.minInclusive}
                        disabled={!isDraft}
                        onChange={(event) =>
                          setThresholds((current) =>
                            (current ?? effectiveThresholds).map((item, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...item,
                                    minInclusive: Number.parseInt(event.target.value, 10) || 0,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      <FieldLabel>{t("assessmentsAdmin.scoring.maxInclusive")}</FieldLabel>
                      <input
                        className="app-control w-full px-3 py-2"
                        type="number"
                        value={row.maxInclusive}
                        disabled={!isDraft}
                        onChange={(event) =>
                          setThresholds((current) =>
                            (current ?? effectiveThresholds).map((item, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...item,
                                    maxInclusive: Number.parseInt(event.target.value, 10) || 0,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            </EditorSection>
          ) : null}

          {currentStage === "questions" ? (
            <EditorSection
              title={t("assessmentsAdmin.sections.questions")}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    resetQuestionEditor();
                    resetOptionEditor();
                    setActiveQuestionId("");
                  }}
                  disabled={!isDraft}
                  startIcon={<Plus className="h-4 w-4" />}
                >
                  {t("assessmentsAdmin.actions.addQuestion")}
                </Button>
              }
            >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                {questions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border-light p-4 text-sm text-text-secondary">
                    {t("assessmentsAdmin.states.noQuestions")}
                  </div>
                ) : null}

                {questions.map((question, index) => (
                  <article
                    key={question.id}
                    className={`rounded-2xl border p-4 transition ${
                      activeQuestion?.id === question.id
                        ? "border-primary/35 bg-primary-light"
                        : "border-border-light bg-surface-primary"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveQuestionId(question.id)}
                        className="text-start"
                      >
                        <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                          {question.prompt}
                        </p>
                        <p className="mt-1 font-mono text-xs text-text-muted">{question.key}</p>
                      </button>

                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveQuestion(question.id, "up")}
                          disabled={!isDraft || index === 0 || reorderQuestionMutation.isPending}
                          className="min-w-10 px-3"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveQuestion(question.id, "down")}
                          disabled={
                            !isDraft ||
                            index === questions.length - 1 ||
                            reorderQuestionMutation.isPending
                          }
                          className="min-w-10 px-3"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditQuestion(question)}
                          disabled={!isDraft}
                          startIcon={<Pencil className="h-4 w-4" />}
                        >
                          {t("assessmentsAdmin.actions.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setQuestionDeleteTarget(question)}
                          disabled={!isDraft}
                          startIcon={<Trash2 className="h-4 w-4" />}
                        >
                          {t("assessmentsAdmin.actions.delete")}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="app-chip rounded-full px-2.5 py-1 text-xs">
                        {t("assessmentsAdmin.questions.order")}: {question.order + 1}
                      </span>
                      <span className="app-chip rounded-full px-2.5 py-1 text-xs">
                        {question.isRequired
                          ? t("assessmentsAdmin.questions.required")
                          : t("assessmentsAdmin.questions.optional")}
                      </span>
                      <span className="app-chip rounded-full px-2.5 py-1 text-xs">
                        {t("assessmentsAdmin.options.heading")}: {question.options.length}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border-light p-4">
                  <p className="mb-3 text-sm font-semibold text-text-primary dark:text-white/95">
                    {questionEditor.id
                      ? t("assessmentsAdmin.questionModal.editTitle")
                      : t("assessmentsAdmin.questionModal.createTitle")}
                  </p>
                  <div className="grid gap-3">
                    <label>
                      <FieldLabel>{t("assessmentsAdmin.questions.prompt")}</FieldLabel>
                      <textarea
                        className="app-control w-full px-3 py-2"
                        rows={2}
                        value={questionEditor.prompt}
                        onChange={(event) =>
                          setQuestionEditor((current) => ({
                            ...current,
                            prompt: event.target.value,
                          }))
                        }
                        disabled={!isDraft}
                      />
                    </label>
                    {showQuestionDescriptionEditor ? (
                      <label>
                        <FieldLabel>{t("assessmentsAdmin.questions.description")}</FieldLabel>
                        <textarea
                          className="app-control w-full px-3 py-2"
                          rows={2}
                          value={questionEditor.description}
                          onChange={(event) =>
                            setQuestionEditor((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          disabled={!isDraft}
                        />
                      </label>
                    ) : null}
                    {!questionEditor.id ? (
                      <p className="text-xs text-text-muted">{t("assessmentsAdmin.questions.autoKeyHint")}</p>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!isDraft}
                      onClick={() => setShowQuestionDescriptionEditor((current) => !current)}
                    >
                      {showQuestionDescriptionEditor
                        ? t("assessmentsAdmin.questions.hideDescription")
                        : t("assessmentsAdmin.questions.addDescription")}
                    </Button>
                    <label className="inline-flex items-center gap-2 text-sm text-text-primary">
                      <input
                        type="checkbox"
                        checked={questionEditor.isRequired}
                        onChange={(event) =>
                          setQuestionEditor((current) => ({
                            ...current,
                            isRequired: event.target.checked,
                          }))
                        }
                        disabled={!isDraft}
                      />
                      {t("assessmentsAdmin.questions.required")}
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      onClick={saveQuestion}
                      disabled={
                        !isDraft ||
                        createQuestionMutation.isPending ||
                        updateQuestionMutation.isPending
                      }
                    >
                      {t("assessmentsAdmin.actions.save")}
                    </Button>
                    <Button variant="outline" onClick={resetQuestionEditor}>
                      {t("assessmentsAdmin.actions.cancel")}
                    </Button>
                  </div>
                </div>

                {activeQuestion ? (
                  <div className="rounded-2xl border border-border-light p-4">
                    <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("assessmentsAdmin.options.heading")}
                    </p>

                    <div className="mt-3 space-y-2">
                      {orderedOptions.map((option, index) => (
                        <div
                          key={option.id}
                          className="rounded-xl border border-border-light px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm text-text-primary dark:text-white/95">
                                {option.label}
                              </p>
                              <p className="font-mono text-xs text-text-muted">
                                {option.key} - {option.scoreValue}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveOption(activeQuestion, option.id, "up")}
                                disabled={!isDraft || index === 0 || reorderOptionMutation.isPending}
                                className="min-w-10 px-3"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveOption(activeQuestion, option.id, "down")}
                                disabled={
                                  !isDraft ||
                                  index === orderedOptions.length - 1 ||
                                  reorderOptionMutation.isPending
                                }
                                className="min-w-10 px-3"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditOption(activeQuestion.id, option)}
                                disabled={!isDraft}
                                startIcon={<Pencil className="h-4 w-4" />}
                              >
                                {t("assessmentsAdmin.actions.edit")}
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => setOptionDeleteTarget({ question: activeQuestion, option })}
                                disabled={!isDraft}
                                startIcon={<Trash2 className="h-4 w-4" />}
                              >
                                {t("assessmentsAdmin.actions.delete")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <label>
                        <FieldLabel>{t("assessmentsAdmin.options.label")}</FieldLabel>
                        <input
                          className="app-control w-full px-3 py-2"
                          value={
                            optionEditor.questionId === activeQuestion.id ? optionEditor.label : ""
                          }
                          onChange={(event) =>
                            setOptionEditor((current) => ({
                              ...current,
                              questionId: activeQuestion.id,
                              label: event.target.value,
                            }))
                          }
                          disabled={!isDraft}
                        />
                      </label>
                      <label>
                        <FieldLabel>{t("assessmentsAdmin.options.scoreValue")}</FieldLabel>
                        <input
                          className="app-control w-full px-3 py-2"
                          type="number"
                          min={0}
                          max={1000}
                          value={
                            optionEditor.questionId === activeQuestion.id
                              ? optionEditor.scoreValue
                              : "0"
                          }
                          onChange={(event) =>
                            setOptionEditor((current) => ({
                              ...current,
                              questionId: activeQuestion.id,
                              scoreValue: event.target.value,
                            }))
                          }
                          disabled={!isDraft}
                        />
                      </label>
                      <div className="md:col-span-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-text-muted">
                          {t("assessmentsAdmin.options.quickScores")}
                        </span>
                        {[0, 1, 2, 3].map((score) => (
                          <Button
                            key={score}
                            size="sm"
                            variant="outline"
                            disabled={!isDraft}
                            onClick={() =>
                              setOptionEditor((current) => ({
                                ...current,
                                questionId: activeQuestion.id,
                                scoreValue: String(score),
                              }))
                            }
                          >
                            {score}
                          </Button>
                        ))}
                      </div>
                      {!(optionEditor.questionId === activeQuestion.id && optionEditor.optionId) ? (
                        <p className="md:col-span-3 text-xs text-text-muted">
                          {t("assessmentsAdmin.options.autoKeyHint")}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={saveOption}
                        disabled={
                          !isDraft ||
                          optionEditor.questionId !== activeQuestion.id ||
                          createOptionMutation.isPending ||
                          updateOptionMutation.isPending
                        }
                      >
                        {t("assessmentsAdmin.actions.save")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={resetOptionEditor}>
                        {t("assessmentsAdmin.actions.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            </EditorSection>
          ) : null}

          {currentStage === "preview" ? (
            <EditorSection
              title={t("assessmentsAdmin.sections.preview")}
              action={
                <Button
                  variant="outline"
                  onClick={runPreview}
                  disabled={previewMutation.isPending || previewQuestions.length === 0}
                >
                  {previewMutation.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("assessmentsAdmin.actions.previewScore")}
                    </span>
                  ) : (
                    t("assessmentsAdmin.actions.previewScore")
                  )}
                </Button>
              }
            >
              <p className="mb-4 text-sm text-text-secondary">{t("assessmentsAdmin.preview.note")}</p>
              {nonPreviewableCount > 0 ? (
                <div className="mb-4 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
                  {t("assessmentsAdmin.preview.missingOptions", { count: nonPreviewableCount })}
                  <p className="mt-2 text-xs font-semibold">
                    {t("assessmentsAdmin.preview.missingOptionsListLabel")}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 ps-5 text-xs">
                    {nonPreviewableQuestions.map((question) => (
                      <li key={question.id}>{question.prompt}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                {previewQuestions.map((question) => (
                  <label key={question.id} className="block">
                    <FieldLabel>{question.prompt}</FieldLabel>
                    <select
                      value={previewAnswers[question.id] ?? ""}
                      onChange={(event) =>
                        setPreviewAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }))
                      }
                      className="app-control w-full px-4 py-3"
                    >
                      <option value="">{t("assessmentsAdmin.preview.chooseOption")}</option>
                      {[...question.options]
                        .filter((option) => option.key.trim().length > 0)
                        .sort((a, b) => a.order - b.order)
                        .map((option) => (
                          <option key={option.id} value={option.key}>
                            {option.label || option.key}
                          </option>
                        ))}
                    </select>
                  </label>
                ))}
              </div>

              {previewQuestions.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-border-light px-4 py-3 text-sm text-text-secondary">
                  {t("assessmentsAdmin.preview.empty")}
                </div>
              ) : null}

              {previewResult ? (
                <div className="mt-4 rounded-2xl border border-border-light px-4 py-3 text-sm">
                  <p>
                    {t("assessmentsAdmin.preview.scoreLine", {
                      score: previewResult.score,
                      max: previewResult.maxScore,
                    })}
                  </p>
                  <p>
                    {t("assessmentsAdmin.preview.bandLine", {
                      band: t(`assessmentsAdmin.bands.${previewResult.band}` as Parameters<typeof t>[0]),
                    })}
                  </p>
                  <p className="mt-2 text-text-secondary">{previewResult.summaryPreview}</p>
                </div>
              ) : null}
            </EditorSection>
          ) : null}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <EditorSection title={t("assessmentsAdmin.table.updatedAt")}>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>
                {t("assessmentsAdmin.table.createdAt")}:{" "}
                {new Date(item.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
              </p>
              <p>
                {t("assessmentsAdmin.editor.updatedAt", {
                  value: new Date(item.updatedAt).toLocaleDateString(
                    locale === "ar" ? "ar-SA" : "en-US",
                  ),
                })}
              </p>
            </div>
          </EditorSection>
        </aside>
      </div>

      <DestructiveConfirmModal
        isOpen={Boolean(questionDeleteTarget)}
        onClose={() => setQuestionDeleteTarget(null)}
        title={t("assessmentsAdmin.deleteQuestionModal.title")}
        description={t("assessmentsAdmin.deleteQuestionModal.note")}
        confirmLabel={
          deleteQuestionMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("assessmentsAdmin.actions.delete")
          )
        }
        cancelLabel={t("assessmentsAdmin.actions.cancel")}
        onConfirm={async () => {
          if (!item || !questionDeleteTarget) return;
          try {
            await deleteQuestionMutation.mutateAsync({
              assessmentId: item.id,
              questionId: questionDeleteTarget.id,
            });
            setQuestionDeleteTarget(null);
            if (activeQuestionId === questionDeleteTarget.id) setActiveQuestionId("");
            setFeedback({ tone: "success", message: t("assessmentsAdmin.feedback.questionDeleted") });
          } catch (error) {
            setError(error);
          }
        }}
      />

      <DestructiveConfirmModal
        isOpen={Boolean(optionDeleteTarget)}
        onClose={() => setOptionDeleteTarget(null)}
        title={t("assessmentsAdmin.deleteOptionModal.title")}
        description={t("assessmentsAdmin.deleteOptionModal.note")}
        confirmLabel={
          deleteOptionMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("assessmentsAdmin.actions.delete")
          )
        }
        cancelLabel={t("assessmentsAdmin.actions.cancel")}
        onConfirm={async () => {
          if (!item || !optionDeleteTarget) return;
          try {
            await deleteOptionMutation.mutateAsync({
              assessmentId: item.id,
              questionId: optionDeleteTarget.question.id,
              optionId: optionDeleteTarget.option.id,
            });
            setOptionDeleteTarget(null);
            setFeedback({ tone: "success", message: t("assessmentsAdmin.feedback.optionDeleted") });
          } catch (error) {
            setError(error);
          }
        }}
      />
    </div>
  );
}
