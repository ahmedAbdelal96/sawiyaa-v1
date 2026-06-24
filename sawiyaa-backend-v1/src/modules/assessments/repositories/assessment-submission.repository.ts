import { Injectable } from '@nestjs/common';
import {
  AssessmentResultBand,
  AssessmentSubmissionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AssessmentSubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCompleted(input: {
    assessmentDefinitionId: string;
    patientProfileId: string;
    definitionSlugSnapshot: string;
    definitionTitleSnapshot: string;
    definitionVersionSnapshot: number;
    totalScore: number;
    resultBand: AssessmentResultBand;
    resultSummary: string;
    resultSummaryJson: Prisma.InputJsonValue;
    nextStepsJson: Prisma.InputJsonValue;
    answers: Array<{
      assessmentQuestionId: string;
      selectedOptionId: string;
      questionKeySnapshot: string;
      questionPromptSnapshot: string;
      selectedOptionKeySnapshot: string;
      selectedOptionLabelSnapshot: string;
      scoreValueSnapshot: number;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const submission = await this.createSubmission(input, tx);
      await tx.assessmentResultSnapshot.create({
        data: {
          assessmentSubmissionId: submission.id,
          score: input.totalScore,
          resultBand: input.resultBand,
          summaryJson: input.resultSummaryJson,
          nextStepJson: input.nextStepsJson,
        },
      });

      return tx.assessmentSubmission.findUniqueOrThrow({
        where: { id: submission.id },
        include: {
          resultSnapshot: true,
        },
      });
    });
  }

  private createSubmission(
    input: {
      assessmentDefinitionId: string;
      patientProfileId: string;
      definitionSlugSnapshot: string;
      definitionTitleSnapshot: string;
      definitionVersionSnapshot: number;
      totalScore: number;
      resultBand: AssessmentResultBand;
      resultSummary: string;
      answers: Array<{
        assessmentQuestionId: string;
        selectedOptionId: string;
        questionKeySnapshot: string;
        questionPromptSnapshot: string;
        selectedOptionKeySnapshot: string;
        selectedOptionLabelSnapshot: string;
        scoreValueSnapshot: number;
      }>;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.assessmentSubmission.create({
      data: {
        assessmentDefinitionId: input.assessmentDefinitionId,
        patientProfileId: input.patientProfileId,
        status: AssessmentSubmissionStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        totalScore: input.totalScore,
        resultBand: input.resultBand,
        resultSummary: input.resultSummary,
        definitionSlugSnapshot: input.definitionSlugSnapshot,
        definitionTitleSnapshot: input.definitionTitleSnapshot,
        definitionVersionSnapshot: input.definitionVersionSnapshot,
        answers: {
          create: input.answers,
        },
      },
    });
  }

  listPatientSubmissions(input: {
    patientProfileId: string;
    page: number;
    limit: number;
    status?: AssessmentSubmissionStatus;
  }) {
    const where: Prisma.AssessmentSubmissionWhereInput = {
      patientProfileId: input.patientProfileId,
      ...(input.status ? { status: input.status } : {}),
    };
    const skip = (input.page - 1) * input.limit;

    return Promise.all([
      this.prisma.assessmentSubmission.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          definitionSlugSnapshot: true,
          definitionTitleSnapshot: true,
          status: true,
          totalScore: true,
          resultBand: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.assessmentSubmission.count({ where }),
    ]);
  }

  findPatientSubmissionById(input: {
    patientProfileId: string;
    submissionId: string;
  }) {
    return this.prisma.assessmentSubmission.findFirst({
      where: {
        id: input.submissionId,
        patientProfileId: input.patientProfileId,
      },
      include: {
        resultSnapshot: true,
      },
    });
  }
}
