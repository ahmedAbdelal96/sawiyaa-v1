import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PostPaymentLedgerEntriesUseCase } from './post-payment-ledger-entries.use-case';

describe('PostPaymentLedgerEntriesUseCase', () => {
  function buildUseCase(input?: { payment?: any; existingEntries?: any[] }) {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    };
    const financialOperationsPaymentRepository = {
      findCapturedPaymentById: jest.fn().mockResolvedValue(
        input && 'payment' in input
          ? input.payment
          : {
              id: 'payment_1',
              status: PaymentStatus.CAPTURED,
              practitionerId: 'pr_1',
              sessionId: 'session_1',
              currencyCode: 'USD',
              amountFromGateway: new Prisma.Decimal('100.00'),
              amountFromWallet: new Prisma.Decimal('0.00'),
              amountTotal: new Prisma.Decimal('100.00'),
              commissionRuleId: null,
              commissionPlatformRatePercent: null,
              commissionPractitionerRatePercent: null,
              metadataJson: {
                financialBreakdown: {
                  practitionerShareAmount: '70.00',
                  platformCommissionAmount: '30.00',
                },
              },
            },
      ),
    };
    const ledgerRepository = {
      findByPaymentId: jest
        .fn()
        .mockResolvedValue(input?.existingEntries ?? []),
      createManyLedgerEntries: jest.fn().mockResolvedValue({ count: 2 }),
    };
    const extractPaymentLedgerBreakdownService = {
      extract: jest.fn().mockReturnValue({
        practitionerShareAmount: '70.00',
        platformCommissionAmount: '30.00',
        currencyCode: 'USD',
      }),
    };
    const refreshPractitionerWalletService = {
      refresh: jest.fn().mockResolvedValue({}),
    };
    const accountingJournalPostingService = {
      postPaymentCaptured: jest.fn().mockResolvedValue({}),
    };

    const useCase = new PostPaymentLedgerEntriesUseCase(
      prisma as never,
      financialOperationsPaymentRepository as never,
      ledgerRepository as never,
      extractPaymentLedgerBreakdownService as never,
      refreshPractitionerWalletService as never,
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

  it('posts payment ledger entries and accounting journal', async () => {
    const setup = buildUseCase();

    await setup.useCase.execute({ paymentId: 'payment_1' });

    expect(
      setup.ledgerRepository.createManyLedgerEntries,
    ).toHaveBeenCalledTimes(1);
    expect(setup.refreshPractitionerWalletService.refresh).toHaveBeenCalledTimes(
      1,
    );
    expect(
      setup.accountingJournalPostingService.postPaymentCaptured,
    ).toHaveBeenCalledTimes(1);
  });

  it('is idempotent when payment ledger already posted', async () => {
    const setup = buildUseCase({
      existingEntries: [{ id: 'entry_1' }],
    });

    const result = await setup.useCase.execute({ paymentId: 'payment_1' });

    expect(result.wasAlreadyPosted).toBe(true);
    expect(
      setup.accountingJournalPostingService.postPaymentCaptured,
    ).not.toHaveBeenCalled();
  });

  it('rejects non-captured payments', async () => {
    const setup = buildUseCase({
      payment: {
        id: 'payment_1',
        status: PaymentStatus.PENDING,
      },
    });

    await expect(
      setup.useCase.execute({ paymentId: 'payment_1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when payment is missing', async () => {
    const setup = buildUseCase({
      payment: null,
    });

    await expect(
      setup.useCase.execute({ paymentId: 'payment_1' }),
    ).rejects.toThrow(NotFoundException);
  });
});

