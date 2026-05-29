/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, CorporateCodeStatus, CorporateSponsorshipStatus, SessionStatus, CorporateOrganizationStatus, CorporateContractStatus, CorporateBenefitPlanStatus, CorporateBillingMode } from '@prisma/client';
import { CorporateCodeHashService } from '../services/corporate-code-hash.service';
import { CorporateBenefitCodeRepository } from '../repositories/corporate-benefit-code.repository';
import { CorporateSessionSponsorshipRepository } from '../repositories/corporate-session-sponsorship.repository';
import { CorporateOrganizationRepository } from '../repositories/corporate-organization.repository';
import { CorporateContractRepository } from '../repositories/corporate-contract.repository';
import { CorporateBenefitPlanRepository } from '../repositories/corporate-benefit-plan.repository';
import { CalculateSessionFinancialBreakdownService } from '@modules/financial-rules/services/calculate-session-financial-breakdown.service';
import {
  PreviewCorporateSponsorshipUseCase,
  ReserveCorporateSponsorshipUseCase,
  ReleaseCorporateSponsorshipUseCase,
} from '../use-cases/patient-corporate-sponsorship.use-cases';
import { PrismaService } from '@common/prisma/prisma.service';

const TEST_PEPPER = 'test_corporate_pepper_32chars_min!!';

const mockSession = (overrides?: Record<string, unknown>) => ({
  id: 'session-uuid',
  status: SessionStatus.PENDING_PAYMENT,
  durationMinutes: 30,
  patient: { user: { id: 'patient-user-uuid' } },
  practitioner: {
    id: 'practitioner-uuid',
    sessionPrice30: '500',
    sessionPrice60: '900',
    sessionPrice30Egp: new Prisma.Decimal('500'),
    sessionPrice60Egp: new Prisma.Decimal('900'),
    country: { isoCode: 'EG', currencyCode: 'EGP' },
  },
  corporateSponsorship: null,
  ...overrides,
});

const mockCode = (overrides?: Record<string, unknown>) => ({
  id: 'code-uuid',
  codeHash: 'abcd1234'.repeat(8),
  codePrefix: 'FYD-ABCD',
  codeLast4: 'WXYZ',
  status: CorporateCodeStatus.AVAILABLE,
  expiresAt: null,
  reservedByUserId: null,
  reservedSessionId: null,
  reservedUntil: null,
  usedCount: 0,
  usageLimit: 1,
  organizationId: 'org-uuid',
  contractId: 'contract-uuid',
  benefitPlanId: 'plan-uuid',
  batchId: 'batch-uuid',
  batch: { id: 'batch-uuid', name: 'Batch 1' },
  benefitPlan: {
    id: 'plan-uuid',
    name: 'Test Plan',
    status: CorporateBenefitPlanStatus.ACTIVE,
    coverageType: 'FREE_SESSION',
    coveragePercent: 100,
    maxCoverageAmount: null,
    codeReservationTtlMinutes: 15,
    contract: {
      id: 'contract-uuid',
      status: CorporateContractStatus.ACTIVE,
      currency: 'EGP',
      billingMode: CorporateBillingMode.PREPAID,
      market: 'EGYPT',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2099-12-31'),
      organization: {
        id: 'org-uuid',
        name: 'Test Org',
        companyCode: 'TST',
        status: CorporateOrganizationStatus.ACTIVE,
      },
    },
  },
  ...overrides,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockPrisma(sessionData: any): any {
  const mockTx = { session: { findUnique: jest.fn<any>().mockResolvedValue(sessionData) } };
  return {
    session: { findUnique: jest.fn<any>().mockResolvedValue(sessionData) },
    $transaction: jest.fn<any>().mockImplementation(async (fn: any) => (fn as any)(mockTx)),
  } as any;
}

// --- Preview Use Case Tests ---

describe('PreviewCorporateSponsorshipUseCase', () => {
  let useCase: PreviewCorporateSponsorshipUseCase;
  let hashService: CorporateCodeHashService;
  let mockPrisma: any;
  let codeRepo: jest.Mocked<CorporateBenefitCodeRepository>;
  let orgRepo: jest.Mocked<CorporateOrganizationRepository>;
  let contractRepo: jest.Mocked<CorporateContractRepository>;
  let planRepo: jest.Mocked<CorporateBenefitPlanRepository>;

  beforeEach(async () => {
    hashService = new CorporateCodeHashService();
    Object.defineProperty(hashService, 'pepper', { value: TEST_PEPPER, writable: true });

    codeRepo = {
      findByHash: jest.fn<any>(),
      findById: jest.fn<any>(),
      reserveCode: jest.fn<any>(),
      reclaimExpiredCode: jest.fn<any>(),
      releaseCode: jest.fn<any>(),
      countByBatchAndStatus: jest.fn<any>(),
    } as unknown as jest.Mocked<CorporateBenefitCodeRepository>;

    orgRepo = { findById: jest.fn<any>() } as unknown as jest.Mocked<CorporateOrganizationRepository>;
    contractRepo = { findById: jest.fn<any>() } as unknown as jest.Mocked<CorporateContractRepository>;
    planRepo = { findById: jest.fn<any>() } as unknown as jest.Mocked<CorporateBenefitPlanRepository>;

    mockPrisma = createMockPrisma(mockSession()) as any;

    const calculateFinancialBreakdownMock = {
      calculate: jest.fn<any>().mockResolvedValue({
        amountTotal: '500.00',
        amountSubtotal: '500.00',
        amountDiscount: '0.00',
        currencyCode: 'EGP',
        breakdown: {
          grossAmount: '500.00',
          discountAmount: '0.00',
          netPaidAmount: '500.00',
          platformCommissionAmount: '100.00',
          practitionerShareAmount: '400.00',
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: mockPrisma as any },
        { provide: CorporateCodeHashService, useValue: hashService },
        { provide: CorporateBenefitCodeRepository, useValue: codeRepo },
        { provide: CorporateOrganizationRepository, useValue: orgRepo },
        { provide: CorporateContractRepository, useValue: contractRepo },
        { provide: CorporateBenefitPlanRepository, useValue: planRepo },
        { provide: CalculateSessionFinancialBreakdownService, useValue: calculateFinancialBreakdownMock },
        PreviewCorporateSponsorshipUseCase,
      ],
    }).compile();

    useCase = module.get(PreviewCorporateSponsorshipUseCase);
  });

  it('rejects session not owned by patient', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({
      ...mockSession(), patient: { user: { id: 'other-user' } },
    });

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects session not in eligible status', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({
      ...mockSession(), status: SessionStatus.IN_PROGRESS,
    });

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    expect(result.eligible).toBe(false);
  });

  it('rejects session that already has sponsorship', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({
      ...mockSession(), corporateSponsorship: { id: 'existing-sponsorship' },
    });

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    expect(result.eligible).toBe(false);
  });

  it('returns not eligible for non-existent code', async () => {
    codeRepo.findByHash.mockResolvedValue(null);

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-INVALID',
    });

    expect(result.eligible).toBe(false);
  });

  it('returns eligible with correct breakdown for valid code', async () => {
    orgRepo.findById.mockResolvedValue({ id: 'org-uuid', status: CorporateOrganizationStatus.ACTIVE } as never);
    contractRepo.findById.mockResolvedValue({
      id: 'contract-uuid', status: CorporateContractStatus.ACTIVE,
      currency: 'EGP', billingMode: CorporateBillingMode.PREPAID,
      startDate: new Date('2020-01-01'), endDate: new Date('2099-12-31'),
    } as never);
    planRepo.findById.mockResolvedValue({ id: 'plan-uuid', status: CorporateBenefitPlanStatus.ACTIVE } as never);
    codeRepo.findByHash.mockResolvedValue(mockCode() as never);

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    expect(result.eligible).toBe(true);
    expect(result.originalAmount).toBe('500.00');
    expect(result.coveredAmount).toBe('500.00');
    expect(result.patientPayAmount).toBe('0.00');
    expect(result.currency).toBe('EGP');
  });

  it('FREE_SESSION covers full amount', async () => {
    orgRepo.findById.mockResolvedValue({ id: 'org-uuid', status: CorporateOrganizationStatus.ACTIVE } as never);
    contractRepo.findById.mockResolvedValue({
      id: 'contract-uuid', status: CorporateContractStatus.ACTIVE,
      currency: 'EGP', billingMode: CorporateBillingMode.PREPAID,
      startDate: new Date('2020-01-01'), endDate: new Date('2099-12-31'),
    } as never);
    planRepo.findById.mockResolvedValue({ id: 'plan-uuid', status: CorporateBenefitPlanStatus.ACTIVE } as never);
    codeRepo.findByHash.mockResolvedValue(mockCode() as never);

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    expect(result.coveredAmount).toBe(result.originalAmount);
    expect(result.patientPayAmount).toBe('0.00');
  });

  it('DISCOUNT_PERCENT applies correct percentage', async () => {
    orgRepo.findById.mockResolvedValue({ id: 'org-uuid', status: CorporateOrganizationStatus.ACTIVE } as never);
    contractRepo.findById.mockResolvedValue({
      id: 'contract-uuid', status: CorporateContractStatus.ACTIVE,
      currency: 'EGP', billingMode: CorporateBillingMode.PREPAID,
      startDate: new Date('2020-01-01'), endDate: new Date('2099-12-31'),
    } as never);
    planRepo.findById.mockResolvedValue({ id: 'plan-uuid', status: CorporateBenefitPlanStatus.ACTIVE } as never);
    codeRepo.findByHash.mockResolvedValue({
      ...mockCode(),
      benefitPlan: { ...mockCode().benefitPlan, coverageType: 'DISCOUNT_PERCENT', coveragePercent: 50 },
    } as never);

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    expect(result.eligible).toBe(true);
    expect(result.coveredAmount).toBe('250.00');
    expect(result.patientPayAmount).toBe('250.00');
  });

  it('FIXED_AMOUNT caps at maxCoverageAmount', async () => {
    orgRepo.findById.mockResolvedValue({ id: 'org-uuid', status: CorporateOrganizationStatus.ACTIVE } as never);
    contractRepo.findById.mockResolvedValue({
      id: 'contract-uuid', status: CorporateContractStatus.ACTIVE,
      currency: 'EGP', billingMode: CorporateBillingMode.PREPAID,
      startDate: new Date('2020-01-01'), endDate: new Date('2099-12-31'),
    } as never);
    planRepo.findById.mockResolvedValue({ id: 'plan-uuid', status: CorporateBenefitPlanStatus.ACTIVE } as never);
    codeRepo.findByHash.mockResolvedValue({
      ...mockCode(),
      benefitPlan: { ...mockCode().benefitPlan, coverageType: 'FIXED_AMOUNT', maxCoverageAmount: new Prisma.Decimal('200') },
    } as never);

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    expect(result.eligible).toBe(true);
    expect(result.coveredAmount).toBe('200.00');
    expect(result.patientPayAmount).toBe('300.00');
  });

  it('no negative patientPayAmount', async () => {
    orgRepo.findById.mockResolvedValue({ id: 'org-uuid', status: CorporateOrganizationStatus.ACTIVE } as never);
    contractRepo.findById.mockResolvedValue({
      id: 'contract-uuid', status: CorporateContractStatus.ACTIVE,
      currency: 'EGP', billingMode: CorporateBillingMode.PREPAID,
      startDate: new Date('2020-01-01'), endDate: new Date('2099-12-31'),
    } as never);
    planRepo.findById.mockResolvedValue({ id: 'plan-uuid', status: CorporateBenefitPlanStatus.ACTIVE } as never);
    codeRepo.findByHash.mockResolvedValue(mockCode() as never);

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    expect(parseFloat(result.patientPayAmount)).toBeGreaterThanOrEqual(0);
  });

  it('preview does not mutate code', async () => {
    orgRepo.findById.mockResolvedValue({ id: 'org-uuid', status: CorporateOrganizationStatus.ACTIVE } as never);
    contractRepo.findById.mockResolvedValue({
      id: 'contract-uuid', status: CorporateContractStatus.ACTIVE,
      currency: 'EGP', billingMode: CorporateBillingMode.PREPAID,
      startDate: new Date('2020-01-01'), endDate: new Date('2099-12-31'),
    } as never);
    planRepo.findById.mockResolvedValue({ id: 'plan-uuid', status: CorporateBenefitPlanStatus.ACTIVE } as never);
    codeRepo.findByHash.mockResolvedValue({ ...mockCode(), status: CorporateCodeStatus.RESERVED } as never);

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    expect(result.eligible).toBe(false);
  });

  it('preview does not create sponsorship row', async () => {
    orgRepo.findById.mockResolvedValue({ id: 'org-uuid', status: CorporateOrganizationStatus.ACTIVE } as never);
    contractRepo.findById.mockResolvedValue({
      id: 'contract-uuid', status: CorporateContractStatus.ACTIVE,
      currency: 'EGP', billingMode: CorporateBillingMode.PREPAID,
      startDate: new Date('2020-01-01'), endDate: new Date('2099-12-31'),
    } as never);
    planRepo.findById.mockResolvedValue({ id: 'plan-uuid', status: CorporateBenefitPlanStatus.ACTIVE } as never);
    codeRepo.findByHash.mockResolvedValue(mockCode() as never);

    await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    expect(codeRepo.reserveCode).not.toHaveBeenCalled();
    expect(codeRepo.releaseCode).not.toHaveBeenCalled();
  });
});

// --- Reserve Use Case Tests ---

describe('ReserveCorporateSponsorshipUseCase', () => {
  let useCase: ReserveCorporateSponsorshipUseCase;
  let hashService: CorporateCodeHashService;
  let mockPrisma: any;
  let codeRepo: jest.Mocked<CorporateBenefitCodeRepository>;
  let sponsorshipRepo: jest.Mocked<CorporateSessionSponsorshipRepository>;
  let orgRepo: jest.Mocked<CorporateOrganizationRepository>;
  let contractRepo: jest.Mocked<CorporateContractRepository>;
  let planRepo: jest.Mocked<CorporateBenefitPlanRepository>;

  beforeEach(async () => {
    hashService = new CorporateCodeHashService();
    Object.defineProperty(hashService, 'pepper', { value: TEST_PEPPER, writable: true });

    codeRepo = {
      findByHash: jest.fn<any>(), reserveCode: jest.fn<any>(),
      reclaimExpiredCode: jest.fn<any>(), releaseCode: jest.fn<any>(),
    } as unknown as jest.Mocked<CorporateBenefitCodeRepository>;

    sponsorshipRepo = {
      findBySessionId: jest.fn<any>(), create: jest.fn<any>(),
      updateStatus: jest.fn<any>(), updateStatusBySessionId: jest.fn<any>(),
    } as unknown as jest.Mocked<CorporateSessionSponsorshipRepository>;

    orgRepo = { findById: jest.fn<any>() } as unknown as jest.Mocked<CorporateOrganizationRepository>;
    contractRepo = { findById: jest.fn<any>() } as unknown as jest.Mocked<CorporateContractRepository>;
    planRepo = { findById: jest.fn<any>() } as unknown as jest.Mocked<CorporateBenefitPlanRepository>;

    mockPrisma = createMockPrisma(mockSession()) as any;

    const calculateFinancialBreakdownMock = {
      calculate: jest.fn<any>().mockResolvedValue({
        amountTotal: '500.00',
        amountSubtotal: '500.00',
        amountDiscount: '0.00',
        currencyCode: 'EGP',
        breakdown: {
          grossAmount: '500.00',
          discountAmount: '0.00',
          netPaidAmount: '500.00',
          platformCommissionAmount: '100.00',
          practitionerShareAmount: '400.00',
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: mockPrisma as any },
        { provide: CorporateCodeHashService, useValue: hashService },
        { provide: CorporateBenefitCodeRepository, useValue: codeRepo },
        { provide: CorporateSessionSponsorshipRepository, useValue: sponsorshipRepo },
        { provide: CorporateOrganizationRepository, useValue: orgRepo },
        { provide: CorporateContractRepository, useValue: contractRepo },
        { provide: CorporateBenefitPlanRepository, useValue: planRepo },
        { provide: CalculateSessionFinancialBreakdownService, useValue: calculateFinancialBreakdownMock },
        ReserveCorporateSponsorshipUseCase,
      ],
    }).compile();

    useCase = module.get(ReserveCorporateSponsorshipUseCase);
  });

  it('rejects non-existent session', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue(null) } };
      return (fn as any)(tx);
    });

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'non-existent', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects session not owned by patient', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue({ ...mockSession(), patient: { user: { id: 'other-user' } } }) } };
      return (fn as any)(tx);
    });

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects non-PREPAID contract', async () => {
    const postpaidCode = {
      ...mockCode(),
      benefitPlan: {
        ...mockCode().benefitPlan,
        contract: { ...mockCode().benefitPlan.contract, billingMode: CorporateBillingMode.POSTPAID },
      },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue(mockSession()) } };
      return (fn as any)(tx);
    });
    codeRepo.findByHash.mockResolvedValue(postpaidCode as never);

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects inactive organization', async () => {
    const suspendedOrgCode = {
      ...mockCode(),
      benefitPlan: {
        ...mockCode().benefitPlan,
        contract: {
          ...mockCode().benefitPlan.contract,
          organization: { ...mockCode().benefitPlan.contract.organization, status: CorporateOrganizationStatus.SUSPENDED },
        },
      },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue(mockSession()) } };
      return (fn as any)(tx);
    });
    codeRepo.findByHash.mockResolvedValue(suspendedOrgCode as never);

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects used code', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue(mockSession()) } };
      return (fn as any)(tx);
    });
    codeRepo.findByHash.mockResolvedValue({ ...mockCode(), status: CorporateCodeStatus.USED } as never);

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects expired code', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue(mockSession()) } };
      return (fn as any)(tx);
    });
    codeRepo.findByHash.mockResolvedValue({
      ...mockCode(),
      status: CorporateCodeStatus.RESERVED,
      reservedUntil: new Date(Date.now() - 1000),
    } as never);
    codeRepo.reclaimExpiredCode.mockResolvedValue({ count: 0 });

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL' }),
    ).rejects.toThrow(ConflictException);
  });

  it('does not expose codeHash in result', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue(mockSession()) } };
      return (fn as any)(tx);
    });
    codeRepo.findByHash.mockResolvedValue({
      ...mockCode(), codeHash: 'super-secret-hash',
    } as never);
    codeRepo.reserveCode.mockResolvedValue({ count: 1 });
    sponsorshipRepo.create.mockResolvedValue({} as never);

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain('super-secret-hash');
    expect(resultStr).not.toContain('codeHash');
  });

  it('rejects already reserved code by another session', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue(mockSession()) } };
      return (fn as any)(tx);
    });
    codeRepo.findByHash.mockResolvedValue({
      ...mockCode(), status: CorporateCodeStatus.RESERVED,
      reservedUntil: new Date(Date.now() + 10 * 60 * 1000),
    } as never);

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL' }),
    ).rejects.toThrow(ConflictException);
  });

  it('reclaims expired reservation and reserves', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue(mockSession()) } };
      return (fn as any)(tx);
    });
    codeRepo.findByHash.mockResolvedValue({
      ...mockCode(), status: CorporateCodeStatus.RESERVED,
      reservedUntil: new Date(Date.now() - 1000),
    } as never);
    codeRepo.reclaimExpiredCode.mockResolvedValue({ count: 1 });
    sponsorshipRepo.create.mockResolvedValue({
      id: 'sponsorship-uuid', status: CorporateSponsorshipStatus.RESERVED,
      sessionId: 'session-uuid', organizationId: 'org-uuid', contractId: 'contract-uuid',
      benefitPlanId: 'plan-uuid', codeId: 'code-uuid',
      coverageType: 'FREE_SESSION', billingMode: 'PREPAID', market: 'EGYPT',
      originalAmount: new Prisma.Decimal('500'), coveredAmount: new Prisma.Decimal('500'),
      patientPayAmount: new Prisma.Decimal('0'), currency: 'EGP', snapshotJson: {},
      createdAt: new Date(), updatedAt: new Date(),
      organization: { id: 'org-uuid', name: 'Test Org', companyCode: 'TST' },
      benefitPlan: { id: 'plan-uuid', name: 'Test Plan', status: CorporateBenefitPlanStatus.ACTIVE, coverageType: 'FREE_SESSION' },
      code: { id: 'code-uuid', codeHash: 'hash', codePrefix: 'FYD-', codeLast4: 'WXYZ' },
    } as never);

    const result = await useCase.execute({
      userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL',
    });

    expect(result.sponsorshipId).toBe('sponsorship-uuid');
    expect(codeRepo.reclaimExpiredCode).toHaveBeenCalled();
  });

  it('prevents double reservation when conditional update fails', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue(mockSession()) } };
      return (fn as any)(tx);
    });
    codeRepo.findByHash.mockResolvedValue(mockCode() as never);
    codeRepo.reserveCode.mockResolvedValue({ count: 0 });

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects active reservation by another session', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue(mockSession()) } };
      return (fn as any)(tx);
    });
    codeRepo.findByHash.mockResolvedValue({
      ...mockCode(), status: CorporateCodeStatus.RESERVED,
      reservedUntil: new Date(Date.now() + 60 * 1000),
    } as never);

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid', companyCode: 'TST', benefitCode: 'FYD-ABCD-EFGH-IJKL' }),
    ).rejects.toThrow(ConflictException);
  });
});

// --- Release Use Case Tests ---

describe('ReleaseCorporateSponsorshipUseCase', () => {
  let useCase: ReleaseCorporateSponsorshipUseCase;
  let mockPrisma: any;
  let codeRepo: jest.Mocked<CorporateBenefitCodeRepository>;
  let sponsorshipRepo: jest.Mocked<CorporateSessionSponsorshipRepository>;

  beforeEach(async () => {
    codeRepo = {
      findByHash: jest.fn<any>(), reserveCode: jest.fn<any>(),
      reclaimExpiredCode: jest.fn<any>(), releaseCode: jest.fn<any>(),
    } as unknown as jest.Mocked<CorporateBenefitCodeRepository>;

    sponsorshipRepo = {
      findBySessionId: jest.fn<any>(), create: jest.fn<any>(),
      updateStatus: jest.fn<any>(), updateStatusBySessionId: jest.fn<any>(),
    } as unknown as jest.Mocked<CorporateSessionSponsorshipRepository>;

    mockPrisma = createMockPrisma(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: mockPrisma as any },
        { provide: CorporateBenefitCodeRepository, useValue: codeRepo },
        { provide: CorporateSessionSponsorshipRepository, useValue: sponsorshipRepo },
        ReleaseCorporateSponsorshipUseCase,
      ],
    }).compile();

    useCase = module.get(ReleaseCorporateSponsorshipUseCase);
  });

  it('rejects session not owned by patient', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        session: {
          findUnique: jest.fn<any>().mockResolvedValue({
            ...mockSession(), patient: { user: { id: 'other-user' } },
          }),
        },
      };
      return (fn as any)(tx);
    });

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns idempotent success when no reservation exists', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = { session: { findUnique: jest.fn<any>().mockResolvedValue({ ...mockSession(), corporateSponsorship: null }) } };
      return (fn as any)(tx);
    });

    const result = await useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid' });

    expect(result.released).toBe(true);
    expect(result.previousSponsorshipId).toBe('');
  });

  it('releases code and sets sponsorship to RELEASED', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        session: {
          findUnique: jest.fn<any>().mockResolvedValue({
            ...mockSession(),
            corporateSponsorship: {
              id: 'sponsorship-uuid',
              status: CorporateSponsorshipStatus.RESERVED,
              code: {
                id: 'code-uuid', codeHash: 'test-hash',
                status: CorporateCodeStatus.RESERVED,
                reservedSessionId: 'session-uuid',
                reservedByUserId: 'patient-user-uuid',
              },
            },
          }),
        },
      };
      return (fn as any)(tx);
    });

    codeRepo.releaseCode.mockResolvedValue({ count: 1 });
    sponsorshipRepo.updateStatus.mockResolvedValue({} as never);

    const result = await useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid' });

    expect(result.released).toBe(true);
    expect(result.previousSponsorshipId).toBe('sponsorship-uuid');
    expect(codeRepo.releaseCode).toHaveBeenCalledWith({
      codeHash: 'test-hash', sessionId: 'session-uuid', userId: 'patient-user-uuid',
    }, expect.anything());
    expect(sponsorshipRepo.updateStatus).toHaveBeenCalledWith(
      'sponsorship-uuid', CorporateSponsorshipStatus.RELEASED, expect.anything(),
    );
  });

  it('does not release USED code', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        session: {
          findUnique: jest.fn<any>().mockResolvedValue({
            ...mockSession(),
            corporateSponsorship: {
              id: 'sponsorship-uuid',
              status: CorporateSponsorshipStatus.RESERVED,
              code: {
                id: 'code-uuid', codeHash: 'test-hash',
                status: CorporateCodeStatus.USED,
                reservedSessionId: 'session-uuid',
                reservedByUserId: 'patient-user-uuid',
              },
            },
          }),
        },
      };
      return (fn as any)(tx);
    });

    sponsorshipRepo.updateStatus.mockResolvedValue({} as never);

    const result = await useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid' });

    expect(result.released).toBe(false);
    expect(codeRepo.releaseCode).not.toHaveBeenCalled();
  });

  it('session ownership required for release', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        session: {
          findUnique: jest.fn<any>().mockResolvedValue({
            ...mockSession(),
            patient: { user: { id: 'different-user' } },
            corporateSponsorship: {
              id: 'sponsorship-uuid',
              status: CorporateSponsorshipStatus.RESERVED,
              code: { id: 'code-uuid', codeHash: 'hash', status: CorporateCodeStatus.RESERVED },
            },
          }),
        },
      };
      return (fn as any)(tx);
    });

    await expect(
      useCase.execute({ userId: 'patient-user-uuid', sessionId: 'session-uuid' }),
    ).rejects.toThrow(NotFoundException);
  });
});