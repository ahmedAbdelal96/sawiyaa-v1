/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { LedgerRepository } from '../repositories/ledger.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
import { PractitionerRecoveryService } from './practitioner-recovery.service';
import { RefreshPractitionerWalletService } from './refresh-practitioner-wallet.service';
import { RecordSettlementPayoutService } from './record-settlement-payout.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountingJournalPostingService } from './accounting-journal-posting.service';
import {
  Prisma,
  SettlementPayoutMethod,
  SettlementPayoutSource,
} from '@prisma/client';

describe('RecordSettlementPayoutService', () => {
  const prisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    ledgerEntry: {
      groupBy: jest.fn(),
    },
  } as unknown as PrismaService;
  const settlementRepository = {
    updatePractitionerSettlement: jest.fn(),
  } as unknown as SettlementRepository;
  const settlementPayoutRepository = {
    createSettlementPayout: jest.fn(),
    findSettlementPayoutByExternalPayoutRef: jest.fn(),
    findSettlementPayoutByIdempotencyKey: jest.fn(),
  } as unknown as SettlementPayoutRepository;
  const ledgerRepository = {
    createLedgerEntry: jest.fn(),
  } as unknown as LedgerRepository;
  const practitionerRecoveryService = {
    applyOpenRecoveriesToPayout: jest.fn().mockResolvedValue({
      appliedAmount: new Prisma.Decimal('0.00'),
      appliedCount: 0,
      wasAlreadyApplied: false,
    }),
  } as unknown as PractitionerRecoveryService;
  const refreshPractitionerWalletService = {
    refresh: jest.fn(),
  } as unknown as RefreshPractitionerWalletService;
  const mapper = {
    toSettlementPayout: jest.fn((input) => input),
  } as unknown as FinancialOperationsMapper;
  const accountingJournalPostingService = {
    postPractitionerPayout: jest.fn(),
  } as unknown as AccountingJournalPostingService;

  const service = new RecordSettlementPayoutService(
    prisma,
    settlementRepository,
    settlementPayoutRepository,
    ledgerRepository,
    practitionerRecoveryService,
    refreshPractitionerWalletService,
    mapper,
    accountingJournalPostingService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.ledgerEntry.groupBy as jest.Mock).mockResolvedValue([
      {
        direction: 'CREDIT',
        _sum: { amount: new Prisma.Decimal('120.00') },
      },
    ]);
    (
      settlementPayoutRepository.findSettlementPayoutByExternalPayoutRef as jest.Mock
    ).mockResolvedValue(null);
    (
      settlementPayoutRepository.findSettlementPayoutByIdempotencyKey as jest.Mock
    ).mockResolvedValue(null);
  });

  it('records a completed payout with ledger and wallet refresh', async () => {
    (
      settlementPayoutRepository.createSettlementPayout as jest.Mock
    ).mockResolvedValue({
      id: 'payout_1',
      batch: {
        slug: 'set_2026_04_egp',
        periodYear: 2026,
        periodMonth: 4,
        status: 'GENERATED',
      },
      processedByUser: { displayName: 'Admin' },
    });
    (
      settlementRepository.updatePractitionerSettlement as jest.Mock
    ).mockResolvedValue({
      id: 'settlement_1',
    });
    (ledgerRepository.createLedgerEntry as jest.Mock).mockResolvedValue({
      id: 'ledger_1',
    });
    (refreshPractitionerWalletService.refresh as jest.Mock).mockResolvedValue(
      undefined,
    );
    (
      accountingJournalPostingService.postPractitionerPayout as jest.Mock
    ).mockResolvedValue({
      journalEntry: { id: 'journal_1', lines: [] },
      wasAlreadyPosted: false,
    });

    const result = await service.execute(
      {
        settlement: {
          id: 'settlement_1',
          batchId: 'batch_1',
          practitionerId: 'pract_1',
          status: 'READY',
          amountNet: new Prisma.Decimal('120.00'),
          amountPaidTotal: new Prisma.Decimal('0.00'),
          currencyCode: 'EGP',
          notes: null,
          batch: {
            id: 'batch_1',
            slug: 'set_2026_04_egp',
            periodYear: 2026,
            periodMonth: 4,
            currencyCode: 'EGP',
            status: 'GENERATED',
          },
        } as never,
        amountPaid: '120.00',
        payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
        payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
        externalPayoutRef: 'bank-123',
        notes: 'Manual payout',
        processedByUserId: 'admin_1',
      },
      undefined,
    );

    expect(
      settlementPayoutRepository.createSettlementPayout,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
        payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
        externalPayoutRef: 'bank-123',
        processedByUserId: 'admin_1',
      }),
      undefined,
    );
    expect(
      settlementRepository.updatePractitionerSettlement,
    ).toHaveBeenCalledWith(
      'settlement_1',
      expect.objectContaining({
        status: 'PAID',
      }),
      undefined,
    );
    expect(ledgerRepository.createLedgerEntry).toHaveBeenCalled();
    expect(
      practitionerRecoveryService.applyOpenRecoveriesToPayout,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        payoutId: 'payout_1',
        payoutAmount: new Prisma.Decimal('120.00'),
        practitionerId: 'pract_1',
        currencyCode: 'EGP',
        operatorUserId: 'admin_1',
      }),
    );
    expect(refreshPractitionerWalletService.refresh).toHaveBeenCalledWith(
      'pract_1',
      undefined,
    );
    expect(
      accountingJournalPostingService.postPractitionerPayout,
    ).toHaveBeenCalledTimes(1);
    expect(result.payoutRecord.id).toBe('payout_1');
  });

  it('creates a first partial payout and a second installment for the same settlement', async () => {
    (prisma.ledgerEntry.groupBy as jest.Mock)
      .mockResolvedValueOnce([
        {
          direction: 'CREDIT',
          _sum: { amount: new Prisma.Decimal('120.00') },
        },
      ])
      .mockResolvedValueOnce([
        {
          direction: 'CREDIT',
          _sum: { amount: new Prisma.Decimal('80.00') },
        },
      ]);
    (
      settlementPayoutRepository.createSettlementPayout as jest.Mock
    )
      .mockResolvedValueOnce({
        id: 'payout_1',
        batch: {
          slug: 'set_2026_04_egp',
          periodYear: 2026,
          periodMonth: 4,
          status: 'GENERATED',
        },
        processedByUser: { displayName: 'Admin' },
      })
      .mockResolvedValueOnce({
        id: 'payout_2',
        batch: {
          slug: 'set_2026_04_egp',
          periodYear: 2026,
          periodMonth: 4,
          status: 'GENERATED',
        },
        processedByUser: { displayName: 'Admin' },
      });
    (
      settlementRepository.updatePractitionerSettlement as jest.Mock
    )
      .mockResolvedValueOnce({
        id: 'settlement_1',
        status: 'PROCESSING',
        amountPaidTotal: new Prisma.Decimal('40.00'),
      })
      .mockResolvedValueOnce({
        id: 'settlement_1',
        status: 'PAID',
        amountPaidTotal: new Prisma.Decimal('120.00'),
      });
    (ledgerRepository.createLedgerEntry as jest.Mock).mockResolvedValue({
      id: 'ledger_2',
    });
    (refreshPractitionerWalletService.refresh as jest.Mock).mockResolvedValue(
      undefined,
    );
    (
      accountingJournalPostingService.postPractitionerPayout as jest.Mock
    ).mockResolvedValue({
      journalEntry: { id: 'journal_2', lines: [] },
      wasAlreadyPosted: false,
    });

    const first = await service.execute(
      {
        settlement: {
          id: 'settlement_1',
          batchId: 'batch_1',
          practitionerId: 'pract_1',
          status: 'PROCESSING',
          amountNet: new Prisma.Decimal('120.00'),
          amountPaidTotal: new Prisma.Decimal('0.00'),
          currencyCode: 'EGP',
          notes: null,
          batch: {
            id: 'batch_1',
            slug: 'set_2026_04_egp',
            periodYear: 2026,
            periodMonth: 4,
            currencyCode: 'EGP',
            status: 'GENERATED',
          },
        } as never,
        amountPaid: '40.00',
        payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
        payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
        externalPayoutRef: 'bank-123',
        idempotencyKey: 'settlement-payout-1',
        notes: 'First installment',
        processedByUserId: 'admin_1',
      },
      undefined,
    );

    const second = await service.execute(
      {
        settlement: {
          id: 'settlement_1',
          batchId: 'batch_1',
          practitionerId: 'pract_1',
          status: 'PROCESSING',
          amountNet: new Prisma.Decimal('120.00'),
          amountPaidTotal: new Prisma.Decimal('40.00'),
          currencyCode: 'EGP',
          notes: null,
          batch: {
            id: 'batch_1',
            slug: 'set_2026_04_egp',
            periodYear: 2026,
            periodMonth: 4,
            currencyCode: 'EGP',
            status: 'GENERATED',
          },
        } as never,
        amountPaid: '80.00',
        payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
        payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
        externalPayoutRef: 'bank-124',
        idempotencyKey: 'settlement-payout-2',
        notes: 'Second installment',
        processedByUserId: 'admin_1',
      },
      undefined,
    );

    expect(first.payoutRecord.id).toBe('payout_1');
    expect(second.payoutRecord.id).toBe('payout_2');
    expect(
      settlementRepository.updatePractitionerSettlement,
    ).toHaveBeenNthCalledWith(
      1,
      'settlement_1',
      expect.objectContaining({
        status: 'PROCESSING',
        amountPaidTotal: new Prisma.Decimal('40.00'),
      }),
      undefined,
    );
    expect(
      settlementRepository.updatePractitionerSettlement,
    ).toHaveBeenNthCalledWith(
      2,
      'settlement_1',
      expect.objectContaining({
        status: 'PAID',
        amountPaidTotal: new Prisma.Decimal('120.00'),
      }),
      undefined,
    );
    expect(
      accountingJournalPostingService.postPractitionerPayout,
    ).toHaveBeenCalledTimes(2);
  });

  it('returns the existing payout when the external payout ref is reused', async () => {
    (
      settlementPayoutRepository.findSettlementPayoutByExternalPayoutRef as jest.Mock
    ).mockResolvedValue({
      id: 'payout_existing',
      settlementId: 'settlement_1',
      batch: {
        slug: 'set_2026_04_egp',
        periodYear: 2026,
        periodMonth: 4,
        status: 'GENERATED',
      },
      processedByUser: { displayName: 'Admin' },
    });
    (
      settlementPayoutRepository.findSettlementPayoutByIdempotencyKey as jest.Mock
    ).mockResolvedValue(null);

    const result = await service.execute(
      {
        settlement: {
          id: 'settlement_1',
          batchId: 'batch_1',
          practitionerId: 'pract_1',
          status: 'PROCESSING',
          amountNet: new Prisma.Decimal('120.00'),
          amountPaidTotal: new Prisma.Decimal('0.00'),
          currencyCode: 'EGP',
          batch: {
            id: 'batch_1',
            slug: 'set_2026_04_egp',
            periodYear: 2026,
            periodMonth: 4,
            currencyCode: 'EGP',
            status: 'GENERATED',
          },
        } as never,
        amountPaid: '120.00',
        payoutMethod: SettlementPayoutMethod.CASH,
        payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
        externalPayoutRef: 'bank-123',
      },
      undefined,
    );

    expect(result.payoutRecord.id).toBe('payout_existing');
    expect(
      settlementPayoutRepository.createSettlementPayout,
    ).not.toHaveBeenCalled();
  });

  it('returns the existing payout when the idempotency key is reused', async () => {
    (
      settlementPayoutRepository.findSettlementPayoutByExternalPayoutRef as jest.Mock
    ).mockResolvedValue(null);
    (
      settlementPayoutRepository.findSettlementPayoutByIdempotencyKey as jest.Mock
    ).mockResolvedValue({
      id: 'payout_existing',
      settlementId: 'settlement_1',
      batch: {
        slug: 'set_2026_04_egp',
        periodYear: 2026,
        periodMonth: 4,
        status: 'GENERATED',
      },
      processedByUser: { displayName: 'Admin' },
    });

    const result = await service.execute(
      {
        settlement: {
          id: 'settlement_1',
          batchId: 'batch_1',
          practitionerId: 'pract_1',
          status: 'PROCESSING',
          amountNet: new Prisma.Decimal('120.00'),
          amountPaidTotal: new Prisma.Decimal('0.00'),
          currencyCode: 'EGP',
          batch: {
            id: 'batch_1',
            slug: 'set_2026_04_egp',
            periodYear: 2026,
            periodMonth: 4,
            currencyCode: 'EGP',
            status: 'GENERATED',
          },
        } as never,
        amountPaid: '120.00',
        payoutMethod: SettlementPayoutMethod.CASH,
        payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
        idempotencyKey: 'settlement-payout-key-1',
      },
      undefined,
    );

    expect(result.payoutRecord.id).toBe('payout_existing');
    expect(
      settlementPayoutRepository.createSettlementPayout,
    ).not.toHaveBeenCalled();
  });

  it('blocks settlement payouts when the reserved ledger balance is insufficient', async () => {
    (prisma.ledgerEntry.groupBy as jest.Mock).mockResolvedValue([
      {
        direction: 'CREDIT',
        _sum: { amount: new Prisma.Decimal('0.00') },
      },
    ]);

    await expect(
      service.execute(
        {
          settlement: {
            id: 'settlement_1',
            batchId: 'batch_1',
            practitionerId: 'pract_1',
            status: 'READY',
            amountNet: new Prisma.Decimal('120.00'),
            amountPaidTotal: new Prisma.Decimal('0.00'),
            currencyCode: 'EGP',
            batch: {
              id: 'batch_1',
              slug: 'set_2026_04_egp',
              periodYear: 2026,
              periodMonth: 4,
              currencyCode: 'EGP',
              status: 'GENERATED',
            },
          } as never,
          amountPaid: '120.00',
          payoutMethod: SettlementPayoutMethod.CASH,
          payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
          externalPayoutRef: 'bank-insufficient',
        },
        undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      settlementPayoutRepository.createSettlementPayout,
    ).not.toHaveBeenCalled();
  });

  it('rejects overpayment against the remaining settlement balance', async () => {
    await expect(
      service.execute(
        {
          settlement: {
            id: 'settlement_1',
            batchId: 'batch_1',
            practitionerId: 'pract_1',
            status: 'READY',
            amountNet: new Prisma.Decimal('120.00'),
            amountPaidTotal: new Prisma.Decimal('40.00'),
            currencyCode: 'EGP',
            batch: {
              id: 'batch_1',
              slug: 'set_2026_04_egp',
              periodYear: 2026,
              periodMonth: 4,
              currencyCode: 'EGP',
              status: 'GENERATED',
            },
          } as never,
          amountPaid: '90.00',
          payoutMethod: SettlementPayoutMethod.CASH,
          payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
          externalPayoutRef: 'bank-overpay',
        },
        undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      settlementPayoutRepository.createSettlementPayout,
    ).not.toHaveBeenCalled();
  });

  it('blocks duplicate external payout refs for a different settlement', async () => {
    (
      settlementPayoutRepository.findSettlementPayoutByExternalPayoutRef as jest.Mock
    ).mockResolvedValue({
      id: 'payout_conflict',
      settlementId: 'another_settlement',
      batch: {
        slug: 'set_2026_04_egp',
        periodYear: 2026,
        periodMonth: 4,
        status: 'GENERATED',
      },
      processedByUser: { displayName: 'Admin' },
    });

    await expect(
      service.execute(
        {
          settlement: {
            id: 'settlement_1',
            batchId: 'batch_1',
            practitionerId: 'pract_1',
            status: 'READY',
            amountNet: new Prisma.Decimal('120.00'),
            amountPaidTotal: new Prisma.Decimal('0.00'),
            currencyCode: 'EGP',
            batch: {
              id: 'batch_1',
              slug: 'set_2026_04_egp',
              periodYear: 2026,
              periodMonth: 4,
              currencyCode: 'EGP',
              status: 'GENERATED',
            },
          } as never,
          amountPaid: '120.00',
          payoutMethod: SettlementPayoutMethod.CASH,
          payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
          externalPayoutRef: 'bank-dup',
        },
        undefined,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks invalid settlement statuses for payout recording', async () => {
    await expect(
      service.execute(
        {
          settlement: {
            id: 'settlement_1',
            batchId: 'batch_1',
            practitionerId: 'pract_1',
            status: 'FAILED',
            amountNet: new Prisma.Decimal('120.00'),
            amountPaidTotal: new Prisma.Decimal('0.00'),
            currencyCode: 'EGP',
            batch: {
              id: 'batch_1',
              slug: 'set_2026_04_egp',
              periodYear: 2026,
              periodMonth: 4,
              currencyCode: 'EGP',
              status: 'GENERATED',
            },
          } as never,
          amountPaid: '120.00',
          payoutMethod: SettlementPayoutMethod.CASH,
          payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
        },
        undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
