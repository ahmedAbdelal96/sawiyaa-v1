import { Injectable, NotFoundException } from '@nestjs/common';
import { ModerationPresenter } from '../presenters/moderation.presenter';
import { ModerationRepository } from '../repositories/moderation.repository';
import { MODERATION_REPORTS_ERROR_CODES } from '../types/moderation.types';

@Injectable()
export class GetModerationCaseUseCase {
  constructor(
    private readonly moderationRepository: ModerationRepository,
    private readonly moderationPresenter: ModerationPresenter,
  ) {}

  async execute(input: { reportId: string }) {
    const item = await this.moderationRepository.findCaseById(input.reportId);
    if (!item) {
      throw new NotFoundException({
        messageKey: 'moderation.errors.reportNotFoundInScope',
        error: MODERATION_REPORTS_ERROR_CODES.reportNotFoundInScope,
      });
    }

    return {
      item: this.moderationPresenter.presentCaseDetail(item),
    };
  }
}
