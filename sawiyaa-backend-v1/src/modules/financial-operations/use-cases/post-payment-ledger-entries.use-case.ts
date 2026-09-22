import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { ExtractPaymentLedgerBreakdownService } from '../services/extract-payment-ledger-breakdown.service';
import { AccountingJournalPostingService } from '../services/accounting-journal-posting.service';

/**
 * Ledger posting is the canonical handoff from payment collection into internal
 * accounting. This use case is idempotent by checking existing payment-linked
 * ledger entries before posting.
 */
@Injectable()
export class PostPaymentLedgerEntriesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialOperationsPaymentRepository: FinancialOperationsPaymentRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly extractPaymentLedgerBreakdownService: ExtractPaymentLedgerBreakdownService,
    private readonly accountingJournalPostingService: AccountingJournalPostingService,
  ) {}

  async execute(input: { paymentId: string }) {
    const payment =
      await this.financialOperationsPaymentRepository.findCapturedPaymentById(
        input.paymentId,
      );

    if (!payment) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.paymentNotFound',
        error: 'FINANCIAL_OPERATIONS_PAYMENT_NOT_FOUND',
      });
    }

    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.paymentNotCaptured',
        error: 'FINANCIAL_OPERATIONS_PAYMENT_NOT_CAPTURED',
      });
    }

    const breakdown =
      this.extractPaymentLedgerBreakdownService.extract(payment);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.id})::bigint)`;
      const journal =
        await this.accountingJournalPostingService.postPaymentCaptured({
          payment,
          breakdown,
          tx,
        });
      return {
        items: await this.ledgerRepository.findByPaymentId(payment.id, tx),
        wasAlreadyPosted: journal.wasAlreadyPosted,
      };
    });

    return result;
  }
}
