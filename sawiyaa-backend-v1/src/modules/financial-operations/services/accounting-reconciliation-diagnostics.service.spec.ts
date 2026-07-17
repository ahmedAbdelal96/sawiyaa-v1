import {
  CustomerWalletEntryDirection,
  CustomerWalletEntryType,
  LedgerDirection,
  LedgerEntryType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PackageSettlementStatus,
  RefundDestination,
  RefundStatus,
} from '@prisma/client';
import { AccountingReconciliationService } from './accounting-reconciliation.service';
import { AccountingReconciliationDiagnosticsService } from './accounting-reconciliation-diagnostics.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { PrismaService } from '@common/prisma/prisma.service';
import { ExtractPaymentLedgerBreakdownService } from './extract-payment-ledger-breakdown.service';

function buildService() {
  const prisma = {
    payment: {
      findUnique: jest.fn(),
    },
    journalEntry: {
      findUnique: jest.fn(),
    },
    couponRedemption: {
      findFirst: jest.fn(),
    },
    practitionerWallet: {
      findUnique: jest.fn(),
    },
    settlementBatch: {
      findUnique: jest.fn(),
    },
    practitionerSettlement: {
      findUnique: jest.fn(),
    },
    refund: {
      findUnique: jest.fn(),
    },
    practitionerRecovery: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    customerWallet: {
      findUnique: jest.fn(),
    },
    customerWalletEntry: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    customerWalletReservation: {
      findMany: jest.fn(),
    },
    packageSettlement: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const ledgerRepository = {
    findByPaymentId: jest.fn(),
    aggregatePractitionerBalances: jest.fn(),
    findByRefundId: jest.fn(),
    findByReference: jest.fn(),
  } as unknown as LedgerRepository;

  const extractPaymentLedgerBreakdownService = {
    extract: jest.fn(),
  } as unknown as ExtractPaymentLedgerBreakdownService;

  const service = new AccountingReconciliationDiagnosticsService(
    prisma,
    ledgerRepository,
    new AccountingReconciliationService(),
    extractPaymentLedgerBreakdownService,
  );

  return {
    service,
    prisma: prisma as unknown as {
      payment: { findUnique: jest.Mock };
      journalEntry: { findUnique: jest.Mock };
      couponRedemption: { findFirst: jest.Mock };
      practitionerWallet: { findUnique: jest.Mock };
      settlementBatch: { findUnique: jest.Mock };
      practitionerSettlement: { findUnique: jest.Mock };
      refund: { findUnique: jest.Mock };
      practitionerRecovery: { findMany: jest.Mock };
      customerWallet: { findUnique: jest.Mock };
      customerWalletEntry: { findFirst: jest.Mock; findMany: jest.Mock };
      customerWalletReservation: { findMany: jest.Mock };
      packageSettlement: { findUnique: jest.Mock };
    },
    ledgerRepository,
    extractPaymentLedgerBreakdownService,
  };
}

describe('AccountingReconciliationDiagnosticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reconciles a captured session payment with coupon and ledger snapshots', async () => {
    const setup = buildService();

    setup.prisma.payment.findUnique.mockResolvedValue({
      id: 'payment_1',
      status: PaymentStatus.CAPTURED,
      paymentPurpose: PaymentPurpose.SESSION_BOOKING,
      sessionId: 'session_1',
      practitionerId: 'pract_1',
      patientId: 'patient_1',
      currencyCode: 'EGP',
      amountSubtotal: new Prisma.Decimal('100.00'),
      amountDiscount: new Prisma.Decimal('10.00'),
      amountTotal: new Prisma.Decimal('90.00'),
      amountFromWallet: new Prisma.Decimal('0.00'),
      amountFromGateway: new Prisma.Decimal('90.00'),
      couponId: 'coupon_1',
      couponCodeSnapshot: 'QA10',
      couponDiscountSnapshot: new Prisma.Decimal('10.00'),
      couponPlatformShareSnapshot: new Prisma.Decimal('50.00'),
      couponPractitionerShareSnapshot: new Prisma.Decimal('50.00'),
      vatAmountSnapshot: new Prisma.Decimal('0.00'),
      gatewayFeeAmountSnapshot: new Prisma.Decimal('0.00'),
      commissionRuleId: 'rule_1',
      commissionPlatformRatePercent: new Prisma.Decimal('30.00'),
      commissionPractitionerRatePercent: new Prisma.Decimal('70.00'),
      metadataJson: {
        financialBreakdown: {
          practitionerShareAmount: '63.00',
          platformCommissionAmount: '27.00',
        },
      },
      coupon: {
        id: 'coupon_1',
        code: 'QA10',
        ownerPractitionerId: 'pract_1',
        couponScope: 'PRACTITIONER_SESSIONS',
        status: 'ACTIVE',
        discountType: 'PERCENTAGE',
        discountValue: new Prisma.Decimal('10.00'),
        platformSharePercent: new Prisma.Decimal('50.00'),
        practitionerSharePercent: new Prisma.Decimal('50.00'),
      },
    });
    setup.prisma.journalEntry.findUnique.mockResolvedValue({
      id: 'journal_1',
      occurredAt: new Date('2026-05-15T00:00:00.000Z'),
      currencyCode: 'EGP',
      metadataJson: {
        amountTotal: '90.00',
        amountFromGateway: '90.00',
        amountFromWallet: '0.00',
        practitionerShareAmount: '63.00',
        platformCommissionAmount: '27.00',
      },
      lines: [
        {
          direction: LedgerDirection.DEBIT,
          amount: new Prisma.Decimal('90.00'),
          ledgerAccountId: 'gateway',
          referenceType: 'payment',
          referenceId: 'payment_1',
        },
        {
          direction: LedgerDirection.CREDIT,
          amount: new Prisma.Decimal('27.00'),
          ledgerAccountId: 'platform',
          referenceType: 'payment',
          referenceId: 'payment_1',
        },
        {
          direction: LedgerDirection.CREDIT,
          amount: new Prisma.Decimal('63.00'),
          ledgerAccountId: 'practitioner',
          referenceType: 'payment',
          referenceId: 'payment_1',
        },
      ],
    });
    setup.ledgerRepository.findByPaymentId.mockResolvedValue([
      {
        id: 'ledger_1',
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: LedgerDirection.CREDIT,
        amount: new Prisma.Decimal('63.00'),
        currencyCode: 'EGP',
      },
      {
        id: 'ledger_2',
        entryType: LedgerEntryType.PLATFORM_COMMISSION,
        direction: LedgerDirection.CREDIT,
        amount: new Prisma.Decimal('27.00'),
        currencyCode: 'EGP',
      },
    ]);
    setup.prisma.couponRedemption.findFirst.mockResolvedValue({
      id: 'redeem_1',
      couponId: 'coupon_1',
      sessionId: 'session_1',
      paymentId: 'payment_1',
      patientId: 'patient_1',
      practitionerId: 'pract_1',
      currencyCode: 'EGP',
      grossAmount: new Prisma.Decimal('100.00'),
      discountAmount: new Prisma.Decimal('10.00'),
      platformDiscountShare: new Prisma.Decimal('5.00'),
      practitionerDiscountShare: new Prisma.Decimal('5.00'),
    });
    setup.extractPaymentLedgerBreakdownService.extract.mockReturnValue({
      practitionerShareAmount: '63.00',
      platformCommissionAmount: '27.00',
      currencyCode: 'EGP',
    });

    const result = await setup.service.reconcilePayment('payment_1');

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.summary?.couponPresent).toBe(true);
  });

  it('keeps a pending session payment clean when nothing has posted yet', async () => {
    const setup = buildService();

    setup.prisma.payment.findUnique.mockResolvedValue({
      id: 'payment_pending',
      status: PaymentStatus.PENDING,
      paymentPurpose: PaymentPurpose.SESSION_BOOKING,
      sessionId: 'session_1',
      practitionerId: 'pract_1',
      patientId: 'patient_1',
      currencyCode: 'EGP',
      amountSubtotal: new Prisma.Decimal('0.00'),
      amountDiscount: new Prisma.Decimal('0.00'),
      amountTotal: new Prisma.Decimal('0.00'),
      amountFromWallet: new Prisma.Decimal('0.00'),
      amountFromGateway: new Prisma.Decimal('0.00'),
      couponId: null,
      couponCodeSnapshot: null,
      couponDiscountSnapshot: null,
      couponPlatformShareSnapshot: null,
      couponPractitionerShareSnapshot: null,
      vatAmountSnapshot: new Prisma.Decimal('0.00'),
      gatewayFeeAmountSnapshot: new Prisma.Decimal('0.00'),
      commissionRuleId: null,
      commissionPlatformRatePercent: null,
      commissionPractitionerRatePercent: null,
      metadataJson: null,
      coupon: null,
    });
    setup.prisma.journalEntry.findUnique.mockResolvedValue(null);
    setup.ledgerRepository.findByPaymentId.mockResolvedValue([]);
    setup.prisma.couponRedemption.findFirst.mockResolvedValue(null);
    setup.extractPaymentLedgerBreakdownService.extract.mockReturnValue({
      practitionerShareAmount: '0.00',
      platformCommissionAmount: '0.00',
      currencyCode: 'EGP',
    });

    const result = await setup.service.reconcilePayment('payment_pending');

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects practitioner wallet drift against ledger projection', async () => {
    const setup = buildService();

    setup.prisma.practitionerWallet.findUnique.mockResolvedValue({
      id: 'wallet_1',
      practitionerId: 'pract_1',
      currencyCode: 'EGP',
      availableBalance: new Prisma.Decimal('0.00'),
      pendingBalance: new Prisma.Decimal('0.00'),
      reservedBalance: new Prisma.Decimal('60.00'),
      lifetimeEarned: new Prisma.Decimal('70.00'),
      lifetimePaidOut: new Prisma.Decimal('10.00'),
      lastLedgerEntryAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    setup.ledgerRepository.aggregatePractitionerBalances.mockResolvedValue([
      {
        currencyCode: 'EGP',
        balanceBucket: 'RESERVED',
        direction: LedgerDirection.CREDIT,
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        _sum: { amount: new Prisma.Decimal('70.00') },
        _max: { effectiveAt: new Date('2026-05-15T00:00:00.000Z') },
      },
      {
        currencyCode: 'EGP',
        balanceBucket: 'RESERVED',
        direction: LedgerDirection.DEBIT,
        entryType: LedgerEntryType.SETTLEMENT_PAYOUT,
        _sum: { amount: new Prisma.Decimal('10.00') },
        _max: { effectiveAt: new Date('2026-05-15T00:00:00.000Z') },
      },
    ]);

    const result = await setup.service.reconcilePractitionerWallet(
      'pract_1',
      'EGP',
    );

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reconciles a settled practitioner settlement batch', async () => {
    const setup = buildService();

    setup.prisma.practitionerSettlement.findUnique.mockResolvedValue({
      id: 'settlement_1',
      batchId: 'batch_1',
      practitionerId: 'pract_1',
      walletId: 'wallet_1',
      amountGross: new Prisma.Decimal('100.00'),
      amountAdjustments: new Prisma.Decimal('10.00'),
      amountNet: new Prisma.Decimal('90.00'),
      amountPaidTotal: new Prisma.Decimal('90.00'),
      currencyCode: 'EGP',
      status: 'PAID',
      batch: {
        id: 'batch_1',
        currencyCode: 'EGP',
      },
      ledgerEntries: [
        {
          id: 'ledger_1',
          entryType: LedgerEntryType.PRACTITIONER_EARNING,
          direction: LedgerDirection.CREDIT,
          amount: new Prisma.Decimal('100.00'),
          currencyCode: 'EGP',
          createdAt: new Date('2026-05-15T00:00:00.000Z'),
        },
        {
          id: 'ledger_2',
          entryType: LedgerEntryType.SETTLEMENT_PAYOUT,
          direction: LedgerDirection.DEBIT,
          amount: new Prisma.Decimal('90.00'),
          currencyCode: 'EGP',
          createdAt: new Date('2026-05-15T00:00:00.000Z'),
        },
      ],
      payoutRecords: [
        {
          id: 'payout_1',
          amountPaid: new Prisma.Decimal('90.00'),
          payoutMethodSnapshot: {
            settlementAppliedAmount: '90.00',
          },
          effectiveAt: new Date('2026-05-15T00:00:00.000Z'),
          createdAt: new Date('2026-05-15T00:00:00.000Z'),
        },
      ],
    });

    const result = await setup.service.reconcileSettlement('settlement_1');

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reconciles a settlement batch with one currency only', async () => {
    const setup = buildService();

    setup.prisma.settlementBatch.findUnique.mockResolvedValue({
      id: 'batch_1',
      currencyCode: 'EGP',
      settlements: [
        {
          id: 'settlement_1',
          currencyCode: 'EGP',
          amountNet: new Prisma.Decimal('90.00'),
          amountPaidTotal: new Prisma.Decimal('90.00'),
          status: 'PAID',
        },
      ],
    });

    const result = await setup.service.reconcileSettlementBatch('batch_1');

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reconciles a succeeded refund and customer wallet credit', async () => {
    const setup = buildService();

    setup.prisma.refund.findUnique.mockResolvedValue({
      id: 'refund_1',
      paymentId: 'payment_1',
      sessionId: 'session_1',
      currencyCode: 'EGP',
      amount: new Prisma.Decimal('20.00'),
      status: RefundStatus.SUCCEEDED,
      destination: RefundDestination.CUSTOMER_WALLET,
      processedAt: new Date('2026-05-15T00:00:00.000Z'),
      metadataJson: null,
      payment: {
        id: 'payment_1',
        status: PaymentStatus.REFUNDED,
        practitionerId: 'pract_1',
        amountTotal: new Prisma.Decimal('100.00'),
        amountSubtotal: new Prisma.Decimal('100.00'),
        amountDiscount: new Prisma.Decimal('0.00'),
        currencyCode: 'EGP',
        commissionPlatformRatePercent: new Prisma.Decimal('30.00'),
        metadataJson: null,
      },
    });
    setup.prisma.journalEntry.findUnique.mockResolvedValue({
      id: 'journal_1',
      occurredAt: new Date('2026-05-15T00:00:00.000Z'),
      currencyCode: 'EGP',
      metadataJson: {
        refundAmount: '20.00',
        practitionerRefundAmount: '14.00',
        platformRefundAmount: '6.00',
      },
      lines: [
        {
          direction: LedgerDirection.DEBIT,
          amount: new Prisma.Decimal('14.00'),
          ledgerAccountId: 'practitioner',
          referenceType: 'refund',
          referenceId: 'refund_1',
        },
        {
          direction: LedgerDirection.DEBIT,
          amount: new Prisma.Decimal('6.00'),
          ledgerAccountId: 'platform',
          referenceType: 'refund',
          referenceId: 'refund_1',
        },
        {
          direction: LedgerDirection.CREDIT,
          amount: new Prisma.Decimal('20.00'),
          ledgerAccountId: 'gateway',
          referenceType: 'refund',
          referenceId: 'refund_1',
        },
      ],
    });
    setup.ledgerRepository.findByRefundId.mockResolvedValue([
      {
        id: 'ledger_1',
        entryType: LedgerEntryType.REFUND_PRACTITIONER_REVERSAL,
        direction: LedgerDirection.DEBIT,
        amount: new Prisma.Decimal('14.00'),
        currencyCode: 'EGP',
      },
      {
        id: 'ledger_2',
        entryType: LedgerEntryType.REFUND_PLATFORM_REVERSAL,
        direction: LedgerDirection.DEBIT,
        amount: new Prisma.Decimal('6.00'),
        currencyCode: 'EGP',
      },
    ]);
    setup.prisma.customerWalletEntry.findFirst.mockResolvedValue({
      id: 'wallet_entry_1',
    });
    setup.extractPaymentLedgerBreakdownService.extract.mockReturnValue({
      practitionerShareAmount: '70.00',
      platformCommissionAmount: '30.00',
      currencyCode: 'EGP',
    });

    const result = await setup.service.reconcileRefund('refund_1');

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reconciles a refund that is partly reversed in ledger and partly recovered separately', async () => {
    const setup = buildService();

    setup.prisma.refund.findUnique.mockResolvedValue({
      id: 'refund_2',
      paymentId: 'payment_2',
      sessionId: 'session_2',
      currencyCode: 'EGP',
      amount: new Prisma.Decimal('100.00'),
      status: RefundStatus.SUCCEEDED,
      destination: RefundDestination.ORIGINAL_METHOD,
      processedAt: new Date('2026-05-15T00:00:00.000Z'),
      metadataJson: null,
      payment: {
        id: 'payment_2',
        status: PaymentStatus.REFUNDED,
        practitionerId: 'pract_1',
        amountTotal: new Prisma.Decimal('200.00'),
        amountSubtotal: new Prisma.Decimal('200.00'),
        amountDiscount: new Prisma.Decimal('0.00'),
        currencyCode: 'EGP',
        commissionPlatformRatePercent: new Prisma.Decimal('30.00'),
        metadataJson: null,
      },
    });
    setup.prisma.journalEntry.findUnique.mockResolvedValue({
      id: 'journal_2',
      occurredAt: new Date('2026-05-15T00:00:00.000Z'),
      currencyCode: 'EGP',
      metadataJson: {
        refundAmount: '100.00',
        practitionerRefundAmount: '60.00',
        platformRefundAmount: '40.00',
      },
      lines: [
        {
          direction: LedgerDirection.DEBIT,
          amount: new Prisma.Decimal('60.00'),
          ledgerAccountId: 'practitioner',
          referenceType: 'refund',
          referenceId: 'refund_2',
        },
        {
          direction: LedgerDirection.DEBIT,
          amount: new Prisma.Decimal('40.00'),
          ledgerAccountId: 'platform',
          referenceType: 'refund',
          referenceId: 'refund_2',
        },
        {
          direction: LedgerDirection.CREDIT,
          amount: new Prisma.Decimal('100.00'),
          ledgerAccountId: 'gateway',
          referenceType: 'refund',
          referenceId: 'refund_2',
        },
      ],
    });
    setup.ledgerRepository.findByRefundId.mockResolvedValue([
      {
        id: 'ledger_3',
        entryType: LedgerEntryType.REFUND_PRACTITIONER_REVERSAL,
        direction: LedgerDirection.DEBIT,
        amount: new Prisma.Decimal('50.00'),
        currencyCode: 'EGP',
      },
      {
        id: 'ledger_4',
        entryType: LedgerEntryType.REFUND_PLATFORM_REVERSAL,
        direction: LedgerDirection.DEBIT,
        amount: new Prisma.Decimal('40.00'),
        currencyCode: 'EGP',
      },
    ]);
    setup.prisma.practitionerRecovery.findMany.mockResolvedValue([
      {
        amount: new Prisma.Decimal('10.00'),
        recoveredAmount: new Prisma.Decimal('0.00'),
        status: 'OPEN',
      },
    ]);
    setup.extractPaymentLedgerBreakdownService.extract.mockReturnValue({
      practitionerShareAmount: '120.00',
      platformCommissionAmount: '80.00',
      currencyCode: 'EGP',
    });

    const result = await setup.service.reconcileRefund('refund_2');

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reconciles a released package settlement', async () => {
    const setup = buildService();

    setup.prisma.packageSettlement.findUnique.mockResolvedValue({
      id: 'package_settlement_1',
      purchaseId: 'purchase_1',
      practitionerId: 'pract_1',
      patientId: 'patient_1',
      currencyCode: 'EGP',
      status: PackageSettlementStatus.RELEASED,
      sessionCount: 2,
      completedSessionsCount: 2,
      heldPractitionerAmount: new Prisma.Decimal('63.00'),
      heldPlatformAmount: new Prisma.Decimal('27.00'),
      releasablePractitionerAmount: new Prisma.Decimal('0.00'),
      releasedPractitionerAmount: new Prisma.Decimal('63.00'),
      normalEquivalentUsedAmount: new Prisma.Decimal('200.00'),
      discountAppliedAmount: new Prisma.Decimal('10.00'),
      purchase: {
        paymentId: 'payment_1',
        payment: {
          id: 'payment_1',
          currencyCode: 'EGP',
          amountSubtotal: new Prisma.Decimal('100.00'),
          amountDiscount: new Prisma.Decimal('10.00'),
          amountTotal: new Prisma.Decimal('90.00'),
        },
        sessions: [
          { id: 'session_1', status: 'COMPLETED' },
          { id: 'session_2', status: 'COMPLETED' },
        ],
      },
    });
    setup.ledgerRepository.findByReference.mockResolvedValue([
      {
        id: 'ledger_1',
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: LedgerDirection.CREDIT,
        amount: new Prisma.Decimal('63.00'),
        currencyCode: 'EGP',
      },
      {
        id: 'ledger_2',
        entryType: LedgerEntryType.PLATFORM_COMMISSION,
        direction: LedgerDirection.CREDIT,
        amount: new Prisma.Decimal('27.00'),
        currencyCode: 'EGP',
      },
    ]);

    const result = await setup.service.reconcilePackageSettlement(
      'package_settlement_1',
    );

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reconciles customer wallet balances from entries and reservations', async () => {
    const setup = buildService();

    setup.prisma.customerWallet.findUnique.mockResolvedValue({
      id: 'wallet_1',
      patientId: 'patient_1',
      currencyCode: 'EGP',
      availableBalance: new Prisma.Decimal('20.00'),
      reservedBalance: new Prisma.Decimal('20.00'),
      lifetimeCredited: new Prisma.Decimal('50.00'),
      lifetimeDebited: new Prisma.Decimal('10.00'),
      lastEntryAt: new Date('2026-05-15T00:00:00.000Z'),
    });
    setup.prisma.customerWalletEntry.findMany.mockResolvedValue([
      {
        entryType: CustomerWalletEntryType.REFUND_CREDIT,
        direction: CustomerWalletEntryDirection.CREDIT,
        amount: new Prisma.Decimal('50.00'),
        effectiveAt: new Date('2026-05-15T00:00:00.000Z'),
      },
      {
        entryType: CustomerWalletEntryType.SESSION_PAYMENT_RESERVE,
        direction: CustomerWalletEntryDirection.DEBIT,
        amount: new Prisma.Decimal('30.00'),
        effectiveAt: new Date('2026-05-15T00:00:01.000Z'),
      },
      {
        entryType: CustomerWalletEntryType.SESSION_PAYMENT_CAPTURE,
        direction: CustomerWalletEntryDirection.DEBIT,
        amount: new Prisma.Decimal('10.00'),
        effectiveAt: new Date('2026-05-15T00:00:02.000Z'),
      },
    ]);
    setup.prisma.customerWalletReservation.findMany.mockResolvedValue([
      {
        id: 'reservation_1',
        status: 'ACTIVE',
        amount: new Prisma.Decimal('20.00'),
        currencyCode: 'EGP',
      },
    ]);

    const result = await setup.service.reconcileCustomerWallet(
      'patient_1',
      'EGP',
    );

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
