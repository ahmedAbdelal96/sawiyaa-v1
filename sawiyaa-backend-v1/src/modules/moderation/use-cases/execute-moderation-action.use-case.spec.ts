import { AppRole } from '@common/enums/app-role.enum';
import { AppLoggerService } from '@common/logging/app-logger.service';
import {
  ModerationCaseActionType,
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
} from '@prisma/client';
import { ExecuteModerationActionDto } from '../dto/execute-moderation-action.dto';
import { ModerationPresenter } from '../presenters/moderation.presenter';
import { ModerationRepository } from '../repositories/moderation.repository';
import { ExecuteModerationSurfaceEnforcementService } from '../services/execute-moderation-surface-enforcement.service';
import { ValidateModerationActionTransitionService } from '../services/validate-moderation-action-transition.service';
import { ExecuteModerationActionUseCase } from './execute-moderation-action.use-case';

describe('ExecuteModerationActionUseCase', () => {
  const moderationRepository = {
    findCaseById: jest.fn(),
    executeCaseAction: jest.fn(),
  } as unknown as ModerationRepository;
  const moderationPresenter = {
    presentCaseDetail: jest.fn(),
    presentActionExecution: jest.fn(),
  } as unknown as ModerationPresenter;
  const validateModerationActionTransitionService = {
    validate: jest.fn(),
  } as unknown as ValidateModerationActionTransitionService;
  const executeModerationSurfaceEnforcementService = {
    execute: jest.fn(),
  } as unknown as ExecuteModerationSurfaceEnforcementService;
  const logger = {
    info: jest.fn(),
  } as unknown as AppLoggerService;

  const useCase = new ExecuteModerationActionUseCase(
    moderationRepository,
    moderationPresenter,
    validateModerationActionTransitionService,
    executeModerationSurfaceEnforcementService,
    logger,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes valid moderation action and returns action execution payload', async () => {
    (moderationRepository.findCaseById as jest.Mock).mockResolvedValue({
      id: 'report_1',
      targetType: ModerationReportTargetType.REVIEW,
      targetId: 'review_1',
      reason: ModerationReportReason.ABUSE,
      note: null,
      status: ModerationCaseStatus.OPEN,
      reportedByUserId: 'patient_1',
      reportedByRole: ModerationReporterRole.PATIENT,
      createdAt: new Date('2026-03-31T20:00:00.000Z'),
      targetSnapshot: null,
    });
    (
      validateModerationActionTransitionService.validate as jest.Mock
    ).mockReturnValue({
      nextStatus: ModerationCaseStatus.UNDER_REVIEW,
    });
    (moderationRepository.executeCaseAction as jest.Mock).mockResolvedValue({
      id: 'report_1',
      targetType: ModerationReportTargetType.REVIEW,
      targetId: 'review_1',
      reason: ModerationReportReason.ABUSE,
      note: null,
      status: ModerationCaseStatus.UNDER_REVIEW,
      reportedByUserId: 'patient_1',
      reportedByRole: ModerationReporterRole.PATIENT,
      createdAt: new Date('2026-03-31T20:00:00.000Z'),
      targetSnapshot: null,
      actions: [
        {
          id: 'action_1',
          actionType: ModerationCaseActionType.REVIEW_CASE,
          previousStatus: ModerationCaseStatus.OPEN,
          nextStatus: ModerationCaseStatus.UNDER_REVIEW,
          reason: null,
          note: null,
          createdAt: new Date('2026-03-31T20:05:00.000Z'),
        },
      ],
    });
    (moderationPresenter.presentCaseDetail as jest.Mock).mockReturnValue({
      id: 'report_1',
      status: ModerationCaseStatus.UNDER_REVIEW,
    });
    (moderationPresenter.presentActionExecution as jest.Mock).mockReturnValue({
      actionId: 'action_1',
      action: ModerationCaseActionType.REVIEW_CASE,
      previousStatus: ModerationCaseStatus.OPEN,
      nextStatus: ModerationCaseStatus.UNDER_REVIEW,
      reason: null,
      note: null,
      createdAt: '2026-03-31T20:05:00.000Z',
    });

    const payload: ExecuteModerationActionDto = {
      action: ModerationCaseActionType.REVIEW_CASE,
    };
    const result = await useCase.execute({
      currentUser: {
        id: 'admin_1',
        roles: [AppRole.ADMIN],
      },
      reportId: 'report_1',
      payload,
    });

    expect(moderationRepository.executeCaseAction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      item: {
        id: 'report_1',
        status: ModerationCaseStatus.UNDER_REVIEW,
      },
      actionExecution: {
        actionId: 'action_1',
        action: ModerationCaseActionType.REVIEW_CASE,
        previousStatus: ModerationCaseStatus.OPEN,
        nextStatus: ModerationCaseStatus.UNDER_REVIEW,
        reason: null,
        note: null,
        createdAt: '2026-03-31T20:05:00.000Z',
      },
    });
  });

  it('runs surface enforcement before persisting enforcement action', async () => {
    (moderationRepository.findCaseById as jest.Mock).mockResolvedValue({
      id: 'report_2',
      targetType: ModerationReportTargetType.REVIEW,
      targetId: 'review_2',
      reason: ModerationReportReason.ABUSE,
      note: null,
      status: ModerationCaseStatus.READY_FOR_ENFORCEMENT,
      reportedByUserId: 'patient_1',
      reportedByRole: ModerationReporterRole.PATIENT,
      createdAt: new Date('2026-03-31T20:00:00.000Z'),
      targetSnapshot: null,
    });
    (
      validateModerationActionTransitionService.validate as jest.Mock
    ).mockReturnValue({
      nextStatus: ModerationCaseStatus.RESOLVED,
    });
    (moderationRepository.executeCaseAction as jest.Mock).mockResolvedValue({
      id: 'report_2',
      targetType: ModerationReportTargetType.REVIEW,
      targetId: 'review_2',
      reason: ModerationReportReason.ABUSE,
      note: null,
      status: ModerationCaseStatus.RESOLVED,
      reportedByUserId: 'patient_1',
      reportedByRole: ModerationReporterRole.PATIENT,
      createdAt: new Date('2026-03-31T20:00:00.000Z'),
      targetSnapshot: null,
      actions: [
        {
          id: 'action_2',
          actionType: ModerationCaseActionType.ENFORCE_REVIEW_HIDE,
          previousStatus: ModerationCaseStatus.READY_FOR_ENFORCEMENT,
          nextStatus: ModerationCaseStatus.RESOLVED,
          reason: 'policy',
          note: 'hide',
          createdAt: new Date('2026-03-31T20:10:00.000Z'),
        },
      ],
    });
    (moderationPresenter.presentCaseDetail as jest.Mock).mockReturnValue({
      id: 'report_2',
      status: ModerationCaseStatus.RESOLVED,
    });
    (moderationPresenter.presentActionExecution as jest.Mock).mockReturnValue({
      actionId: 'action_2',
      action: ModerationCaseActionType.ENFORCE_REVIEW_HIDE,
      previousStatus: ModerationCaseStatus.READY_FOR_ENFORCEMENT,
      nextStatus: ModerationCaseStatus.RESOLVED,
      reason: 'policy',
      note: 'hide',
      createdAt: '2026-03-31T20:10:00.000Z',
    });

    await useCase.execute({
      currentUser: {
        id: 'admin_1',
        roles: [AppRole.ADMIN],
      },
      reportId: 'report_2',
      payload: {
        action: ModerationCaseActionType.ENFORCE_REVIEW_HIDE,
        reason: 'policy',
        note: 'hide',
      },
    });

    expect(
      executeModerationSurfaceEnforcementService.execute,
    ).toHaveBeenCalledTimes(1);
    expect(moderationRepository.executeCaseAction).toHaveBeenCalledTimes(1);
  });
});
