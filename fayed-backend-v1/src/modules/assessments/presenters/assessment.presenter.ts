import { Injectable } from '@nestjs/common';

@Injectable()
export class AssessmentPresenter {
  presentDefinitionListItem(item: {
    slug: string;
    title: string;
    description: string | null;
    category: string;
    status: string;
    introText: string | null;
    outroText: string | null;
    estimatedDurationMinutes: number | null;
  }) {
    return {
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      introText: item.introText,
      outroText: item.outroText,
      estimatedDurationMinutes: item.estimatedDurationMinutes,
    };
  }

  presentDefinitionDetails(item: {
    slug: string;
    title: string;
    description: string | null;
    category: string;
    status: string;
    introText: string | null;
    outroText: string | null;
    estimatedDurationMinutes: number | null;
    questions: Array<{
      key: string;
      prompt: string;
      description: string | null;
      inputType: string;
      isRequired: boolean;
      options: Array<{
        key: string;
        label: string;
      }>;
    }>;
  }) {
    return {
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      introText: item.introText,
      outroText: item.outroText,
      estimatedDurationMinutes: item.estimatedDurationMinutes,
      questions: item.questions.map((question) => ({
        key: question.key,
        prompt: question.prompt,
        description: question.description,
        inputType: question.inputType,
        isRequired: question.isRequired,
        options: question.options.map((option) => ({
          key: option.key,
          label: option.label,
        })),
      })),
    };
  }

  presentSubmissionResult(input: {
    submissionId: string;
    assessmentSlug: string;
    assessmentTitle: string;
    score: number;
    band: string;
    summary: string;
    nextSteps: string[];
  }) {
    return {
      submissionId: input.submissionId,
      assessment: {
        slug: input.assessmentSlug,
        title: input.assessmentTitle,
      },
      result: {
        score: input.score,
        band: input.band,
        summary: input.summary,
        nextSteps: input.nextSteps,
      },
    };
  }

  presentPatientHistory(input: {
    items: Array<{
      id: string;
      definitionSlugSnapshot: string;
      definitionTitleSnapshot: string;
      status: string;
      totalScore: number | null;
      resultBand: string | null;
      completedAt: Date | null;
      createdAt: Date;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }) {
    return {
      items: input.items.map((item) => ({
        submissionId: item.id,
        assessmentSlug: item.definitionSlugSnapshot,
        assessmentTitle: item.definitionTitleSnapshot,
        status: item.status,
        totalScore: item.totalScore,
        resultBand: item.resultBand,
        completedAt: item.completedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: input.pagination,
    };
  }

  presentPatientSubmissionDetails(input: {
    submissionId: string;
    assessmentSlug: string;
    assessmentTitle: string;
    status: string;
    completedAt: Date | null;
    result: {
      score: number;
      band: string;
      summary: string;
      nextSteps: string[];
    } | null;
  }) {
    return {
      submissionId: input.submissionId,
      assessment: {
        slug: input.assessmentSlug,
        title: input.assessmentTitle,
      },
      status: input.status,
      completedAt: input.completedAt?.toISOString() ?? null,
      result: input.result,
    };
  }
}
