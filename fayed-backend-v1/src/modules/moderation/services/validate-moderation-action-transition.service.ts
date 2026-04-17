import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import {
  ModerationCaseActionType,
  ModerationCaseStatus,
  ModerationReportTargetType,
} from '@prisma/client';
import { ModerationRoleActionMatrix } from '../types/moderation.types';

@Injectable()
export class ValidateModerationActionTransitionService {
  private readonly roleActionMatrix: ModerationRoleActionMatrix = {
    [AppRole.ADMIN]: [
      ModerationCaseActionType.REVIEW_CASE,
      ModerationCaseActionType.PREPARE_ENFORCEMENT,
      ModerationCaseActionType.MARK_RESOLVED,
      ModerationCaseActionType.DISMISS_CASE,
      ModerationCaseActionType.ENFORCE_CARE_CHAT_REVOKE,
      ModerationCaseActionType.ENFORCE_CARE_CHAT_MESSAGE_HIDE,
      ModerationCaseActionType.ENFORCE_REVIEW_HIDE,
      ModerationCaseActionType.ENFORCE_REVIEW_REJECT,
      ModerationCaseActionType.ENFORCE_REVIEW_RESTORE,
      ModerationCaseActionType.ENFORCE_ARTICLE_ARCHIVE,
      ModerationCaseActionType.ENFORCE_SUPPORT_ESCALATE,
    ],
    [AppRole.SUPPORT_AGENT]: [
      ModerationCaseActionType.REVIEW_CASE,
      ModerationCaseActionType.MARK_RESOLVED,
      ModerationCaseActionType.DISMISS_CASE,
      ModerationCaseActionType.ENFORCE_CARE_CHAT_REVOKE,
      ModerationCaseActionType.ENFORCE_CARE_CHAT_MESSAGE_HIDE,
      ModerationCaseActionType.ENFORCE_REVIEW_HIDE,
      ModerationCaseActionType.ENFORCE_SUPPORT_ESCALATE,
    ],
    [AppRole.CONTENT_REVIEWER]: [
      ModerationCaseActionType.REVIEW_CASE,
      ModerationCaseActionType.PREPARE_ENFORCEMENT,
      ModerationCaseActionType.DISMISS_CASE,
      ModerationCaseActionType.ENFORCE_CARE_CHAT_MESSAGE_HIDE,
      ModerationCaseActionType.ENFORCE_REVIEW_HIDE,
      ModerationCaseActionType.ENFORCE_REVIEW_REJECT,
      ModerationCaseActionType.ENFORCE_REVIEW_RESTORE,
      ModerationCaseActionType.ENFORCE_ARTICLE_ARCHIVE,
    ],
  };

  validate(input: {
    actorRoles: AppRole[];
    action: ModerationCaseActionType;
    caseStatus: ModerationCaseStatus;
    targetType: ModerationReportTargetType;
    reason: string | null;
  }): { nextStatus: ModerationCaseStatus } {
    this.validateAuthority(input.actorRoles, input.action);
    this.validateTargetAction(input.action, input.targetType);
    this.validateReason(input.action, input.reason);

    const nextStatus = this.resolveNextStatus(input.action, input.caseStatus);
    if (!nextStatus) {
      throw new BadRequestException({
        messageKey: 'moderation.errors.invalidCaseTransition',
        error: 'MODERATION_INVALID_CASE_TRANSITION',
      });
    }

    return { nextStatus };
  }

  private validateAuthority(actorRoles: AppRole[], action: ModerationCaseActionType) {
    const allowed = actorRoles.some((role) => {
      if (
        role !== AppRole.ADMIN &&
        role !== AppRole.SUPPORT_AGENT &&
        role !== AppRole.CONTENT_REVIEWER
      ) {
        return false;
      }

      return this.roleActionMatrix[role].includes(action);
    });

    if (!allowed) {
      throw new ForbiddenException({
        messageKey: 'moderation.errors.actionNotAllowedForRole',
        error: 'MODERATION_ACTION_NOT_ALLOWED_FOR_ROLE',
      });
    }
  }

  private validateTargetAction(
    action: ModerationCaseActionType,
    targetType: ModerationReportTargetType,
  ) {
    const matrix: Partial<Record<ModerationCaseActionType, ModerationReportTargetType[]>> =
      {
        [ModerationCaseActionType.PREPARE_ENFORCEMENT]: [
          ModerationReportTargetType.CARE_CHAT_CONVERSATION,
          ModerationReportTargetType.CARE_CHAT_MESSAGE,
          ModerationReportTargetType.REVIEW,
          ModerationReportTargetType.ARTICLE,
          ModerationReportTargetType.SUPPORT_TICKET,
          ModerationReportTargetType.SUPPORT_MESSAGE,
        ],
        [ModerationCaseActionType.ENFORCE_CARE_CHAT_REVOKE]: [
          ModerationReportTargetType.CARE_CHAT_CONVERSATION,
          ModerationReportTargetType.CARE_CHAT_MESSAGE,
        ],
        [ModerationCaseActionType.ENFORCE_CARE_CHAT_MESSAGE_HIDE]: [
          ModerationReportTargetType.CARE_CHAT_MESSAGE,
        ],
        [ModerationCaseActionType.ENFORCE_REVIEW_HIDE]: [
          ModerationReportTargetType.REVIEW,
        ],
        [ModerationCaseActionType.ENFORCE_REVIEW_REJECT]: [
          ModerationReportTargetType.REVIEW,
        ],
        [ModerationCaseActionType.ENFORCE_REVIEW_RESTORE]: [
          ModerationReportTargetType.REVIEW,
        ],
        [ModerationCaseActionType.ENFORCE_ARTICLE_ARCHIVE]: [
          ModerationReportTargetType.ARTICLE,
        ],
        [ModerationCaseActionType.ENFORCE_SUPPORT_ESCALATE]: [
          ModerationReportTargetType.SUPPORT_TICKET,
          ModerationReportTargetType.SUPPORT_MESSAGE,
        ],
      };

    const supported = matrix[action];
    if (supported && !supported.includes(targetType)) {
      throw new BadRequestException({
        messageKey: 'moderation.errors.invalidActionTargetCombination',
        error: 'MODERATION_INVALID_ACTION_TARGET_COMBINATION',
      });
    }
  }

  private validateReason(action: ModerationCaseActionType, reason: string | null) {
    const reasonRequiredActions: ModerationCaseActionType[] = [
      ModerationCaseActionType.PREPARE_ENFORCEMENT,
      ModerationCaseActionType.DISMISS_CASE,
      ModerationCaseActionType.ENFORCE_CARE_CHAT_REVOKE,
      ModerationCaseActionType.ENFORCE_CARE_CHAT_MESSAGE_HIDE,
      ModerationCaseActionType.ENFORCE_REVIEW_HIDE,
      ModerationCaseActionType.ENFORCE_REVIEW_REJECT,
      ModerationCaseActionType.ENFORCE_REVIEW_RESTORE,
      ModerationCaseActionType.ENFORCE_ARTICLE_ARCHIVE,
      ModerationCaseActionType.ENFORCE_SUPPORT_ESCALATE,
    ];
    if (reasonRequiredActions.includes(action) && !reason) {
      throw new BadRequestException({
        messageKey: 'moderation.errors.actionReasonRequired',
        error: 'MODERATION_ACTION_REASON_REQUIRED',
      });
    }
  }

  private resolveNextStatus(
    action: ModerationCaseActionType,
    current: ModerationCaseStatus,
  ): ModerationCaseStatus | null {
    switch (action) {
      case ModerationCaseActionType.REVIEW_CASE:
        return current === ModerationCaseStatus.OPEN
          ? ModerationCaseStatus.UNDER_REVIEW
          : null;
      case ModerationCaseActionType.PREPARE_ENFORCEMENT:
        return current === ModerationCaseStatus.UNDER_REVIEW
          ? ModerationCaseStatus.READY_FOR_ENFORCEMENT
          : null;
      case ModerationCaseActionType.MARK_RESOLVED:
        return current === ModerationCaseStatus.UNDER_REVIEW ||
          current === ModerationCaseStatus.READY_FOR_ENFORCEMENT
          ? ModerationCaseStatus.RESOLVED
          : null;
      case ModerationCaseActionType.DISMISS_CASE:
        return current === ModerationCaseStatus.OPEN ||
          current === ModerationCaseStatus.UNDER_REVIEW ||
          current === ModerationCaseStatus.READY_FOR_ENFORCEMENT
          ? ModerationCaseStatus.DISMISSED
          : null;
      case ModerationCaseActionType.ENFORCE_CARE_CHAT_REVOKE:
      case ModerationCaseActionType.ENFORCE_CARE_CHAT_MESSAGE_HIDE:
      case ModerationCaseActionType.ENFORCE_REVIEW_HIDE:
      case ModerationCaseActionType.ENFORCE_REVIEW_REJECT:
      case ModerationCaseActionType.ENFORCE_REVIEW_RESTORE:
      case ModerationCaseActionType.ENFORCE_ARTICLE_ARCHIVE:
      case ModerationCaseActionType.ENFORCE_SUPPORT_ESCALATE:
        return current === ModerationCaseStatus.READY_FOR_ENFORCEMENT
          ? ModerationCaseStatus.RESOLVED
          : null;
      default:
        return null;
    }
  }
}
