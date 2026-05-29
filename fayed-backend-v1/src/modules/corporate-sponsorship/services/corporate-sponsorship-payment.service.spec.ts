/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CorporateCodeStatus,
  CorporateSponsorshipStatus,
  CorporateOrganizationStatus,
  CorporateContractStatus,
  CorporateBenefitPlanStatus,
  CorporateBillingMode,
} from '@prisma/client';
import { CorporateSessionSponsorshipRepository } from '../repositories/corporate-session-sponsorship.repository';
import { CorporateBenefitCodeRepository } from '../repositories/corporate-benefit-code.repository';
import { CorporateSponsorshipPaymentService } from './corporate-sponsorship-payment.service';

const mockCode = (overrides?: Record<string, unknown>) => ({
  id: 'code-uuid',
  codeHash: 'test-hash',
  codePrefix: 'FYD-TEST',
  codeLast4: 'ABCD',
  status: CorporateCodeStatus.RESERVED,
  reservedSessionId: 'session-uuid',
  reservedByUserId: 'patient-user-uuid',
  reservedUntil: new Date(Date.now() + 60 * 60 * 1000),
  ...overrides,
});

const mockSponsorship = (overrides?: Record<string, unknown>) => ({
  id: 'sponsorship-uuid',
  sessionId: 'session-uuid',
  organizationId: 'org-uuid',
  contractId: 'contract-uuid',
  benefitPlanId: 'plan-uuid',
  codeId: 'code-uuid',
  coverageType: 'FREE_SESSION' as any,
  billingMode: 'PREPAID' as any,
  originalAmount: { toFixed: () => '500.00', gt: () => false, lt: () => false } as never,
  coveredAmount: { toFixed: () => '500.00', gt: () => false } as never,
  patientPayAmount: { toFixed: () => '0.00', lt: () => false } as never,
  currency: 'EGP',
  status: CorporateSponsorshipStatus.RESERVED,
  organization: {
    id: 'org-uuid',
    name: 'Test Corp',
    companyCode: 'TST',
    status: CorporateOrganizationStatus.ACTIVE,
  },
  contract: {
    id: 'contract-uuid',
    status: CorporateContractStatus.ACTIVE,
    currency: 'EGP',
    billingMode: CorporateBillingMode.PREPAID,
    market: null as any,
  },
  benefitPlan: {
    id: 'plan-uuid',
    name: 'Plan A',
    status: CorporateBenefitPlanStatus.ACTIVE,
    coverageType: 'FREE_SESSION' as any,
  },
  code: mockCode(),
  ...overrides,
});

describe('CorporateSponsorshipPaymentService', () => {
  let service: CorporateSponsorshipPaymentService;
  let sponsorshipRepo: jest.Mocked<CorporateSessionSponsorshipRepository>;
  let codeRepo: jest.Mocked<CorporateBenefitCodeRepository>;

  beforeEach(async () => {
    sponsorshipRepo = {
      findBySessionId: jest.fn<any>(),
    } as unknown as jest.Mocked<CorporateSessionSponsorshipRepository>;

    codeRepo = {
      findById: jest.fn<any>(),
    } as unknown as jest.Mocked<CorporateBenefitCodeRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateSponsorshipPaymentService,
        { provide: CorporateSessionSponsorshipRepository, useValue: sponsorshipRepo },
        { provide: CorporateBenefitCodeRepository, useValue: codeRepo },
      ],
    }).compile();

    service = module.get(CorporateSponsorshipPaymentService);
  });

  describe('checkPaymentEligibility', () => {
    it('returns not eligible when no sponsorship exists', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(null as any);

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.sponsorship).toBeNull();
    });

    it('returns not eligible when sponsorship status is not RESERVED', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(
        mockSponsorship({ status: CorporateSponsorshipStatus.RELEASED }) as any,
      );

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_NOT_ACTIVE');
    });

    it('returns not eligible when patientPayAmount is negative', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(
        mockSponsorship({
          patientPayAmount: { toFixed: () => '-10.00', lt: () => true } as never,
        }) as any,
      );

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_INVALID_AMOUNT');
    });

    it('returns not eligible when coveredAmount exceeds originalAmount', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(
        mockSponsorship({
          coveredAmount: { toFixed: () => '600.00', gt: () => true } as never,
        }) as any,
      );

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_INVALID_AMOUNT');
    });

    it('returns not eligible when organization is not ACTIVE', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(
        mockSponsorship({
          organization: {
            id: 'org-uuid',
            name: 'Test Corp',
            companyCode: 'TST',
            status: 'SUSPENDED' as any,
          },
        }) as any,
      );

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_ORGANIZATION_INACTIVE');
    });

    it('returns not eligible when contract is not ACTIVE', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(
        mockSponsorship({
          contract: {
            id: 'contract-uuid',
            status: 'EXPIRED' as any,
            currency: 'EGP',
            billingMode: CorporateBillingMode.PREPAID,
            market: null as any,
          },
        }) as any,
      );

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_CONTRACT_INACTIVE');
    });

    it('returns not eligible when contract is POSTPAID', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(
        mockSponsorship({
          contract: {
            id: 'contract-uuid',
            status: CorporateContractStatus.ACTIVE,
            currency: 'EGP',
            billingMode: CorporateBillingMode.POSTPAID,
            market: null as any,
          },
        }) as any,
      );

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_POSTPAID_NOT_SUPPORTED');
    });

    it('returns not eligible when currency does not match payment currency', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(
        mockSponsorship({
          contract: {
            id: 'contract-uuid',
            status: CorporateContractStatus.ACTIVE,
            currency: 'USD',
            billingMode: CorporateBillingMode.PREPAID,
            market: null as any,
          },
        }) as any,
      );

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_CURRENCY_MISMATCH');
    });

    it('returns not eligible when benefit plan is not ACTIVE', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(
        mockSponsorship({
          benefitPlan: {
            id: 'plan-uuid',
            name: 'Plan A',
            status: 'SUSPENDED' as any,
            coverageType: 'FREE_SESSION' as any,
          },
        }) as any,
      );

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_BENEFIT_PLAN_INACTIVE');
    });

    it('returns not eligible when code is not found', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(mockSponsorship() as any);
      codeRepo.findById.mockResolvedValue(null as any);

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_CODE_NOT_FOUND');
    });

    it('returns not eligible when code is not RESERVED', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(mockSponsorship() as any);
      codeRepo.findById.mockResolvedValue({
        ...mockCode(),
        status: CorporateCodeStatus.USED,
      } as any);

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_CODE_NOT_RESERVED');
    });

    it('returns not eligible when code reservedSessionId does not match', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(mockSponsorship() as any);
      codeRepo.findById.mockResolvedValue({
        ...mockCode(),
        reservedSessionId: 'other-session-uuid',
      } as any);

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_CODE_SESSION_MISMATCH');
    });

    it('returns not eligible when code reservedByUserId does not match', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(mockSponsorship() as any);
      codeRepo.findById.mockResolvedValue({
        ...mockCode(),
        reservedByUserId: 'other-user-uuid',
      } as any);

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_CODE_USER_MISMATCH');
    });

    it('returns not eligible when code reservation is expired', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(mockSponsorship() as any);
      codeRepo.findById.mockResolvedValue({
        ...mockCode(),
        reservedUntil: new Date(Date.now() - 1000),
      } as any);

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(false);
      expect(result.error?.error).toBe('SPONSORSHIP_RESERVATION_EXPIRED');
    });

    it('returns eligible with correct sponsorship context when all checks pass', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(mockSponsorship() as any);
      codeRepo.findById.mockResolvedValue(mockCode() as any);

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.eligible).toBe(true);
      expect(result.sponsorship).not.toBeNull();
      expect(result.sponsorship?.sponsorshipId).toBe('sponsorship-uuid');
      expect(result.sponsorship?.organizationId).toBe('org-uuid');
      expect(result.sponsorship?.contractId).toBe('contract-uuid');
      expect(result.sponsorship?.benefitPlanId).toBe('plan-uuid');
      expect(result.sponsorship?.originalAmount).toBe('500.00');
      expect(result.sponsorship?.coveredAmount).toBe('500.00');
      expect(result.sponsorship?.patientPayAmount).toBe('0.00');
      expect(result.sponsorship?.currency).toBe('EGP');
    });

    it('does not expose codeHash or plain benefitCode in response', async () => {
      sponsorshipRepo.findBySessionId.mockResolvedValue(mockSponsorship() as any);
      codeRepo.findById.mockResolvedValue(mockCode() as any);

      const result = await service.checkPaymentEligibility({
        sessionId: 'session-uuid',
        userId: 'patient-user-uuid',
        paymentCurrency: 'EGP',
      });

      expect(result.sponsorship).not.toBeNull();
      const ctx = result.sponsorship!;
      expect((ctx as any).codeHash).toBeUndefined();
      expect((ctx as any).benefitCode).toBeUndefined();
      expect((ctx as any).codeId).toBeUndefined();
    });
  });
});