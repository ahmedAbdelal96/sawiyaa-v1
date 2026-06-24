import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AppLoggerService } from '@common/logging/app-logger.service';
import {
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
} from '@prisma/client';
import { ModerationPresenter } from '../presenters/moderation.presenter';
import { ModerationRepository } from '../repositories/moderation.repository';
import { ResolveModerationReporterRoleService } from '../services/resolve-moderation-reporter-role.service';
import { CreateModerationReportUseCase } from './create-moderation-report.use-case';

describe('CreateModerationReportUseCase', () => {
  const moderationRepository = {
    findAccessibleTarget: jest.fn(),
    findRecentDuplicate: jest.fn(),
    createReportWithAudit: jest.fn(),
  } as unknown as ModerationRepository;
  const resolveModerationReporterRoleService = {
    resolve: jest.fn(),
  } as unknown as ResolveModerationReporterRoleService;
  const moderationPresenter = {
    presentReportItem: jest.fn(),
  } as unknown as ModerationPresenter;
  const logger = {
    info: jest.fn(),
  } as unknown as AppLoggerService;

  const useCase = new CreateModerationReportUseCase(
    moderationRepository,
    resolveModerationReporterRoleService,
    moderationPresenter,
    logger,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates report and audit for valid intake', async () => {
    (resolveModerationReporterRoleService.resolve as jest.Mock).mockReturnValue(
      ModerationReporterRole.PATIENT,
    );
    (moderationRepository.findAccessibleTarget as jest.Mock).mockResolvedValue({
      id: 'target_1',
    });
    (moderationRepository.findRecentDuplicate as jest.Mock).mockResolvedValue(
      null,
    );
    (moderationRepository.createReportWithAudit as jest.Mock).mockResolvedValue(
      {
        id: 'report_1',
        targetType: ModerationReportTargetType.REVIEW,
        targetId: 'review_1',
        reason: ModerationReportReason.ABUSE,
        note: 'unsafe',
        status: ModerationCaseStatus.OPEN,
        createdAt: new Date('2026-03-31T17:00:00.000Z'),
      },
    );
    (moderationPresenter.presentReportItem as jest.Mock).mockReturnValue({
      id: 'report_1',
    });

    const result = await useCase.execute({
      currentUser: {
        id: 'user_1',
        roles: [AppRole.PATIENT],
      },
      payload: {
        targetType: ModerationReportTargetType.REVIEW,
        targetId: 'review_1',
        reason: ModerationReportReason.ABUSE,
      },
    });

    expect(result.item).toEqual({ id: 'report_1' });
    expect(moderationRepository.createReportWithAudit).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported target type', async () => {
    await expect(
      useCase.execute({
        currentUser: {
          id: 'user_1',
          roles: [AppRole.PATIENT],
        },
        payload: {
          targetType: 'UNKNOWN' as ModerationReportTargetType,
          targetId: 'x',
          reason: ModerationReportReason.OTHER,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inaccessible target (cross-user/cross-surface)', async () => {
    (resolveModerationReporterRoleService.resolve as jest.Mock).mockReturnValue(
      ModerationReporterRole.PRACTITIONER,
    );
    (moderationRepository.findAccessibleTarget as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        currentUser: {
          id: 'user_2',
          roles: [AppRole.PRACTITIONER],
        },
        payload: {
          targetType: ModerationReportTargetType.SUPPORT_TICKET,
          targetId: 'ticket_1',
          reason: ModerationReportReason.HARASSMENT,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects duplicate recent report', async () => {
    (resolveModerationReporterRoleService.resolve as jest.Mock).mockReturnValue(
      ModerationReporterRole.PATIENT,
    );
    (moderationRepository.findAccessibleTarget as jest.Mock).mockResolvedValue({
      id: 'review_1',
    });
    (moderationRepository.findRecentDuplicate as jest.Mock).mockResolvedValue({
      id: 'report_prev',
    });

    await expect(
      useCase.execute({
        currentUser: {
          id: 'user_1',
          roles: [AppRole.PATIENT],
        },
        payload: {
          targetType: ModerationReportTargetType.REVIEW,
          targetId: 'review_1',
          reason: ModerationReportReason.ABUSE,
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
