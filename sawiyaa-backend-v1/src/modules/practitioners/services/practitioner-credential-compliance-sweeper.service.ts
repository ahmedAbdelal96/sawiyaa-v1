import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  CredentialLifecycleState,
  CredentialReviewStatus,
  CredentialType,
  ReviewCaseStatus,
  ReviewCaseType,
  ReviewRequirementSeverity,
  ReviewRequirementStatus,
  ReviewSection,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 50;
const BATCH_SIZE_ENV = 'PRACTITIONER_CREDENTIAL_COMPLIANCE_SWEEPER_BATCH_SIZE';

type CredentialSweepCursor = {
  expiresAt: Date;
  id: string;
};

type DiscoveredCredential = {
  id: string;
  practitionerId: string;
  credentialType: CredentialType;
  expiresAt: Date;
  practitioner: { userId: string };
};

/** Marks expired credentials and opens one deduplicated renewal case per practitioner. */
@Injectable()
export class PractitionerCredentialComplianceSweeperService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    PractitionerCredentialComplianceSweeperService.name,
  );
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
    const batchSize = this.readPositiveInt(BATCH_SIZE_ENV, DEFAULT_BATCH_SIZE);
    let cursor: CredentialSweepCursor | undefined;
    let processedCount = 0;

    while (true) {
      const expired = await this.prisma.practitionerCredential.findMany({
        where: {
          expiresAt: { lte: now },
          reviewStatus: { not: CredentialReviewStatus.EXPIRED },
          practitionerId: { not: null },
          ...(cursor
            ? {
                OR: [
                  { expiresAt: { gt: cursor.expiresAt } },
                  { expiresAt: cursor.expiresAt, id: { gt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
        take: batchSize,
        select: {
          id: true,
          practitionerId: true,
          credentialType: true,
          expiresAt: true,
          practitioner: { select: { userId: true } },
        },
      });

      if (expired.length === 0) break;

      for (const credential of expired as DiscoveredCredential[]) {
        await this.processCredential(credential, now);
        processedCount += 1;
        cursor = { expiresAt: credential.expiresAt, id: credential.id };
      }

      if (expired.length < batchSize) break;
    }

    if (processedCount > 0) {
      this.logger.log(
        `Processed ${processedCount} expired practitioner credentials`,
      );
    }
    return processedCount;
  }

  private async processCredential(
    credential: DiscoveredCredential,
    now: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.practitionerCredential.findUnique({
        where: { id: credential.id },
        select: {
          id: true,
          practitionerId: true,
          credentialType: true,
          expiresAt: true,
          reviewStatus: true,
          practitioner: { select: { userId: true } },
        },
      });

      if (
        !current ||
        !current.practitionerId ||
        !current.practitioner ||
        !current.expiresAt ||
        current.expiresAt > now ||
        current.reviewStatus === CredentialReviewStatus.EXPIRED
      ) {
        return;
      }

      await tx.practitionerCredential.update({
        where: { id: current.id },
        data: {
          reviewStatus: CredentialReviewStatus.EXPIRED,
          lifecycleState: CredentialLifecycleState.EXPIRED,
        },
      });
      await tx.practitionerProfile.update({
        where: { id: current.practitionerId },
        data: { complianceState: 'DOCUMENT_EXPIRED' },
      });
      let reviewCase = await tx.practitionerReviewCase.findFirst({
        where: {
          practitionerId: current.practitionerId,
          caseType: ReviewCaseType.CREDENTIAL_RENEWAL,
          status: {
            in: [
              ReviewCaseStatus.DRAFT,
              ReviewCaseStatus.PENDING_REVIEW,
              ReviewCaseStatus.CHANGES_REQUESTED,
            ],
          },
        },
      });
      if (!reviewCase) {
        reviewCase = await tx.practitionerReviewCase.create({
          data: {
            practitionerId: current.practitionerId,
            caseType: ReviewCaseType.CREDENTIAL_RENEWAL,
            status: ReviewCaseStatus.CHANGES_REQUESTED,
          },
        });
      }
      await tx.practitionerReviewSection.upsert({
        where: {
          caseId_section: {
            caseId: reviewCase.id,
            section: ReviewSection.PROFESSIONAL_CREDENTIALS,
          },
        },
        create: {
          caseId: reviewCase.id,
          section: ReviewSection.PROFESSIONAL_CREDENTIALS,
          status: 'CHANGES_REQUESTED',
        },
        update: { status: 'CHANGES_REQUESTED' },
      });
      const existingRequirement =
        await tx.practitionerReviewRequirement.findFirst({
          where: {
            caseId: reviewCase.id,
            credentialType: current.credentialType,
            status: {
              in: [
                ReviewRequirementStatus.OPEN,
                ReviewRequirementStatus.SUBMITTED,
              ],
            },
          },
        });
      if (!existingRequirement) {
        await tx.practitionerReviewRequirement.create({
          data: {
            caseId: reviewCase.id,
            section: ReviewSection.PROFESSIONAL_CREDENTIALS,
            credentialType: current.credentialType,
            title: `Renew ${current.credentialType}`,
            reason: 'This credential has expired and must be replaced.',
            severity: ReviewRequirementSeverity.BLOCKING,
            createdByUserId: current.practitioner.userId,
          },
        });
      }
    });
  }

  private readPositiveInt(name: string, fallback: number): number {
    const value = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
