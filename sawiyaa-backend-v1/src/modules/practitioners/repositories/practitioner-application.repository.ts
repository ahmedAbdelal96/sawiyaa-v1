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

  findLatestByUserId(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerApplication.findFirst({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findActiveChangeByPractitionerId(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerApplication.findFirst({
      where: {
        practitionerId,
        status: {
          in: [
            PractitionerApplicationStatus.SUBMITTED,
            PractitionerApplicationStatus.UNDER_REVIEW,
            PractitionerApplicationStatus.CHANGES_REQUESTED,
          ],
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  updateSubmissionSnapshot(
    id: string,
    submissionSnapshot: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerApplication.update({
      where: { id },
      data: { submissionSnapshot },
    });
  }

  async createSubmitted(
    practitionerId: string,
    submissionSnapshot?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    const profile = await this.getDb(tx).practitionerProfile.findUnique({ where: { id: practitionerId }, select: { userId: true } });
    if (!profile) throw new Error('Practitioner profile not found');
    return this.getDb(tx).practitionerApplication.create({
      data: {
        userId: profile.userId,
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

  createDraftByUser(
    userId: string,
    submissionSnapshot?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerApplication.create({
      data: {
        userId,
        status: PractitionerApplicationStatus.DRAFT,
        submissionSnapshot,
      },
    });
  }

  createSubmittedByUser(
    userId: string,
    submissionSnapshot?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerApplication.create({
      data: {
        userId,
        status: PractitionerApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
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
