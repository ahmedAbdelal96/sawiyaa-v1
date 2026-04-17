import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ListModerationCasesDto,
  ModerationReportsSortByDto,
  ModerationReportsSortOrderDto,
} from '../dto/list-moderation-cases.dto';
import { ModerationPresenter } from '../presenters/moderation.presenter';
import { ModerationRepository } from '../repositories/moderation.repository';
import { MODERATION_REPORTS_ERROR_CODES } from '../types/moderation.types';

@Injectable()
export class ListModerationCasesUseCase {
  constructor(
    private readonly moderationRepository: ModerationRepository,
    private readonly moderationPresenter: ModerationPresenter,
  ) {}

  async execute(input: { query: ListModerationCasesDto }) {
    const createdFrom = input.query.createdFrom
      ? new Date(input.query.createdFrom)
      : undefined;
    const createdTo = input.query.createdTo ? new Date(input.query.createdTo) : undefined;

    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException({
        messageKey: 'moderation.errors.invalidFilter',
        error: MODERATION_REPORTS_ERROR_CODES.invalidFilter,
      });
    }

    const [items, totalItems] = await this.moderationRepository.listCases({
      page: input.query.page,
      limit: input.query.limit,
      status: input.query.status,
      targetType: input.query.targetType,
      reporterRole: input.query.reporterRole,
      reason: input.query.reason,
      createdFrom,
      createdTo,
      query: input.query.query?.trim() || undefined,
      sortBy: input.query.sortBy ?? ModerationReportsSortByDto.CREATED_AT,
      sortOrder: input.query.sortOrder ?? ModerationReportsSortOrderDto.DESC,
    });

    const queue = this.moderationPresenter.presentQueue({
      items,
      pagination: {
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / input.query.limit)),
      },
    });

    return {
      ...queue,
      filters: {
        sortBy: input.query.sortBy ?? ModerationReportsSortByDto.CREATED_AT,
        sortOrder: input.query.sortOrder ?? ModerationReportsSortOrderDto.DESC,
        status: input.query.status ?? null,
        targetType: input.query.targetType ?? null,
        reporterRole: input.query.reporterRole ?? null,
        reason: input.query.reason ?? null,
        createdFrom: createdFrom?.toISOString() ?? null,
        createdTo: createdTo?.toISOString() ?? null,
        query: input.query.query?.trim() || null,
      },
    };
  }
}
