import { BadRequestException } from '@nestjs/common';
import {
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
} from '@prisma/client';
import { ModerationPresenter } from '../presenters/moderation.presenter';
import { ModerationRepository } from '../repositories/moderation.repository';
import { ListModerationCasesUseCase } from './list-moderation-cases.use-case';

describe('ListModerationCasesUseCase', () => {
  const moderationRepository = {
    listCases: jest.fn(),
  } as unknown as ModerationRepository;
  const moderationPresenter = {
    presentQueue: jest.fn(),
  } as unknown as ModerationPresenter;

  const useCase = new ListModerationCasesUseCase(
    moderationRepository,
    moderationPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists moderation queue with filters and pagination', async () => {
    const now = new Date('2026-03-31T19:00:00.000Z');
    (moderationRepository.listCases as jest.Mock).mockResolvedValue([
      [
        {
          id: 'report_1',
          targetType: ModerationReportTargetType.REVIEW,
          targetId: 'review_1',
          reason: ModerationReportReason.ABUSE,
          status: ModerationCaseStatus.OPEN,
          reportedByRole: ModerationReporterRole.PATIENT,
          createdAt: now,
          targetSnapshot: null,
        },
      ],
      1,
    ]);
    (moderationPresenter.presentQueue as jest.Mock).mockReturnValue({
      items: [{ id: 'report_1' }],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    const result = await useCase.execute({
      query: {
        page: 1,
        limit: 20,
        status: ModerationCaseStatus.OPEN,
        targetType: ModerationReportTargetType.REVIEW,
        reporterRole: ModerationReporterRole.PATIENT,
        reason: ModerationReportReason.ABUSE,
        createdFrom: '2026-03-30T00:00:00.000Z',
        createdTo: '2026-03-31T23:59:59.000Z',
        sortBy: 'CREATED_AT',
        sortOrder: 'DESC',
        query: 'review_1',
      },
    });

    expect(moderationRepository.listCases).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: ModerationCaseStatus.OPEN,
      targetType: ModerationReportTargetType.REVIEW,
      reporterRole: ModerationReporterRole.PATIENT,
      reason: ModerationReportReason.ABUSE,
      createdFrom: new Date('2026-03-30T00:00:00.000Z'),
      createdTo: new Date('2026-03-31T23:59:59.000Z'),
      sortBy: 'CREATED_AT',
      sortOrder: 'DESC',
      query: 'review_1',
    });
    expect(result).toEqual({
      items: [{ id: 'report_1' }],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
      filters: {
        sortBy: 'CREATED_AT',
        sortOrder: 'DESC',
        status: ModerationCaseStatus.OPEN,
        targetType: ModerationReportTargetType.REVIEW,
        reporterRole: ModerationReporterRole.PATIENT,
        reason: ModerationReportReason.ABUSE,
        createdFrom: '2026-03-30T00:00:00.000Z',
        createdTo: '2026-03-31T23:59:59.000Z',
        query: 'review_1',
      },
    });
  });

  it('rejects invalid created date range with machine-readable filter semantics', async () => {
    await expect(
      useCase.execute({
        query: {
          page: 1,
          limit: 20,
          createdFrom: '2026-03-31T23:59:59.000Z',
          createdTo: '2026-03-30T00:00:00.000Z',
          sortBy: 'CREATED_AT',
          sortOrder: 'DESC',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns deterministic empty state payload', async () => {
    (moderationRepository.listCases as jest.Mock).mockResolvedValue([[], 0]);
    (moderationPresenter.presentQueue as jest.Mock).mockReturnValue({
      items: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });

    const result = await useCase.execute({
      query: {
        page: 1,
        limit: 20,
        sortBy: 'CREATED_AT',
        sortOrder: 'DESC',
      },
    });

    expect(result.items).toEqual([]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 1,
    });
    expect(result.filters).toEqual({
      sortBy: 'CREATED_AT',
      sortOrder: 'DESC',
      status: null,
      targetType: null,
      reporterRole: null,
      reason: null,
      createdFrom: null,
      createdTo: null,
      query: null,
    });
  });
});
