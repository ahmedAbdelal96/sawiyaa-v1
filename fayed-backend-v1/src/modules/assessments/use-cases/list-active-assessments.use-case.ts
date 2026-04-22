import { Injectable } from '@nestjs/common';
import { AssessmentDefinitionRepository } from '../repositories/assessment-definition.repository';
import { AssessmentPresenter } from '../presenters/assessment.presenter';

@Injectable()
export class ListActiveAssessmentsUseCase {
  constructor(
    private readonly assessmentDefinitionRepository: AssessmentDefinitionRepository,
    private readonly assessmentPresenter: AssessmentPresenter,
  ) {}

  async execute() {
    const definitions =
      await this.assessmentDefinitionRepository.listPublishedActive();

    return {
      items: definitions.map((definition) =>
        this.assessmentPresenter.presentDefinitionListItem(definition),
      ),
    };
  }
}
