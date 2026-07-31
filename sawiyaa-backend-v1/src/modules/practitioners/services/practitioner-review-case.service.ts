import { ConflictException, Injectable } from '@nestjs/common';
import {
  Prisma,
  CredentialType,
  ReviewCaseStatus,
  ReviewCaseType,
  ReviewOperationalImpact,
  ReviewRequirementSeverity,
  ReviewRequirementStatus,
  ReviewSection,
  ReviewSectionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

export type ReviewRequirementInput = {
  section: ReviewSection;
  fieldPath?: string;
  credentialType?: CredentialType | null;
  title: string;
  reason: string;
  instructions?: string;
  dueAt?: Date;
  severity?: ReviewRequirementSeverity;
  operationalImpact?: ReviewOperationalImpact[];
};

export type PractitionerReviewCaseViewModel = {
  id: string;
  status: ReviewCaseStatus;
  proposedSnapshot: Prisma.JsonValue;
  sections: Array<{ section: ReviewSection; status: ReviewSectionStatus }>;
  requirements: Array<{
    id: string;
    section: ReviewSection;
    fieldPath: string | null;
    status: ReviewRequirementStatus;
    title: string;
    reason: string;
  }>;
};

const ACTIVE_STATUSES: ReviewCaseStatus[] = [
  ReviewCaseStatus.DRAFT,
  ReviewCaseStatus.PENDING_REVIEW,
  ReviewCaseStatus.UNDER_REVIEW,
  ReviewCaseStatus.CHANGES_REQUESTED,
  ReviewCaseStatus.RESUBMITTED,
];

/**
 * Aggregate boundary for practitioner verification cases.
 * Legacy PractitionerApplication remains available as a compatibility read model,
 * but new change/review state is persisted here with explicit sections and requirements.
 */
@Injectable()
export class PractitionerReviewCaseService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveChangeCase(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PractitionerReviewCaseViewModel | null> {
    const db: DbClient = tx ?? this.prisma;
    const reviewCase = await db.practitionerReviewCase.findFirst({
      where: {
        practitionerId,
        caseType: ReviewCaseType.PRACTITIONER_CHANGE,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        sections: { select: { section: true, status: true } },
        requirements: {
          select: {
            id: true,
            section: true,
            fieldPath: true,
            status: true,
            title: true,
            reason: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return reviewCase;
  }

  assertTransition(from: ReviewCaseStatus, to: ReviewCaseStatus): void {
    const allowed: Record<ReviewCaseStatus, ReviewCaseStatus[]> = {
      DRAFT: [ReviewCaseStatus.PENDING_REVIEW, ReviewCaseStatus.CANCELLED],
      PENDING_REVIEW: [
        ReviewCaseStatus.UNDER_REVIEW,
        ReviewCaseStatus.CHANGES_REQUESTED,
        ReviewCaseStatus.APPROVED,
        ReviewCaseStatus.REJECTED,
        ReviewCaseStatus.CANCELLED,
      ],
      UNDER_REVIEW: [
        ReviewCaseStatus.CHANGES_REQUESTED,
        ReviewCaseStatus.APPROVED,
        ReviewCaseStatus.REJECTED,
        ReviewCaseStatus.CANCELLED,
      ],
      CHANGES_REQUESTED: [ReviewCaseStatus.RESUBMITTED, ReviewCaseStatus.CANCELLED],
      RESUBMITTED: [
        ReviewCaseStatus.UNDER_REVIEW,
        ReviewCaseStatus.CHANGES_REQUESTED,
        ReviewCaseStatus.APPROVED,
        ReviewCaseStatus.REJECTED,
      ],
      APPROVED: [],
      REJECTED: [ReviewCaseStatus.DRAFT],
      CANCELLED: [],
    };

    if (!allowed[from].includes(to)) {
      throw new ConflictException(`Invalid review case transition: ${from} -> ${to}`);
    }
  }

  async upsertChangeCase(input: {
    practitionerId: string;
    proposedSnapshot: Prisma.InputJsonValue;
    sections: ReviewSection[];
    tx?: Prisma.TransactionClient;
  }) {
    const db: DbClient = input.tx ?? this.prisma;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.practitionerId}))`;

    const existing = await db.practitionerReviewCase.findFirst({
      where: {
        practitionerId: input.practitionerId,
        caseType: ReviewCaseType.PRACTITIONER_CHANGE,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const reviewCase = existing
      ? await db.practitionerReviewCase.update({
          where: { id: existing.id },
          data: {
            proposedSnapshot: input.proposedSnapshot,
            // Saving a requirement response does not resubmit the whole case.
            // The explicit application submit action owns that transition.
            status: existing.status,
            submittedAt: existing.submittedAt ?? new Date(),
          },
        })
      : await db.practitionerReviewCase.create({
          data: {
            practitionerId: input.practitionerId,
            caseType: ReviewCaseType.PRACTITIONER_CHANGE,
            status: ReviewCaseStatus.PENDING_REVIEW,
            proposedSnapshot: input.proposedSnapshot,
            submittedAt: new Date(),
          },
        });

    for (const section of input.sections) {
      await db.practitionerReviewSection.upsert({
        where: { caseId_section: { caseId: reviewCase.id, section } },
        create: {
          caseId: reviewCase.id,
          section,
          status: ReviewSectionStatus.PENDING,
          proposedSnapshot: input.proposedSnapshot,
        },
        update: {
          status: ReviewSectionStatus.PENDING,
          proposedSnapshot: input.proposedSnapshot,
        },
      });
    }

    return reviewCase;
  }

  async markRequirementSubmitted(input: {
    caseId: string;
    section: ReviewSection;
    fieldPath: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const db: DbClient = input.tx ?? this.prisma;
    const requirement = await db.practitionerReviewRequirement.findFirst({
      where: {
        caseId: input.caseId,
        section: input.section,
        fieldPath: input.fieldPath,
        status: {
          in: [ReviewRequirementStatus.OPEN, ReviewRequirementStatus.REJECTED],
        },
      },
      select: { id: true },
    });
    if (!requirement) return;

    await db.practitionerReviewRequirement.update({
      where: { id: requirement.id },
      data: {
        status: ReviewRequirementStatus.SUBMITTED,
        resolvedAt: null,
        resolvedByUserId: null,
      },
    });
    await db.practitionerReviewSection.updateMany({
      where: { caseId: input.caseId, section: input.section },
      data: { status: ReviewSectionStatus.PENDING },
    });
  }

  async resubmitChangeCase(input: {
    practitionerId: string;
    proposedSnapshot: Prisma.InputJsonValue;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const db: DbClient = input.tx ?? this.prisma;
    const current = await db.practitionerReviewCase.findFirst({
      where: {
        practitionerId: input.practitionerId,
        caseType: ReviewCaseType.PRACTITIONER_CHANGE,
        status: ReviewCaseStatus.CHANGES_REQUESTED,
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!current) return;

    this.assertTransition(current.status, ReviewCaseStatus.RESUBMITTED);
    await db.practitionerReviewCase.update({
      where: { id: current.id },
      data: {
        status: ReviewCaseStatus.RESUBMITTED,
        submittedAt: new Date(),
        proposedSnapshot: input.proposedSnapshot,
      },
    });
  }

  async ensureOnboardingCase(input: {
    practitionerId: string;
    proposedSnapshot: Prisma.InputJsonValue;
    tx?: Prisma.TransactionClient;
  }) {
    const db: DbClient = input.tx ?? this.prisma;
    const existing = await db.practitionerReviewCase.findFirst({
      where: {
        practitionerId: input.practitionerId,
        caseType: ReviewCaseType.ONBOARDING,
        status: { notIn: [ReviewCaseStatus.CANCELLED] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    const reviewCase = await db.practitionerReviewCase.create({
      data: {
        practitionerId: input.practitionerId,
        caseType: ReviewCaseType.ONBOARDING,
        status: ReviewCaseStatus.PENDING_REVIEW,
        submittedAt: new Date(),
        proposedSnapshot: input.proposedSnapshot,
      },
    });

    for (const section of [
      ReviewSection.PROFILE,
      ReviewSection.SPECIALTIES,
      ReviewSection.IDENTITY,
      ReviewSection.ACADEMIC_CREDENTIALS,
      ReviewSection.PROFESSIONAL_CREDENTIALS,
      ReviewSection.BANKING,
    ]) {
      await db.practitionerReviewSection.create({
        data: {
          caseId: reviewCase.id,
          section,
          status: ReviewSectionStatus.PENDING,
          proposedSnapshot: input.proposedSnapshot,
        },
      });
    }
    return reviewCase;
  }

  async requestChanges(input: {
    caseId: string;
    adminUserId: string;
    requirements: ReviewRequirementInput[];
    reason: string;
    tx?: Prisma.TransactionClient;
  }) {
    const db: DbClient = input.tx ?? this.prisma;
    const current = await db.practitionerReviewCase.findUnique({
      where: { id: input.caseId },
    });
    if (!current) throw new ConflictException('Review case not found');
    if (current.status !== ReviewCaseStatus.CHANGES_REQUESTED) {
      this.assertTransition(current.status, ReviewCaseStatus.CHANGES_REQUESTED);
    }

    const updated = await db.practitionerReviewCase.update({
      where: { id: input.caseId },
      data: {
        status: ReviewCaseStatus.CHANGES_REQUESTED,
        reviewedAt: new Date(),
        reviewedByUserId: input.adminUserId,
        decisionReason: input.reason,
      },
    });

    for (const requirement of input.requirements) {
      const existing = await db.practitionerReviewRequirement.findFirst({
        where: {
          caseId: input.caseId,
          section: requirement.section,
          fieldPath: requirement.fieldPath ?? null,
          credentialType: requirement.credentialType ?? null,
          status: { in: [ReviewRequirementStatus.OPEN, ReviewRequirementStatus.REJECTED] },
        },
      });
      if (existing) {
        await db.practitionerReviewRequirement.update({
          where: { id: existing.id },
          data: {
            title: requirement.title,
            reason: requirement.reason,
            instructions: requirement.instructions,
            dueAt: requirement.dueAt,
            severity: requirement.severity ?? ReviewRequirementSeverity.BLOCKING,
            operationalImpact: requirement.operationalImpact ?? [],
            status: ReviewRequirementStatus.OPEN,
            resolvedAt: null,
            resolvedByUserId: null,
          },
        });
      } else {
        await db.practitionerReviewRequirement.create({
          data: {
            caseId: input.caseId,
            section: requirement.section,
            fieldPath: requirement.fieldPath,
            credentialType: requirement.credentialType,
            title: requirement.title,
            reason: requirement.reason,
            instructions: requirement.instructions,
            dueAt: requirement.dueAt,
            severity: requirement.severity ?? ReviewRequirementSeverity.BLOCKING,
            operationalImpact: requirement.operationalImpact ?? [],
            createdByUserId: input.adminUserId,
          },
        });
      }
      await db.practitionerReviewSection.updateMany({
        where: { caseId: input.caseId, section: requirement.section },
        data: { status: ReviewSectionStatus.CHANGES_REQUESTED },
      });
    }

    return updated;
  }
}
