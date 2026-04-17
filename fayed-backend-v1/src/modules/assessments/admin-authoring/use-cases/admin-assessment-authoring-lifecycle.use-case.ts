import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentDefinitionStatus,
  AssessmentResultBand,
} from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SubmitAssessmentAnswerDto } from '@modules/assessments/dto/submit-assessment.dto';
import { BuildAssessmentNextStepService } from '@modules/assessments/services/build-assessment-next-step.service';
import { BuildAssessmentResultSummaryService } from '@modules/assessments/services/build-assessment-result-summary.service';
import { MapAssessmentResultBandService } from '@modules/assessments/services/map-assessment-result-band.service';
import { ScoreAssessmentSubmissionService } from '@modules/assessments/services/score-assessment-submission.service';
import { ValidateAssessmentSubmissionService } from '@modules/assessments/services/validate-assessment-submission.service';
import { AdminAssessmentAuthoringRepository } from '../repositories/admin-assessment-authoring.repository';
import { AdminAssessmentLifecyclePolicy } from '../services/admin-assessment-lifecycle.policy';
import { AdminAssessmentPublishValidatorService } from '../services/admin-assessment-publish-validator.service';
import { AdminAssessmentScoringConfigValidatorService } from '../services/admin-assessment-scoring-config-validator.service';

@Injectable()
export class AdminAssessmentAuthoringLifecycleUseCase {
  constructor(
    private readonly repository: AdminAssessmentAuthoringRepository,
    private readonly lifecyclePolicy: AdminAssessmentLifecyclePolicy,
    private readonly publishValidator: AdminAssessmentPublishValidatorService,
    private readonly scoringConfigValidator: AdminAssessmentScoringConfigValidatorService,
    private readonly validateSubmission: ValidateAssessmentSubmissionService,
    private readonly scoreService: ScoreAssessmentSubmissionService,
    private readonly mapBandService: MapAssessmentResultBandService,
    private readonly summaryService: BuildAssessmentResultSummaryService,
    private readonly nextStepService: BuildAssessmentNextStepService,
  ) {}

  async updateScoringConfig(
    assessmentId: string,
    thresholds: Array<{
      band: AssessmentResultBand;
      minInclusive: number;
      maxInclusive: number;
    }>,
  ) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertDraftEditable(definition);

    const scoringConfigJson =
      this.scoringConfigValidator.validateAndBuildThresholdsJson(thresholds);
    const updated = await this.repository.updateDefinition(assessmentId, {
      scoringConfigJson,
    });

    return {
      success: true as const,
      data: {
        item: updated,
      },
    };
  }

  async previewScore(
    assessmentId: string,
    locale: SupportedLocale,
    answers: SubmitAssessmentAnswerDto[],
  ) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }

    const questionMap = new Map(
      definition.questions.map((question) => [
        question.key.toLowerCase(),
        question,
      ]),
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

    this.validateSubmission.assertValidAnswerSet({
      answers,
      requiredQuestionKeys,
      allowedQuestionKeys,
      allowedOptionKeysByQuestion,
    });

    const answerRows = answers.map((answer) => {
      const normalizedQuestionKey = answer.questionKey.trim().toLowerCase();
      const normalizedOptionKey = answer.selectedOptionKey.trim().toLowerCase();
      const question = questionMap.get(normalizedQuestionKey)!;
      const option = question.options.find(
        (candidate) => candidate.key.toLowerCase() === normalizedOptionKey,
      )!;

      return { scoreValue: option.scoreValue };
    });

    const score = this.scoreService.calculateTotalScore(answerRows);
    const maxScore = this.scoreService.calculateMaxScore(definition.questions);
    const band = this.mapBandService.map({
      totalScore: score,
      maxScore,
      scoringConfigJson: definition.scoringConfigJson,
    });
    const summaryPreview = this.summaryService.build({
      assessmentTitle: definition.title,
      band,
      locale,
    });
    const nextStepsPreview = this.nextStepService.build({
      band,
      locale,
    });

    return {
      success: true as const,
      data: {
        score,
        maxScore,
        band,
        summaryPreview,
        nextStepsPreview,
      },
    };
  }

  async publish(assessmentId: string) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertCanPublish(definition);
    this.publishValidator.validate({
      definition,
      questions: definition.questions,
    });

    const canonicalSlug = this.lifecyclePolicy.normalizeCanonicalSlug(
      definition.slug,
    );
    const activeBySlug = await this.repository.findBySlug(canonicalSlug);
    if (
      activeBySlug &&
      activeBySlug.id !== definition.id &&
      activeBySlug.status === AssessmentDefinitionStatus.ACTIVE &&
      activeBySlug.isPublished
    ) {
      const archiveSlug = `${canonicalSlug}-v${activeBySlug.version}`;
      const archiveSlugCollision =
        await this.repository.findBySlug(archiveSlug);
      const safeArchiveSlug = archiveSlugCollision
        ? `${archiveSlug}-${activeBySlug.id.slice(0, 8)}`
        : archiveSlug;

      await this.repository.updateDefinition(activeBySlug.id, {
        slug: safeArchiveSlug,
        status: AssessmentDefinitionStatus.INACTIVE,
        isPublished: false,
      });
    }

    if (
      definition.slug !== canonicalSlug &&
      (await this.repository.findBySlug(canonicalSlug))
    ) {
      throw new ConflictException({
        message: 'Canonical slug is already occupied.',
        error: 'ADMIN_ASSESSMENT_CANONICAL_SLUG_COLLISION',
      });
    }

    const published = await this.repository.updateDefinition(definition.id, {
      slug: canonicalSlug,
      status: AssessmentDefinitionStatus.ACTIVE,
      isPublished: true,
    });

    return {
      success: true as const,
      data: {
        item: published,
      },
    };
  }

  async unpublish(assessmentId: string) {
    const definition = await this.repository.findById(assessmentId);
    if (!definition) {
      throw new NotFoundException({
        message: 'Assessment definition not found.',
        error: 'ADMIN_ASSESSMENT_NOT_FOUND',
      });
    }
    this.lifecyclePolicy.assertCanUnpublish(definition);

    const updated = await this.repository.updateDefinition(assessmentId, {
      status: AssessmentDefinitionStatus.INACTIVE,
      isPublished: false,
    });

    return {
      success: true as const,
      data: {
        item: updated,
      },
    };
  }
}
