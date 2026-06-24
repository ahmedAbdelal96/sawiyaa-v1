import { Injectable } from '@nestjs/common';
import { Prisma, CorporateSponsorshipStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CorporateSessionSponsorshipRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  async findBySessionId(sessionId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateSessionSponsorship.findUnique({
      where: { sessionId },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true, status: true },
        },
        contract: {
          select: { id: true, status: true, currency: true, billingMode: true, market: true },
        },
        benefitPlan: {
          select: { id: true, name: true, status: true, coverageType: true },
        },
        code: {
          select: { id: true, codeHash: true, codePrefix: true, codeLast4: true },
        },
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateSessionSponsorship.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true, status: true },
        },
        contract: {
          select: { id: true, status: true, currency: true, billingMode: true, market: true },
        },
        benefitPlan: {
          select: { id: true, name: true, status: true, coverageType: true },
        },
        code: {
          select: { id: true, codeHash: true, codePrefix: true, codeLast4: true },
        },
      },
    });
  }

  async create(data: {
    sessionId: string;
    organizationId: string;
    contractId: string;
    benefitPlanId: string;
    codeId: string;
    coverageType: string;
    billingMode: string;
    market?: string;
    originalAmount: Prisma.Decimal;
    coveredAmount: Prisma.Decimal;
    patientPayAmount: Prisma.Decimal;
    currency: string;
    snapshotJson: Prisma.InputJsonValue;
    status?: CorporateSponsorshipStatus;
  }, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateSessionSponsorship.create({
      data: {
        sessionId: data.sessionId,
        organizationId: data.organizationId,
        contractId: data.contractId,
        benefitPlanId: data.benefitPlanId,
        codeId: data.codeId,
        coverageType: data.coverageType as any,
        billingMode: data.billingMode as any,
        market: data.market as any,
        originalAmount: data.originalAmount,
        coveredAmount: data.coveredAmount,
        patientPayAmount: data.patientPayAmount,
        currency: data.currency,
        snapshotJson: data.snapshotJson,
        status: data.status ?? CorporateSponsorshipStatus.RESERVED,
      },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true, status: true },
        },
        benefitPlan: {
          select: { id: true, name: true, status: true, coverageType: true },
        },
        code: {
          select: { id: true, codeHash: true, codePrefix: true, codeLast4: true },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    status: CorporateSponsorshipStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateSessionSponsorship.update({
      where: { id },
      data: { status },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true, status: true },
        },
        benefitPlan: {
          select: { id: true, name: true, status: true, coverageType: true },
        },
        code: {
          select: { id: true, codeHash: true, codePrefix: true, codeLast4: true },
        },
      },
    });
  }

  async updateStatusBySessionId(
    sessionId: string,
    status: CorporateSponsorshipStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateSessionSponsorship.update({
      where: { sessionId },
      data: { status },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true, status: true },
        },
        benefitPlan: {
          select: { id: true, name: true, status: true, coverageType: true },
        },
        code: {
          select: { id: true, codeHash: true, codePrefix: true, codeLast4: true },
        },
      },
    });
  }

  /**
   * Find sponsorship by ID for consume operation.
   * Includes code status and reservation details needed for consume validation.
   */
  async findForConsumeById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).corporateSessionSponsorship.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, companyCode: true, status: true },
        },
        contract: {
          select: { id: true, status: true, currency: true, billingMode: true, market: true },
        },
        benefitPlan: {
          select: { id: true, name: true, status: true, coverageType: true },
        },
        code: {
          select: {
            id: true,
            codeHash: true,
            codePrefix: true,
            codeLast4: true,
            status: true,
            reservedSessionId: true,
            reservedByUserId: true,
            reservedUntil: true,
          },
        },
      },
    });
  }

  /**
   * Mark sponsorship as CONSUMED.
   * Uses conditional update to ensure idempotency - only updates if status is RESERVED and session matches.
   * Returns the count of updated rows (0 or 1).
   */
  async markConsumed(
    id: string,
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const result = await this.getDb(tx).corporateSessionSponsorship.updateMany({
      where: {
        id,
        sessionId,
        status: CorporateSponsorshipStatus.RESERVED,
      },
      data: {
        status: CorporateSponsorshipStatus.CONSUMED,
      },
    });
    return result.count;
  }
}