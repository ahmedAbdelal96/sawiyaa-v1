import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, RefundStatus } from '@prisma/client';
import { PostRefundLedgerEntriesUseCase } from './post-refund-ledger-entries.use-case';

describe('PostRefundLedgerEntriesUseCase', () => {
  function buildUseCase(input?: { refund?: any; existingEntries?: any[] }) {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };
    const financialOperationsPaymentRepository = {
      findRefundForPosting: jest.fn().mockResolvedValue(
        input && 'refund' in input
          ? input.refund
          : {
              id: 'refund_1',
              status: RefundStatus.SUCCEEDED,
              amount: new Prisma.Decimal('100.00'),
              currencyCode: 'USD',
              payment: {
                id: 'payment_1',
                amountTotal: new Prisma.Decimal('200.00'),
                metadataJson: {
                  financialBreakdown: {
                    practitionerShareAmount: '120.00',
                    platformCommissionAmount: '80.00',
                  },
                },
                commissionPlatformRatePercent: null,
                currencyCode: 'USD',
                practitionerId: 'pr_1',
                sessionId: 'session_1',
              },
            },
      ),
    };
    const ledgerRepository = {
      findByRefundId: jest.fn().mockResolvedValue(input?.existingEntries ?? []),
      createManyLedgerEntries: jest.fn().mockResolvedValue({ count: 2 }),
    };
    const extractPaymentLedgerBreakdownService = {
      extract: jest.fn().mockReturnValue({
        practitionerShareAmount: '120.00',
        platformCommissionAmount: '80.00',
        currencyCode: 'USD',
      }),
    };
    const refreshPractitionerWalletService = {
      refresh: jest.fn().mockResolvedValue({}),
    };
    const moneyAmountService = {
      toDecimal: (value: unknown) => {
        return new Prisma.Decimal(value as never);
      },
    };
    const accountingJournalPostingService = {
      postRefundSucceeded: jest.fn().mockResolvedValue({}),
    };

    const useCase = new PostRefundLedgerEntriesUseCase(
      prisma as never,
      financialOperationsPaymentRepository as never,
      ledgerRepository as never,
      extractPaymentLedgerBreakdownService as never,
      refreshPractitionerWalletService as never,
      moneyAmountService as never,
      accountingJournalPostingService as never,
    );

    return {
      useCase,
      financialOperationsPaymentRepository,
      ledgerRepository,
      refreshPractitionerWalletService,
      accountingJournalPostingService,
    };
  }

  it('posts refund reversal ledger entries', async () => {
    const setup = buildUseCase();

    await setup.useCase.execute({ refundId: 'refund_1' });

    expect(
      setup.ledgerRepository.createManyLedgerEntries,
    ).toHaveBeenCalledTimes(1);
    const entriesArg =
      setup.ledgerRepository.createManyLedgerEntries.mock.calls[0][0];
    expect(entriesArg[0].entryType).toBe('REFUND_PRACTITIONER_REVERSAL');
    expect(entriesArg[1].entryType).toBe('REFUND_PLATFORM_REVERSAL');
    expect(
      setup.accountingJournalPostingService.postRefundSucceeded,
    ).toHaveBeenCalledTimes(1);
  });

  it('is idempotent when refund ledger already posted', async () => {
    const setup = buildUseCase({
      existingEntries: [{ id: 'entry_1' }],
    });

    const result = await setup.useCase.execute({ refundId: 'refund_1' });

    expect(result.wasAlreadyPosted).toBe(true);
    expect(
      setup.ledgerRepository.createManyLedgerEntries,
    ).not.toHaveBeenCalled();
  });

  it('rejects non-succeeded refund posting', async () => {
    const setup = buildUseCase({
      refund: {
        id: 'refund_1',
        status: RefundStatus.FAILED,
        payment: { id: 'payment_1' },
      },
    });

    await expect(
      setup.useCase.execute({ refundId: 'refund_1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when refund is missing', async () => {
    const setup = buildUseCase({
      refund: null,
    });

    await expect(
      setup.useCase.execute({ refundId: 'refund_x' }),
    ).rejects.toThrow(NotFoundException);
  });
});
