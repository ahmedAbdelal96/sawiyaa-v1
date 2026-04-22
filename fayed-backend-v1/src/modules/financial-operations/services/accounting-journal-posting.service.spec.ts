import {
  JournalEntrySourceType,
  LedgerDirection,
  Prisma,
  RefundDestination,
} from '@prisma/client';
import { AccountingJournalPostingService } from './accounting-journal-posting.service';

describe('AccountingJournalPostingService', () => {
  function buildService(input?: {
    existingSource?: { sourceType: JournalEntrySourceType; sourceId: string } | null;
  }) {
    const ledgerAccountUpsert = jest
      .fn()
      .mockImplementation(async ({ where }: any) => ({
        id: `${where.code_currencyCode.code}_id`,
        code: where.code_currencyCode.code,
      }));

    const journalEntryFindUnique = jest.fn().mockImplementation(({ where }: any) => {
      if (
        input?.existingSource &&
        where.sourceType_sourceId.sourceType === input.existingSource.sourceType &&
        where.sourceType_sourceId.sourceId === input.existingSource.sourceId
      ) {
        return {
          id: 'journal_existing',
          sourceType: where.sourceType_sourceId.sourceType,
          sourceId: where.sourceType_sourceId.sourceId,
          lines: [{ id: 'line_existing' }],
        };
      }
      return null;
    });
    const journalEntryCreate = jest.fn().mockResolvedValue({
      id: 'journal_1',
    });
    const journalEntryFindUniqueOrThrow = jest.fn().mockResolvedValue({
      id: 'journal_1',
      lines: [{ id: 'line_1' }, { id: 'line_2' }],
    });
    const journalLineCreateMany = jest.fn().mockResolvedValue({ count: 2 });

    const tx = {
      ledgerAccount: { upsert: ledgerAccountUpsert },
      journalEntry: {
        findUnique: journalEntryFindUnique,
        create: journalEntryCreate,
        findUniqueOrThrow: journalEntryFindUniqueOrThrow,
      },
      journalLine: { createMany: journalLineCreateMany },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
    };
    const moneyAmountService = {
      toDecimal: (value: Prisma.Decimal | string | number) =>
        new Prisma.Decimal(value),
    };
    const accountingLedgerAccountService = {
      ensurePlatformAccounts: jest.fn().mockResolvedValue({
        platformCashAccountId: 'platform_cash',
        gatewayClearingAccountId: 'gateway_clearing',
        platformRevenueAccountId: 'platform_revenue',
        transferFeeRecoveryRevenueAccountId: 'transfer_fee_recovery_revenue',
        customerWalletLiabilityAccountId: 'wallet_liability',
        vatPayableAccountId: 'vat_payable',
        gatewayFeesExpenseAccountId: 'gateway_fees_expense',
        transferFeesExpenseAccountId: 'transfer_fees_expense',
        refundAdjustmentsAccountId: 'refund_adjustments',
      }),
      ensurePractitionerPayableAccount: jest
        .fn()
        .mockResolvedValue('practitioner_payable'),
    };

    const service = new AccountingJournalPostingService(
      prisma as never,
      moneyAmountService as never,
      accountingLedgerAccountService as never,
    );

    return {
      service,
      prisma,
      accountingLedgerAccountService,
      journalEntryCreate,
      journalLineCreateMany,
    };
  }

  it('posts payment captured journal entries with balanced lines', async () => {
    const setup = buildService();

    const result = await setup.service.postPaymentCaptured({
      payment: {
        id: 'payment_1',
        practitionerId: 'pr_1',
        currencyCode: 'USD',
        amountFromGateway: new Prisma.Decimal('100.00'),
        amountFromWallet: new Prisma.Decimal('0.00'),
        amountTotal: new Prisma.Decimal('100.00'),
        commissionRuleId: null,
        commissionPlatformRatePercent: null,
        commissionPractitionerRatePercent: null,
        vatRatePercentSnapshot: null,
        vatAmountSnapshot: null,
        gatewayFeeRatePercentSnapshot: null,
        gatewayFeeFixedAmountSnapshot: null,
        gatewayFeeAmountSnapshot: null,
        metadataJson: null,
        capturedAt: new Date('2026-04-22T00:00:00.000Z'),
      },
      breakdown: {
        practitionerShareAmount: '70.00',
        platformCommissionAmount: '30.00',
        currencyCode: 'USD',
      },
    });

    expect(result.wasAlreadyPosted).toBe(false);
    expect(setup.journalEntryCreate).toHaveBeenCalledTimes(1);
    expect(setup.journalLineCreateMany).toHaveBeenCalledTimes(1);
  });

  it('is idempotent for existing payment captured source', async () => {
    const setup = buildService({
      existingSource: {
        sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
        sourceId: 'payment_1',
      },
    });

    const result = await setup.service.postPaymentCaptured({
      payment: {
        id: 'payment_1',
        practitionerId: 'pr_1',
        currencyCode: 'USD',
        amountFromGateway: new Prisma.Decimal('100.00'),
        amountFromWallet: new Prisma.Decimal('0.00'),
        amountTotal: new Prisma.Decimal('100.00'),
        commissionRuleId: null,
        commissionPlatformRatePercent: null,
        commissionPractitionerRatePercent: null,
        vatRatePercentSnapshot: null,
        vatAmountSnapshot: null,
        gatewayFeeRatePercentSnapshot: null,
        gatewayFeeFixedAmountSnapshot: null,
        gatewayFeeAmountSnapshot: null,
        metadataJson: null,
        capturedAt: new Date('2026-04-22T00:00:00.000Z'),
      },
      breakdown: {
        practitionerShareAmount: '70.00',
        platformCommissionAmount: '30.00',
        currencyCode: 'USD',
      },
    });

    expect(result.wasAlreadyPosted).toBe(true);
    expect(setup.journalEntryCreate).not.toHaveBeenCalled();
  });

  it('posts VAT payable and gateway fee expense lines when snapshots are present', async () => {
    const setup = buildService();

    await setup.service.postPaymentCaptured({
      payment: {
        id: 'payment_2',
        practitionerId: 'pr_1',
        currencyCode: 'USD',
        amountFromGateway: new Prisma.Decimal('100.00'),
        amountFromWallet: new Prisma.Decimal('0.00'),
        amountTotal: new Prisma.Decimal('100.00'),
        commissionRuleId: null,
        commissionPlatformRatePercent: null,
        commissionPractitionerRatePercent: null,
        vatRatePercentSnapshot: new Prisma.Decimal('14.00'),
        vatAmountSnapshot: new Prisma.Decimal('4.20'),
        gatewayFeeRatePercentSnapshot: new Prisma.Decimal('2.90'),
        gatewayFeeFixedAmountSnapshot: new Prisma.Decimal('0.30'),
        gatewayFeeAmountSnapshot: new Prisma.Decimal('3.20'),
        metadataJson: null,
        capturedAt: new Date('2026-04-22T00:00:00.000Z'),
      },
      breakdown: {
        practitionerShareAmount: '70.00',
        platformCommissionAmount: '30.00',
        currencyCode: 'USD',
      },
    });

    const createdLines = setup.journalLineCreateMany.mock.calls[0][0]
      .data as Array<{ ledgerAccountId: string; direction: LedgerDirection }>;
    const vatPayableCredit = createdLines.find(
      (line) =>
        line.ledgerAccountId === 'vat_payable' &&
        line.direction === LedgerDirection.CREDIT,
    );
    const gatewayFeeExpenseDebit = createdLines.find(
      (line) =>
        line.ledgerAccountId === 'gateway_fees_expense' &&
        line.direction === LedgerDirection.DEBIT,
    );
    expect(vatPayableCredit).toBeDefined();
    expect(gatewayFeeExpenseDebit).toBeDefined();
  });

  it('posts refund to wallet with wallet liability credit line', async () => {
    const setup = buildService();

    await setup.service.postRefundSucceeded({
      refund: {
        id: 'refund_1',
        paymentId: 'payment_1',
        practitionerId: 'pr_1',
        amount: new Prisma.Decimal('20.00'),
        currencyCode: 'USD',
        processedAt: new Date('2026-04-22T00:00:00.000Z'),
        destination: RefundDestination.CUSTOMER_WALLET,
      },
      split: {
        practitionerRefundAmount: '14.00',
        platformRefundAmount: '6.00',
      },
    });

    const createdLines = setup.journalLineCreateMany.mock.calls[0][0]
      .data as Array<{ ledgerAccountId: string; direction: LedgerDirection }>;
    const walletLiabilityCredit = createdLines.find(
      (line) =>
        line.ledgerAccountId === 'wallet_liability' &&
        line.direction === LedgerDirection.CREDIT,
    );
    expect(walletLiabilityCredit).toBeDefined();
    const refundMetadata = setup.journalEntryCreate.mock.calls[0][0].data
      .metadataJson as Record<string, unknown>;
    expect(refundMetadata.cancellationPolicySnapshot).toBeNull();
  });

  it('propagates cancellation policy snapshot metadata for policy-driven refunds', async () => {
    const setup = buildService();

    await setup.service.postRefundSucceeded({
      refund: {
        id: 'refund_2',
        paymentId: 'payment_1',
        practitionerId: 'pr_1',
        amount: new Prisma.Decimal('20.00'),
        currencyCode: 'USD',
        processedAt: new Date('2026-04-22T00:00:00.000Z'),
        destination: RefundDestination.CUSTOMER_WALLET,
        metadataJson: {
          source: 'session-cancellation-policy',
          policyRecordId: 'policy_1',
          policy: { id: 'policy_1', version: 2 },
          financialAllocation: { refundPercent: '50.00' },
        },
      },
      split: {
        practitionerRefundAmount: '14.00',
        platformRefundAmount: '6.00',
      },
    });

    const refundMetadata = setup.journalEntryCreate.mock.calls[0][0].data
      .metadataJson as Record<string, unknown>;
    const cancellationPolicySnapshot = refundMetadata[
      'cancellationPolicySnapshot'
    ] as Record<string, unknown>;
    expect(cancellationPolicySnapshot).toBeDefined();
    expect(cancellationPolicySnapshot['policyRecordId']).toBe('policy_1');
  });

  it('posts payout transfer fee recovery when fee is deducted from practitioner', async () => {
    const setup = buildService();

    await setup.service.postPractitionerPayout({
      payout: {
        payoutId: 'payout_1',
        settlementId: 'settlement_1',
        practitionerId: 'pr_1',
        amountPaid: new Prisma.Decimal('98.00'),
        settlementAppliedAmount: new Prisma.Decimal('100.00'),
        currencyCode: 'USD',
        effectiveAt: new Date('2026-04-22T00:00:00.000Z'),
        payoutMethodSnapshot: {
          transferFeeAmount: '2.00',
        },
        transferFeeAmount: new Prisma.Decimal('2.00'),
        transferFeeTreatment: 'DEDUCT_FROM_PRACTITIONER',
      },
    });

    const createdLines = setup.journalLineCreateMany.mock.calls[0][0]
      .data as Array<{ ledgerAccountId: string; direction: LedgerDirection }>;
    const recoveryCredit = createdLines.find(
      (line) =>
        line.ledgerAccountId === 'transfer_fee_recovery_revenue' &&
        line.direction === LedgerDirection.CREDIT,
    );
    expect(recoveryCredit).toBeDefined();
  });
});
