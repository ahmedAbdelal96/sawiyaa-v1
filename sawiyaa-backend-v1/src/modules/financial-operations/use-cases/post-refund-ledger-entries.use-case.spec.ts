import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, RefundStatus } from '@prisma/client';
import { PostRefundLedgerEntriesUseCase } from './post-refund-ledger-entries.use-case';

describe('PostRefundLedgerEntriesUseCase', () => {
  function buildUseCase(input?: {
    refund?: any;
    existingEntries?: any[];
    approvedReview?: any | null;
    balance?: {
      totalPayableAmount?: string;
      lastPayoutAt?: string | null;
    } | null;
  }) {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) =>
        fn({
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          sessionEarningReview: {
            findFirst: jest.fn().mockResolvedValue(input?.approvedReview ?? null),
          },
        }),
      ),
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
    const balanceService = {
      getBalance: jest.fn().mockResolvedValue({
        practitionerId: 'pr_1',
        practitionerName: 'Dr. Lina',
        currencyCode: 'USD',
        payoutDestinationSnapshot: null,
        normalSessionPayableAmount: '0.00',
        packageReleasedPayableAmount: '0.00',
        packageHeldAmount: '0.00',
        totalPayableAmount: input?.balance?.totalPayableAmount ?? '120.00',
        manualRecoveryAmount: '0.00',
        lastPayoutAt: input?.balance?.lastPayoutAt ?? null,
      }),
    };
    const practitionerRecoveryService = {
      createRecoveryForRefund: jest.fn().mockResolvedValue({
        item: {
          id: 'recovery_1',
        },
        wasAlreadyRecorded: false,
      }),
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
      balanceService as never,
      practitionerRecoveryService as never,
      refreshPractitionerWalletService as never,
      moneyAmountService as never,
      accountingJournalPostingService as never,
    );

    return {
      useCase,
      prisma,
      financialOperationsPaymentRepository,
      ledgerRepository,
      balanceService,
      practitionerRecoveryService,
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
    expect(
      setup.refreshPractitionerWalletService.refresh,
    ).toHaveBeenCalledTimes(1);
    expect(
      setup.accountingJournalPostingService.postRefundSucceeded,
    ).toHaveBeenCalledTimes(1);
    expect(setup.balanceService.getBalance).toHaveBeenCalledTimes(0);
    expect(
      setup.practitionerRecoveryService.createRecoveryForRefund,
    ).not.toHaveBeenCalled();
  });

  it('posts only the absorbable practitioner reversal and creates a recovery for the shortfall when a review is already approved', async () => {
    const setup = buildUseCase({
      approvedReview: {
        id: 'review_1',
        sessionId: 'session_1',
        paymentId: 'payment_1',
        practitionerId: 'pr_1',
      },
      balance: {
        totalPayableAmount: '50.00',
        lastPayoutAt: '2026-05-05T09:00:00.000Z',
      },
    });

    await setup.useCase.execute({ refundId: 'refund_1' });

    expect(setup.balanceService.getBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'pr_1',
        currencyCode: 'USD',
        tx: expect.any(Object),
      }),
    );
    const entriesArg =
      setup.ledgerRepository.createManyLedgerEntries.mock.calls[0][0];
    expect(entriesArg[0].amount.toFixed(2)).toBe('50.00');
    expect(entriesArg[1].amount.toFixed(2)).toBe('40.00');
    expect(
      setup.practitionerRecoveryService.createRecoveryForRefund,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'pr_1',
        refundId: 'refund_1',
        paymentId: 'payment_1',
        sessionId: 'session_1',
        sessionEarningReviewId: 'review_1',
        amount: new Prisma.Decimal('10.00'),
        currencyCode: 'USD',
      }),
    );
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

  it('uses the provided transaction when one is supplied', async () => {
    const setup = buildUseCase();
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      sessionEarningReview: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as never;

    await setup.useCase.execute({ refundId: 'refund_1', tx });

    expect(setup.prisma.$transaction).not.toHaveBeenCalled();
    expect(setup.accountingJournalPostingService.postRefundSucceeded).toHaveBeenCalledWith(
      expect.objectContaining({
        tx,
      }),
    );
  });
});
