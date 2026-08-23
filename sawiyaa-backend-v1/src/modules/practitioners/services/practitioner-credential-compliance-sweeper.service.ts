import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  CredentialLifecycleState,
  CredentialReviewStatus,
  ReviewCaseStatus,
  ReviewCaseType,
  ReviewRequirementSeverity,
  ReviewRequirementStatus,
  ReviewSection,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Marks expired credentials and opens one deduplicated renewal case per practitioner. */
@Injectable()
export class PractitionerCredentialComplianceSweeperService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PractitionerCredentialComplianceSweeperService.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    void this.sweepOnce();
    this.timer = setInterval(() => void this.sweepOnce(), SWEEP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweepOnce(now = new Date()) {
    const expired = await this.prisma.practitionerCredential.findMany({
      where: { expiresAt: { lte: now }, reviewStatus: { not: CredentialReviewStatus.EXPIRED }, practitionerId: { not: null } },
      select: {
        id: true,
        practitionerId: true,
        credentialType: true,
        practitioner: { select: { userId: true } },
      },
    });

    for (const credential of expired) {
      await this.prisma.$transaction(async (tx) => {
        await tx.practitionerCredential.update({
          where: { id: credential.id },
          data: { reviewStatus: CredentialReviewStatus.EXPIRED, lifecycleState: CredentialLifecycleState.EXPIRED },
        });
        await tx.practitionerProfile.update({
          where: { id: credential.practitionerId! },
          data: { complianceState: 'DOCUMENT_EXPIRED' },
        });
        let reviewCase = await tx.practitionerReviewCase.findFirst({
          where: {
            practitionerId: credential.practitionerId!,
            caseType: ReviewCaseType.CREDENTIAL_RENEWAL,
            status: { in: [ReviewCaseStatus.DRAFT, ReviewCaseStatus.PENDING_REVIEW, ReviewCaseStatus.CHANGES_REQUESTED] },
          },
        });
        if (!reviewCase) {
          reviewCase = await tx.practitionerReviewCase.create({
            data: {
              practitionerId: credential.practitionerId!,
              caseType: ReviewCaseType.CREDENTIAL_RENEWAL,
              status: ReviewCaseStatus.CHANGES_REQUESTED,
            },
          });
        }
        await tx.practitionerReviewSection.upsert({
          where: { caseId_section: { caseId: reviewCase.id, section: ReviewSection.PROFESSIONAL_CREDENTIALS } },
          create: { caseId: reviewCase.id, section: ReviewSection.PROFESSIONAL_CREDENTIALS, status: 'CHANGES_REQUESTED' },
          update: { status: 'CHANGES_REQUESTED' },
        });
        const existingRequirement = await tx.practitionerReviewRequirement.findFirst({
          where: {
            caseId: reviewCase.id,
            credentialType: credential.credentialType,
            status: { in: [ReviewRequirementStatus.OPEN, ReviewRequirementStatus.SUBMITTED] },
          },
        });
        if (!existingRequirement) {
          await tx.practitionerReviewRequirement.create({
            data: {
              caseId: reviewCase.id,
              section: ReviewSection.PROFESSIONAL_CREDENTIALS,
              credentialType: credential.credentialType,
              title: `Renew ${credential.credentialType}`,
              reason: 'This credential has expired and must be replaced.',
              severity: ReviewRequirementSeverity.BLOCKING,
              createdByUserId: credential.practitioner!.userId,
            },
          });
        }
      });
    }
    if (expired.length > 0) this.logger.log(`Processed ${expired.length} expired practitioner credentials`);
    return expired.length;
  }
}
