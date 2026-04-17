import { Injectable } from '@nestjs/common';
import { PractitionerApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Application repository keeps practitioner self-submission persistence logic centralized.
 * Admin review decisions are intentionally handled outside this module.
 */
@Injectable()
export class PractitionerApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findLatestByPractitionerId(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerApplication.findFirst({
      where: { practitionerId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  createSubmitted(
    practitionerId: string,
    submissionSnapshot?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerApplication.create({
      data: {
        practitionerId,
        status: PractitionerApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByUserId: null,
        reviewDecisionReason: null,
        reviewNotes: null,
        submissionSnapshot,
      },
    });
  }

  resubmit(
    applicationId: string,
    submissionSnapshot?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerApplication.update({
      where: { id: applicationId },
      data: {
        status: PractitionerApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByUserId: null,
        reviewDecisionReason: null,
        reviewNotes: null,
        submissionSnapshot,
      },
    });
  }
}
