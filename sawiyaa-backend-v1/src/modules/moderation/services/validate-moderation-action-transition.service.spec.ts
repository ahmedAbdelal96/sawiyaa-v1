import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import {
  ModerationCaseActionType,
  ModerationCaseStatus,
  ModerationReportTargetType,
} from '@prisma/client';
import { ValidateModerationActionTransitionService } from './validate-moderation-action-transition.service';

describe('ValidateModerationActionTransitionService', () => {
  const service = new ValidateModerationActionTransitionService();

  it('allows valid admin transition', () => {
    const result = service.validate({
      actorRoles: [AppRole.ADMIN],
      action: ModerationCaseActionType.REVIEW_CASE,
      caseStatus: ModerationCaseStatus.OPEN,
      targetType: ModerationReportTargetType.REVIEW,
      reason: null,
    });

    expect(result.nextStatus).toBe(ModerationCaseStatus.UNDER_REVIEW);
  });

  it('rejects action for unauthorized role', () => {
    expect(() =>
      service.validate({
        actorRoles: [AppRole.PATIENT],
        action: ModerationCaseActionType.REVIEW_CASE,
        caseStatus: ModerationCaseStatus.OPEN,
        targetType: ModerationReportTargetType.REVIEW,
        reason: null,
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects invalid state transition', () => {
    expect(() =>
      service.validate({
        actorRoles: [AppRole.ADMIN],
        action: ModerationCaseActionType.PREPARE_ENFORCEMENT,
        caseStatus: ModerationCaseStatus.OPEN,
        targetType: ModerationReportTargetType.REVIEW,
        reason: 'policy review',
      }),
    ).toThrow(BadRequestException);
  });

  it('requires reason for enforcement preparation and dismiss', () => {
    expect(() =>
      service.validate({
        actorRoles: [AppRole.CONTENT_REVIEWER],
        action: ModerationCaseActionType.PREPARE_ENFORCEMENT,
        caseStatus: ModerationCaseStatus.UNDER_REVIEW,
        targetType: ModerationReportTargetType.ARTICLE,
        reason: null,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid enforcement target/action combination', () => {
    expect(() =>
      service.validate({
        actorRoles: [AppRole.ADMIN],
        action: ModerationCaseActionType.ENFORCE_REVIEW_HIDE,
        caseStatus: ModerationCaseStatus.READY_FOR_ENFORCEMENT,
        targetType: ModerationReportTargetType.ARTICLE,
        reason: 'violation',
      }),
    ).toThrow(BadRequestException);
  });

  it('allows enforcement only from ready-for-enforcement status', () => {
    expect(() =>
      service.validate({
        actorRoles: [AppRole.ADMIN],
        action: ModerationCaseActionType.ENFORCE_SUPPORT_ESCALATE,
        caseStatus: ModerationCaseStatus.UNDER_REVIEW,
        targetType: ModerationReportTargetType.SUPPORT_TICKET,
        reason: 'safety risk',
      }),
    ).toThrow(BadRequestException);
  });
});
