import { Injectable } from '@nestjs/common';
import { Prisma, CorporateLedgerEventType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CorporateLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  /**
   * Find a corporate ledger entry by sponsorshipId and event type.
   */
  async findBySponsorshipIdAndEvent(
    sponsorshipId: string,
    eventType: CorporateLedgerEventType,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateLedger.findFirst({
      where: {
        sponsorshipId,
        eventType,
      },
    });
  }

  /**
   * Create a CODE_CONSUMED ledger entry.
   */
  async createCodeConsumedEntry(
    data: {
      organizationId: string;
      contractId: string;
      sponsorshipId: string;
      codeId: string;
      sessionId: string;
      paymentId: string;
      amount: Prisma.Decimal;
      currency: string;
      originalAmount: Prisma.Decimal;
      coveredAmount: Prisma.Decimal;
      patientPayAmount: Prisma.Decimal;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).corporateLedger.create({
      data: {
        organizationId: data.organizationId,
        contractId: data.contractId,
        sponsorshipId: data.sponsorshipId,
        codeId: data.codeId,
        sessionId: data.sessionId,
        eventType: CorporateLedgerEventType.CODE_CONSUMED,
        amount: data.amount,
        currency: data.currency,
        quantity: 1,
        metadata: {
          paymentId: data.paymentId,
          originalAmount: data.originalAmount.toFixed(2),
          coveredAmount: data.coveredAmount.toFixed(2),
          patientPayAmount: data.patientPayAmount.toFixed(2),
          source: 'PAYMENT_SUCCESS_CONSUME',
        },
      },
    });
  }
}
