/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import { NotFoundException } from '@nestjs/common';
import { Prisma, SettlementBatchStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
import { ValidateSettlementStatusTransitionService } from '../services/validate-settlement-status-transition.service';
import { RecordSettlementPayoutService } from '../services/record-settlement-payout.service';
import { RecordPractitionerSettlementPayoutUseCase } from './record-practitioner-settlement-payout.use-case';

describe('RecordPractitionerSettlementPayoutUseCase', () => {
  const prisma = {
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const practitionerRepository = {
    findById: jest.fn(),
  } as unknown as FinancialOperationsPractitionerRepository;
  const settlementRepository = {
    findPractitionerSettlementById: jest.fn(),
    listBatchSettlements: jest.fn(),
    updateSettlementBatchStatus: jest.fn(),
  } as unknown as SettlementRepository;
  const recordSettlementPayoutService = {
    execute: jest.fn(),
  } as unknown as RecordSettlementPayoutService;
  const validateSettlementStatusTransitionService = {
    assertCanTransition: jest.fn(),
  } as unknown as ValidateSettlementStatusTransitionService;

  const useCase = new RecordPractitionerSettlementPayoutUseCase(
    prisma,
    practitionerRepository,
    settlementRepository,
    recordSettlementPayoutService,
    validateSettlementStatusTransitionService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when the settlement has already been fully paid', async () => {
    (practitionerRepository.findById as jest.Mock).mockResolvedValue({
      id: 'pract_1',
    });
    (
      settlementRepository.findPractitionerSettlementById as jest.Mock
    ).mockResolvedValue({
      id: 'settlement_1',
      practitionerId: 'pract_1',
      status: 'PAID',
      amountNet: new Prisma.Decimal('100.00'),
      amountPaidTotal: new Prisma.Decimal('100.00'),
      batchId: 'batch_1',
        batch: {
          id: 'batch_1',
          status: 'PROCESSING',
        },
      });
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn({}));

    await expect(
      useCase.execute({
        practitionerId: 'pract_1',
        settlementId: 'settlement_1',
        operatorUserId: 'admin_1',
        body: {
          payoutMethod: 'CASH',
          externalPayoutRef: 'bank-1',
        } as never,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(recordSettlementPayoutService.execute).not.toHaveBeenCalled();
    expect(settlementRepository.listBatchSettlements).not.toHaveBeenCalled();
    expect(
      settlementRepository.updateSettlementBatchStatus,
    ).not.toHaveBeenCalled();
  });

  it('continues batch processing only when a new payout is created', async () => {
    (practitionerRepository.findById as jest.Mock).mockResolvedValue({
      id: 'pract_1',
    });
    (settlementRepository.findPractitionerSettlementById as jest.Mock)
      .mockResolvedValueOnce({
        id: 'settlement_1',
        practitionerId: 'pract_1',
        status: 'READY',
        amountNet: new Prisma.Decimal('100.00'),
        amountPaidTotal: new Prisma.Decimal('0.00'),
        batchId: 'batch_1',
        batch: {
          id: 'batch_1',
          status: 'PROCESSING',
        },
      })
      .mockResolvedValueOnce({
        id: 'settlement_1',
        practitionerId: 'pract_1',
        status: 'PAID',
        amountNet: new Prisma.Decimal('100.00'),
        amountPaidTotal: new Prisma.Decimal('100.00'),
        batchId: 'batch_1',
      batch: {
        id: 'batch_1',
        status: 'PROCESSING',
      },
    });
    (recordSettlementPayoutService.execute as jest.Mock).mockResolvedValue({
      payoutRecord: { id: 'payout_new' },
      settlement: {
        id: 'settlement_1',
        status: 'PAID',
      },
    });
    (settlementRepository.listBatchSettlements as jest.Mock).mockResolvedValue([
      { status: 'PAID' },
    ]);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn({}));

    const result = await useCase.execute({
      practitionerId: 'pract_1',
      settlementId: 'settlement_1',
      operatorUserId: 'admin_1',
      body: {
        payoutMethod: 'CASH',
        externalPayoutRef: 'bank-2',
      } as never,
    });

    expect(result.item.id).toBe('payout_new');
    expect(
      validateSettlementStatusTransitionService.assertCanTransition,
    ).toHaveBeenCalledWith('PROCESSING', SettlementBatchStatus.COMPLETED);
  });
});
