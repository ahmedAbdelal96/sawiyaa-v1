import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  PaymentPurpose,
  PaymentStatus,
  WalletBalanceBucket,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { ExtractPaymentLedgerBreakdownService } from '../services/extract-payment-ledger-breakdown.service';
import { RefreshPractitionerWalletService } from '../services/refresh-practitioner-wallet.service';
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
    private readonly refreshPractitionerWalletService: RefreshPractitionerWalletService,
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

    if (payment.paymentPurpose === PaymentPurpose.SESSION_PACKAGE_PURCHASE) {
      return {
        items: [],
        wasAlreadyPosted: true,
      };
    }

    const breakdown =
      this.extractPaymentLedgerBreakdownService.extract(payment);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.id})::bigint)`;

      const existing = await this.ledgerRepository.findByPaymentId(
        payment.id,
        tx,
      );
      if (existing.length > 0) {
        return {
          items: existing,
          wasAlreadyPosted: true,
        };
      }

      await this.ledgerRepository.createManyLedgerEntries(
        [
          {
            practitionerId: payment.practitionerId,
            sessionId: payment.sessionId,
            paymentId: payment.id,
            entryType: LedgerEntryType.PRACTITIONER_EARNING,
            direction: LedgerDirection.CREDIT,
            amount: breakdown.practitionerShareAmount,
            currencyCode: breakdown.currencyCode,
            balanceBucket: WalletBalanceBucket.AVAILABLE,
            referenceType: 'payment',
            referenceId: payment.id,
            description: 'Practitioner earning from captured payment.',
            metadataJson: {
              source: 'payment-captured',
              commissionRuleId: payment.commissionRuleId ?? null,
            },
          },
          {
            practitionerId: null,
            sessionId: payment.sessionId,
            paymentId: payment.id,
            entryType: LedgerEntryType.PLATFORM_COMMISSION,
            direction: LedgerDirection.CREDIT,
            amount: breakdown.platformCommissionAmount,
            currencyCode: breakdown.currencyCode,
            balanceBucket: WalletBalanceBucket.AVAILABLE,
            referenceType: 'payment',
            referenceId: payment.id,
            description: 'Platform commission from captured payment.',
            metadataJson: {
              source: 'payment-captured',
              commissionRuleId: payment.commissionRuleId ?? null,
            },
          },
        ],
        tx,
      );

      if (payment.practitionerId) {
        await this.refreshPractitionerWalletService.refresh(
          payment.practitionerId,
          tx,
        );
      }

      return {
        items: await this.ledgerRepository.findByPaymentId(payment.id, tx),
        wasAlreadyPosted: false,
      };
    });

    if (!result.wasAlreadyPosted) {
      await this.accountingJournalPostingService.postPaymentCaptured({
        payment,
        breakdown,
      });
    }

    return result;
  }
}
