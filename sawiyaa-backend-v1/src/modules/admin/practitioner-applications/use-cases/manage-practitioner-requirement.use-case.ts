import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ReviewRequirementStatus, ReviewSectionStatus, SecurityAuditOutcome } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { PractitionerRequirementAdminAction } from '../dto/update-practitioner-requirement.dto';

/** Canonical admin transition for onboarding and post-approval persisted requirements. */
@Injectable()
export class ManagePractitionerRequirementUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    requirementId: string;
    actorUserId: string;
    action: PractitionerRequirementAdminAction;
    reason?: string;
    applicationId?: string;
    practitionerId?: string;
  }) {
    if (!this.securityAuditService) {
      throw new ConflictException({ error: 'PRACTITIONER_REQUIREMENT_AUDIT_UNAVAILABLE' });
    }
    const audit = this.securityAuditService;
    const reason = input.reason?.trim() || null;
    if (input.action === PractitionerRequirementAdminAction.REJECT && !reason) {
      throw new BadRequestException({ error: 'PRACTITIONER_REQUIREMENT_REJECTION_REASON_REQUIRED' });
    }

    return this.prisma.$transaction(async (tx) => {
      const requirement = await tx.practitionerReviewRequirement.findUnique({
        where: { id: input.requirementId },
        include: {
          reviewCase: { select: { id: true, applicationId: true, practitionerId: true } },
        },
      });
      if (!requirement) throw new NotFoundException({ error: 'PRACTITIONER_REQUIREMENT_NOT_FOUND' });
      if (input.applicationId && requirement.reviewCase.applicationId !== input.applicationId) {
        throw new NotFoundException({ error: 'PRACTITIONER_REQUIREMENT_NOT_FOUND' });
      }
      if (input.practitionerId && requirement.reviewCase.practitionerId !== input.practitionerId) {
        throw new NotFoundException({ error: 'PRACTITIONER_REQUIREMENT_NOT_FOUND' });
      }

      const nextStatus = input.action === PractitionerRequirementAdminAction.SATISFY
        ? ReviewRequirementStatus.SATISFIED
        : input.action === PractitionerRequirementAdminAction.REJECT
          ? ReviewRequirementStatus.REJECTED
          : ReviewRequirementStatus.OPEN;
      const allowed: ReviewRequirementStatus[] = input.action === PractitionerRequirementAdminAction.SATISFY
        ? [ReviewRequirementStatus.SUBMITTED]
        : input.action === PractitionerRequirementAdminAction.REJECT
          ? [ReviewRequirementStatus.SUBMITTED]
          : [ReviewRequirementStatus.REJECTED, ReviewRequirementStatus.SATISFIED];
      if (!allowed.includes(requirement.status)) {
        throw new ConflictException({ error: 'PRACTITIONER_REQUIREMENT_INVALID_TRANSITION' });
      }

      const updated = await tx.practitionerReviewRequirement.update({
        where: { id: requirement.id },
        data: {
          status: nextStatus,
          resolvedAt: nextStatus === ReviewRequirementStatus.OPEN ? null : new Date(),
          resolvedByUserId: nextStatus === ReviewRequirementStatus.OPEN ? null : input.actorUserId,
        },
      });
      const outstanding = await tx.practitionerReviewRequirement.count({
        where: {
          caseId: requirement.caseId,
          section: requirement.section,
          status: { in: [ReviewRequirementStatus.OPEN, ReviewRequirementStatus.SUBMITTED, ReviewRequirementStatus.REJECTED] },
        },
      });
      await tx.practitionerReviewSection.updateMany({
        where: { caseId: requirement.caseId, section: requirement.section },
        data: { status: outstanding === 0 ? ReviewSectionStatus.APPROVED : nextStatus === ReviewRequirementStatus.OPEN ? ReviewSectionStatus.PENDING : ReviewSectionStatus.REJECTED },
      });
      await audit.recordRequired(tx, {
        action: `security.practitioner.requirement.${input.action.toLowerCase()}`,
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        source: SecurityAuditSource.HTTP_REQUEST,
        actorUserId: input.actorUserId,
        resourceType: 'PractitionerReviewRequirement',
        resourceId: requirement.id,
        reason,
        metadata: { previousStatus: requirement.status, nextStatus, caseId: requirement.caseId },
      });
      return updated;
    });
  }
}
