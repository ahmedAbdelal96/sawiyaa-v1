import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';
import { AssessmentPresenter } from '../presenters/assessment.presenter';
import { AssessmentDefinitionRepository } from '../repositories/assessment-definition.repository';
import { AssessmentPatientRepository } from '../repositories/assessment-patient.repository';
import { AssessmentSubmissionRepository } from '../repositories/assessment-submission.repository';
import { BuildAssessmentNextStepService } from '../services/build-assessment-next-step.service';
import { BuildAssessmentResultSummaryService } from '../services/build-assessment-result-summary.service';
import { MapAssessmentResultBandService } from '../services/map-assessment-result-band.service';
import { ScoreAssessmentSubmissionService } from '../services/score-assessment-submission.service';
import { ValidateAssessmentSubmissionService } from '../services/validate-assessment-submission.service';

@Injectable()
export class SubmitAssessmentUseCase {
  private readonly logger = new Logger(SubmitAssessmentUseCase.name);

  constructor(
    private readonly assessmentDefinitionRepository: AssessmentDefinitionRepository,
    private readonly assessmentPatientRepository: AssessmentPatientRepository,
    private readonly assessmentSubmissionRepository: AssessmentSubmissionRepository,
    private readonly assessmentPresenter: AssessmentPresenter,
    private readonly validateAssessmentSubmissionService: ValidateAssessmentSubmissionService,
    private readonly scoreAssessmentSubmissionService: ScoreAssessmentSubmissionService,
    private readonly mapAssessmentResultBandService: MapAssessmentResultBandService,
    private readonly buildAssessmentResultSummaryService: BuildAssessmentResultSummaryService,
    private readonly buildAssessmentNextStepService: BuildAssessmentNextStepService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    slug: string;
    payload: SubmitAssessmentDto;
  }) {
    const patientProfile = await this.assessmentPatientRepository.findByUserId(input.userId);
    if (!patientProfile) {
      throw new NotFoundException({
        messageKey: 'assessments.errors.patientProfileNotFound',
        error: 'ASSESSMENT_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const definition =
      await this.assessmentDefinitionRepository.findPublishedActiveBySlug(
        input.slug.trim().toLowerCase(),
      );
    if (!definition) {
      throw new NotFoundException({
        messageKey: 'assessments.errors.definitionNotFound',
        error: 'ASSESSMENT_DEFINITION_NOT_FOUND',
      });
    }

    const questionMap = new Map(
      definition.questions.map((question) => [question.key.toLowerCase(), question]),
    );
    const requiredQuestionKeys = definition.questions
      .filter((question) => question.isRequired)
      .map((question) => question.key.toLowerCase());
    const allowedQuestionKeys = definition.questions.map((question) =>
      question.key.toLowerCase(),
    );
    const allowedOptionKeysByQuestion = definition.questions.reduce<
      Record<string, Set<string>>
    >((accumulator, question) => {
      accumulator[question.key.toLowerCase()] = new Set(
        question.options.map((option) => option.key.toLowerCase()),
      );
      return accumulator;
    }, {});

    this.validateAssessmentSubmissionService.assertValidAnswerSet({
      answers: input.payload.answers,
      requiredQuestionKeys,
      allowedQuestionKeys,
      allowedOptionKeysByQuestion,
    });

    const answerRows = input.payload.answers.map((answer) => {
      const normalizedQuestionKey = answer.questionKey.trim().toLowerCase();
      const normalizedOptionKey = answer.selectedOptionKey.trim().toLowerCase();
      const question = questionMap.get(normalizedQuestionKey)!;
      const option = question.options.find(
        (candidate) => candidate.key.toLowerCase() === normalizedOptionKey,
      )!;

      return {
        assessmentQuestionId: question.id,
        selectedOptionId: option.id,
        questionKeySnapshot: question.key,
        questionPromptSnapshot: question.prompt,
        selectedOptionKeySnapshot: option.key,
        selectedOptionLabelSnapshot: option.label,
        scoreValueSnapshot: option.scoreValue,
      };
    });

    const totalScore =
      this.scoreAssessmentSubmissionService.calculateTotalScore(
        answerRows.map((answer) => ({ scoreValue: answer.scoreValueSnapshot })),
      );
    const maxScore = this.scoreAssessmentSubmissionService.calculateMaxScore(
      definition.questions,
    );

    const band = this.mapAssessmentResultBandService.map({
      totalScore,
      maxScore,
      scoringConfigJson: definition.scoringConfigJson as Prisma.JsonValue | null,
    });
    const summary = this.buildAssessmentResultSummaryService.build({
      assessmentTitle: definition.title,
      band,
      locale: input.locale,
    });
    const nextSteps = this.buildAssessmentNextStepService.build({
      band,
      locale: input.locale,
    });

    const created = await this.assessmentSubmissionRepository.createCompleted({
      assessmentDefinitionId: definition.id,
      patientProfileId: patientProfile.id,
      definitionSlugSnapshot: definition.slug,
      definitionTitleSnapshot: definition.title,
      definitionVersionSnapshot: definition.version,
      totalScore,
      resultBand: band,
      resultSummary: summary,
      resultSummaryJson: {
        text: summary,
      } satisfies Prisma.InputJsonValue,
      nextStepsJson: {
        items: nextSteps,
      } satisfies Prisma.InputJsonValue,
      answers: answerRows,
    });

    this.logger.log(
      `Assessment submission completed (submission=${created.id}, assessment=${definition.slug}, patient=${patientProfile.id})`,
    );

    return {
      ...this.assessmentPresenter.presentSubmissionResult({
        submissionId: created.id,
        assessmentSlug: definition.slug,
        assessmentTitle: definition.title,
        score: totalScore,
        band,
        summary,
        nextSteps,
      }),
    };
  }
}
