import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { ExecuteModerationActionDto } from '../dto/execute-moderation-action.dto';
import { ModerationPresenter } from '../presenters/moderation.presenter';
import { ModerationRepository } from '../repositories/moderation.repository';
import { ExecuteModerationSurfaceEnforcementService } from '../services/execute-moderation-surface-enforcement.service';
import { ValidateModerationActionTransitionService } from '../services/validate-moderation-action-transition.service';
import { mapAppRoleToModerationReporterRole } from '../types/moderation.types';

@Injectable()
export class ExecuteModerationActionUseCase {
  constructor(
    private readonly moderationRepository: ModerationRepository,
    private readonly moderationPresenter: ModerationPresenter,
    private readonly validateModerationActionTransitionService: ValidateModerationActionTransitionService,
    private readonly executeModerationSurfaceEnforcementService: ExecuteModerationSurfaceEnforcementService,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    currentUser: AuthenticatedUser;
    reportId: string;
    payload: ExecuteModerationActionDto;
  }) {
    const existing = await this.moderationRepository.findCaseById(
      input.reportId,
    );
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'moderation.errors.caseNotFound',
        error: 'MODERATION_CASE_NOT_FOUND',
      });
    }

    const resolvedActorRole = mapAppRoleToModerationReporterRole(
      input.currentUser.roles,
    );
    if (!resolvedActorRole) {
      throw new ForbiddenException({
        messageKey: 'moderation.errors.actionNotAllowedForRole',
        error: 'MODERATION_ACTION_NOT_ALLOWED_FOR_ROLE',
      });
    }

    const validated = this.validateModerationActionTransitionService.validate({
      actorRoles: input.currentUser.roles,
      action: input.payload.action,
      caseStatus: existing.status,
      targetType: existing.targetType,
      reason: input.payload.reason?.trim() || null,
    });

    if (String(input.payload.action).startsWith('ENFORCE_')) {
      await this.executeModerationSurfaceEnforcementService.execute({
        action: input.payload.action,
        targetType: existing.targetType,
        targetId: existing.targetId,
        actorUserId: input.currentUser.id,
        actorRoles: input.currentUser.roles,
        reason: input.payload.reason?.trim() || null,
        note: input.payload.note?.trim() || null,
      });
    }

    const updated = await this.moderationRepository.executeCaseAction({
      reportId: input.reportId,
      action: input.payload.action,
      previousStatus: existing.status,
      nextStatus: validated.nextStatus,
      actorUserId: input.currentUser.id,
      actorRole: resolvedActorRole,
      reason: input.payload.reason?.trim() || null,
      note: input.payload.note?.trim() || null,
    });
    if (!updated || updated.actions.length === 0) {
      throw new ConflictException({
        messageKey: 'moderation.errors.caseTransitionRaceCondition',
        error: 'MODERATION_CASE_TRANSITION_RACE_CONDITION',
      });
    }

    const latestAction = updated.actions[0];
    this.logger.info(
      {
        message: 'Moderation case action executed',
        moderationReportId: updated.id,
        actionId: latestAction.id,
        action: latestAction.actionType,
        previousStatus: latestAction.previousStatus,
        nextStatus: latestAction.nextStatus,
        actorRole: resolvedActorRole,
      },
      undefined,
      'Moderation',
    );

    return {
      item: this.moderationPresenter.presentCaseDetail({
        id: updated.id,
        targetType: updated.targetType,
        targetId: updated.targetId,
        reason: updated.reason,
        note: updated.note,
        status: updated.status,
        reportedByUserId: updated.reportedByUserId,
        reportedByRole: updated.reportedByRole,
        createdAt: updated.createdAt,
        lastActionAt: latestAction.createdAt,
        reporter: null,
        targetSnapshot: updated.targetSnapshot,
      }),
      actionExecution: {
        ...this.moderationPresenter.presentActionExecution({
          actionId: latestAction.id,
          action: latestAction.actionType,
          previousStatus: latestAction.previousStatus,
          nextStatus: latestAction.nextStatus,
          reason: latestAction.reason,
          note: latestAction.note,
          createdAt: latestAction.createdAt,
        }),
      },
    };
  }
}
