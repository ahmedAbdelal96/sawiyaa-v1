import { BadRequestException, ConflictException } from '@nestjs/common';
import { LedgerRepository } from '../repositories/ledger.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
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
  } as unknown as PrismaService;
  const settlementRepository = {
    updatePractitionerSettlement: jest.fn(),
  } as unknown as SettlementRepository;
  const settlementPayoutRepository = {
    createSettlementPayout: jest.fn(),
  } as unknown as SettlementPayoutRepository;
  const ledgerRepository = {
    createLedgerEntry: jest.fn(),
  } as unknown as LedgerRepository;
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
    refreshPractitionerWalletService,
    mapper,
    accountingJournalPostingService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(refreshPractitionerWalletService.refresh).toHaveBeenCalledWith(
      'pract_1',
      undefined,
    );
    expect(
      accountingJournalPostingService.postPractitionerPayout,
    ).toHaveBeenCalledTimes(1);
    expect(result.payoutRecord.id).toBe('payout_1');
  });

  it('treats transfer fee as practitioner deduction when requested', async () => {
    (
      settlementPayoutRepository.createSettlementPayout as jest.Mock
    ).mockResolvedValue({
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
    ).mockResolvedValue({
      id: 'settlement_1',
      status: 'PAID',
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

    await service.execute(
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
        amountPaid: '118.00',
        transferFeeAmount: '2.00',
        transferFeeTreatment: 'DEDUCT_FROM_PRACTITIONER',
        payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
        payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
        externalPayoutRef: 'bank-123',
        notes: 'Manual payout with fee deduction',
        processedByUserId: 'admin_1',
      },
      undefined,
    );

    expect(
      settlementRepository.updatePractitionerSettlement,
    ).toHaveBeenCalledWith(
      'settlement_1',
      expect.objectContaining({
        status: 'PAID',
        amountPaidTotal: new Prisma.Decimal('120.00'),
      }),
      undefined,
    );
    expect(
      accountingJournalPostingService.postPractitionerPayout,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        payout: expect.objectContaining({
          amountPaid: new Prisma.Decimal('118.00'),
          settlementAppliedAmount: new Prisma.Decimal('120.00'),
          transferFeeTreatment: 'DEDUCT_FROM_PRACTITIONER',
        }),
      }),
    );
  });

  it('blocks already paid settlements', async () => {
    await expect(
      service.execute(
        {
          settlement: {
            id: 'settlement_1',
            batchId: 'batch_1',
            practitionerId: 'pract_1',
            status: 'PAID',
            amountNet: new Prisma.Decimal('120.00'),
            amountPaidTotal: new Prisma.Decimal('120.00'),
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
