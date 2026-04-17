import { Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentDefinitionRepository } from '../repositories/assessment-definition.repository';
import { AssessmentPresenter } from '../presenters/assessment.presenter';

@Injectable()
export class GetAssessmentDefinitionUseCase {
  constructor(
    private readonly assessmentDefinitionRepository: AssessmentDefinitionRepository,
    private readonly assessmentPresenter: AssessmentPresenter,
  ) {}

  async execute(input: { slug: string }) {
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

    return {
      item: this.assessmentPresenter.presentDefinitionDetails(definition),
    };
  }
}
