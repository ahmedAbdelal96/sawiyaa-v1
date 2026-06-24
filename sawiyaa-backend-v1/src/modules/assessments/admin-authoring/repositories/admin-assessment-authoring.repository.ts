import { Injectable } from '@nestjs/common';
import {
  AssessmentDefinitionStatus,
  AssessmentQuestionInputType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AdminAssessmentAuthoringRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(input: {
    page: number;
    limit: number;
    status?: AssessmentDefinitionStatus;
    isPublished?: boolean;
    search?: string;
    slug?: string;
  }) {
    const where: Prisma.AssessmentDefinitionWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(typeof input.isPublished === 'boolean'
        ? { isPublished: input.isPublished }
        : {}),
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.search
        ? {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
              { category: { contains: input.search, mode: 'insensitive' } },
              { slug: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const skip = (input.page - 1) * input.limit;
    return Promise.all([
      this.prisma.assessmentDefinition.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.prisma.assessmentDefinition.count({ where }),
    ]);
  }

  findById(id: string) {
    return this.prisma.assessmentDefinition.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.assessmentDefinition.findUnique({
      where: { slug },
    });
  }

  createDraft(input: {
    slug: string;
    title: string;
    description: string | null;
    category: string;
    introText: string | null;
    outroText: string | null;
    estimatedDurationMinutes: number | null;
    scoringConfigJson: Prisma.InputJsonValue | null;
  }) {
    return this.prisma.assessmentDefinition.create({
      data: {
        slug: input.slug,
        title: input.title,
        description: input.description,
        category: input.category,
        status: AssessmentDefinitionStatus.DRAFT,
        isPublished: false,
        version: 1,
        introText: input.introText,
        outroText: input.outroText,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        ...(input.scoringConfigJson !== null
          ? { scoringConfigJson: input.scoringConfigJson }
          : {}),
      },
    });
  }

  updateDefinition(id: string, data: Prisma.AssessmentDefinitionUpdateInput) {
    return this.prisma.assessmentDefinition.update({
      where: { id },
      data,
    });
  }

  countSubmissions(definitionId: string) {
    return this.prisma.assessmentSubmission.count({
      where: { assessmentDefinitionId: definitionId },
    });
  }

  createQuestion(input: {
    assessmentDefinitionId: string;
    key: string;
    prompt: string;
    description: string | null;
    inputType: AssessmentQuestionInputType;
    isRequired: boolean;
    order: number;
  }) {
    return this.prisma.assessmentQuestion.create({
      data: input,
    });
  }

  updateQuestion(id: string, data: Prisma.AssessmentQuestionUpdateInput) {
    return this.prisma.assessmentQuestion.update({
      where: { id },
      data,
    });
  }

  deleteQuestion(id: string) {
    return this.prisma.assessmentQuestion.delete({
      where: { id },
    });
  }

  async reorderQuestions(
    assessmentDefinitionId: string,
    questionIds: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Phase 1: move rows to a temporary non-overlapping order range.
      for (let index = 0; index < questionIds.length; index += 1) {
        const questionId = questionIds[index];
        await tx.assessmentQuestion.updateMany({
          where: { id: questionId, assessmentDefinitionId },
          data: { order: 10_000 + index },
        });
      }

      // Phase 2: apply final contiguous order values.
      for (let index = 0; index < questionIds.length; index += 1) {
        const questionId = questionIds[index];
        await tx.assessmentQuestion.updateMany({
          where: { id: questionId, assessmentDefinitionId },
          data: { order: index + 1 },
        });
      }
    });
  }

  createOption(input: {
    assessmentQuestionId: string;
    key: string;
    label: string;
    scoreValue: number;
    order: number;
  }) {
    return this.prisma.assessmentOption.create({
      data: input,
    });
  }

  updateOption(id: string, data: Prisma.AssessmentOptionUpdateInput) {
    return this.prisma.assessmentOption.update({
      where: { id },
      data,
    });
  }

  deleteOption(id: string) {
    return this.prisma.assessmentOption.delete({
      where: { id },
    });
  }

  async reorderOptions(assessmentQuestionId: string, optionIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      // Phase 1: move rows to a temporary non-overlapping order range.
      for (let index = 0; index < optionIds.length; index += 1) {
        const optionId = optionIds[index];
        await tx.assessmentOption.updateMany({
          where: { id: optionId, assessmentQuestionId },
          data: { order: 10_000 + index },
        });
      }

      // Phase 2: apply final contiguous order values.
      for (let index = 0; index < optionIds.length; index += 1) {
        const optionId = optionIds[index];
        await tx.assessmentOption.updateMany({
          where: { id: optionId, assessmentQuestionId },
          data: { order: index + 1 },
        });
      }
    });
  }
}
