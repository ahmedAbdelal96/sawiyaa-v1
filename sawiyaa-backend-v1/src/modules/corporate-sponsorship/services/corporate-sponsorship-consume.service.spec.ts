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
import { ConflictException, BadRequestException } from '@nestjs/common';
import { CorporateSponsorshipConsumeService } from './corporate-sponsorship-consume.service';
import { CorporateSessionSponsorshipRepository } from '../repositories/corporate-session-sponsorship.repository';
import { CorporateBenefitCodeRepository } from '../repositories/corporate-benefit-code.repository';
import { CorporateLedgerRepository } from '../repositories/corporate-ledger.repository';

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

const mockDecimal = (value: string) => ({
  toFixed: () => value,
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
  originalAmount: mockDecimal('500.00'),
  coveredAmount: mockDecimal('500.00'),
  patientPayAmount: mockDecimal('0.00'),
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

describe('CorporateSponsorshipConsumeService', () => {
  let service: CorporateSponsorshipConsumeService;
  let sponsorshipRepo: jest.Mocked<CorporateSessionSponsorshipRepository>;
  let codeRepo: jest.Mocked<CorporateBenefitCodeRepository>;
  let ledgerRepo: jest.Mocked<CorporateLedgerRepository>;

  beforeEach(async () => {
    sponsorshipRepo = {
      findForConsumeById: jest.fn<any>(),
      markConsumed: jest.fn<any>(),
    } as unknown as jest.Mocked<CorporateSessionSponsorshipRepository>;

    codeRepo = {
      findById: jest.fn<any>(),
      markUsedForSession: jest.fn<any>(),
    } as unknown as jest.Mocked<CorporateBenefitCodeRepository>;

    ledgerRepo = {
      findBySponsorshipIdAndEvent: jest.fn<any>(),
      createCodeConsumedEntry: jest.fn<any>(),
    } as unknown as jest.Mocked<CorporateLedgerRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateSponsorshipConsumeService,
        { provide: CorporateSessionSponsorshipRepository, useValue: sponsorshipRepo },
        { provide: CorporateBenefitCodeRepository, useValue: codeRepo },
        { provide: CorporateLedgerRepository, useValue: ledgerRepo },
      ],
    }).compile();

    service = module.get(CorporateSponsorshipConsumeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const baseInput = {
    sponsorshipId: 'sponsorship-uuid',
    sessionId: 'session-uuid',
    paymentId: 'payment-uuid',
    paidAmount: '0.00',
    currency: 'EGP',
  };

  describe('consumeAfterPayment', () => {
    it('happy path: RESERVED sponsorship + RESERVED code for same session consumes successfully', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship() as any,
      );
      codeRepo.markUsedForSession.mockResolvedValue(1);
      sponsorshipRepo.markConsumed.mockResolvedValue(1);
      ledgerRepo.findBySponsorshipIdAndEvent.mockResolvedValue(null);
      ledgerRepo.createCodeConsumedEntry.mockResolvedValue({} as any);

      const result = await service.consumeAfterPayment(baseInput);

      expect(result.consumed).toBe(true);
      expect(result.idempotent).toBe(false);
      expect(result.sponsorshipId).toBe('sponsorship-uuid');
      expect(codeRepo.markUsedForSession).toHaveBeenCalledWith(
        'code-uuid',
        'session-uuid',
        undefined,
      );
      expect(sponsorshipRepo.markConsumed).toHaveBeenCalledWith(
        'sponsorship-uuid',
        'session-uuid',
        undefined,
      );
      expect(ledgerRepo.findBySponsorshipIdAndEvent).toHaveBeenCalledWith(
        'sponsorship-uuid',
        'CODE_CONSUMED',
        undefined,
      );
      expect(ledgerRepo.createCodeConsumedEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-uuid',
          contractId: 'contract-uuid',
          sponsorshipId: 'sponsorship-uuid',
          codeId: 'code-uuid',
          sessionId: 'session-uuid',
          paymentId: 'payment-uuid',
          currency: 'EGP',
        }),
        undefined,
      );
    });

    it('idempotent repeat: sponsorship already CONSUMED, code already USED for same session returns success', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({
          status: CorporateSponsorshipStatus.CONSUMED,
          code: mockCode({ status: CorporateCodeStatus.USED }),
        }) as any,
      );
      ledgerRepo.findBySponsorshipIdAndEvent.mockResolvedValue({ id: 'existing-ledger' } as any);

      const result = await service.consumeAfterPayment(baseInput);

      expect(result.consumed).toBe(false);
      expect(result.idempotent).toBe(true);
      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
      expect(ledgerRepo.createCodeConsumedEntry).not.toHaveBeenCalled();
    });

    it('idempotent repeat: code USED for same session (sponsorship still RESERVED) throws ConflictException', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({
          code: mockCode({ status: CorporateCodeStatus.USED }),
        }) as any,
      );

      await expect(
        service.consumeAfterPayment(baseInput),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('wrong session: sponsorship.sessionId does not match throws ConflictException', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({ sessionId: 'different-session' }) as any,
      );

      await expect(
        service.consumeAfterPayment(baseInput),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('code reserved for another session throws ConflictException', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({
          code: mockCode({ reservedSessionId: 'other-session' }),
        }) as any,
      );

      await expect(
        service.consumeAfterPayment(baseInput),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('code already USED for different session throws ConflictException', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({
          code: mockCode({
            status: CorporateCodeStatus.USED,
            reservedSessionId: 'another-session',
          }),
        }) as any,
      );

      await expect(
        service.consumeAfterPayment(baseInput),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('sponsorship RELEASED throws BadRequestException', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({ status: CorporateSponsorshipStatus.RELEASED }) as any,
      );

      await expect(
        service.consumeAfterPayment(baseInput),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('sponsorship REFUNDED throws BadRequestException', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({ status: CorporateSponsorshipStatus.REFUNDED }) as any,
      );

      await expect(
        service.consumeAfterPayment(baseInput),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('currency mismatch throws BadRequestException', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({ currency: 'USD' }) as any,
      );

      await expect(
        service.consumeAfterPayment({ ...baseInput, currency: 'EGP' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('paidAmount mismatch throws BadRequestException', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship() as any,
      );

      await expect(
        service.consumeAfterPayment({ ...baseInput, paidAmount: '100.00' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('paidAmount mismatch with different decimal value throws BadRequestException', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship() as any,
      );

      await expect(
        service.consumeAfterPayment({ ...baseInput, paidAmount: '0.01' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('consumes even when code reservedUntil is expired (payment already succeeded)', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({
          code: mockCode({ reservedUntil: new Date(Date.now() - 1000) }),
        }) as any,
      );
      codeRepo.markUsedForSession.mockResolvedValue(1);
      sponsorshipRepo.markConsumed.mockResolvedValue(1);
      ledgerRepo.findBySponsorshipIdAndEvent.mockResolvedValue(null);
      ledgerRepo.createCodeConsumedEntry.mockResolvedValue({} as any);

      const result = await service.consumeAfterPayment(baseInput);

      expect(result.consumed).toBe(true);
      expect(result.idempotent).toBe(false);
      expect(codeRepo.markUsedForSession).toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).toHaveBeenCalled();
    });

    it('throws ConflictException when code update returns 0 rows', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship() as any,
      );
      codeRepo.markUsedForSession.mockResolvedValue(0);

      await expect(
        service.consumeAfterPayment(baseInput),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('throws ConflictException when sponsorship update returns 0 rows', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship() as any,
      );
      codeRepo.markUsedForSession.mockResolvedValue(1);
      sponsorshipRepo.markConsumed.mockResolvedValue(0);
      ledgerRepo.findBySponsorshipIdAndEvent.mockResolvedValue(null);
      ledgerRepo.createCodeConsumedEntry.mockResolvedValue({} as any);

      await expect(
        service.consumeAfterPayment(baseInput),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(ledgerRepo.createCodeConsumedEntry).not.toHaveBeenCalled();
    });

    it('sponsorship not found throws BadRequestException', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(null as any);

      await expect(
        service.consumeAfterPayment(baseInput),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
    });

    it('result does not expose codeHash or benefitCode', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship() as any,
      );
      codeRepo.markUsedForSession.mockResolvedValue(1);
      sponsorshipRepo.markConsumed.mockResolvedValue(1);

      const result = await service.consumeAfterPayment(baseInput);

      expect((result as any).codeHash).toBeUndefined();
      expect((result as any).benefitCode).toBeUndefined();
      expect(result.codeId).toBe('code-uuid');
    });

    it('does not expose codeHash in any error responses', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({ sessionId: 'different-session' }) as any,
      );

      try {
        await service.consumeAfterPayment(baseInput);
        fail('Should have thrown');
      } catch (e) {
        const errorResponse = (e as ConflictException).getResponse() as Record<string, unknown>;
        expect(JSON.stringify(errorResponse)).not.toContain('codeHash');
        expect(JSON.stringify(errorResponse)).not.toContain('benefitCode');
      }
    });

    it('ledger failure: createCodeConsumedEntry throws and consume rejects, error not swallowed', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship() as any,
      );
      codeRepo.markUsedForSession.mockResolvedValue(1);
      sponsorshipRepo.markConsumed.mockResolvedValue(1);
      ledgerRepo.findBySponsorshipIdAndEvent.mockResolvedValue(null);
      ledgerRepo.createCodeConsumedEntry.mockRejectedValue(new Error('ledger write failed'));

      await expect(service.consumeAfterPayment(baseInput)).rejects.toThrow('ledger write failed');

      expect(ledgerRepo.createCodeConsumedEntry).toHaveBeenCalled();
    });

    it('Case A: CONSUMED + USED + ledger exists — idempotent success, no duplicate ledger entry', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({
          status: CorporateSponsorshipStatus.CONSUMED,
          code: mockCode({ status: CorporateCodeStatus.USED }),
        }) as any,
      );
      ledgerRepo.findBySponsorshipIdAndEvent.mockResolvedValue({ id: 'existing-ledger' } as any);

      const result = await service.consumeAfterPayment(baseInput);

      expect(result.consumed).toBe(false);
      expect(result.idempotent).toBe(true);
      expect(codeRepo.markUsedForSession).not.toHaveBeenCalled();
      expect(sponsorshipRepo.markConsumed).not.toHaveBeenCalled();
      expect(ledgerRepo.createCodeConsumedEntry).not.toHaveBeenCalled();
    });

    it('Case B: CONSUMED + USED but ledger missing — creates missing ledger entry, returns idempotent success', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship({
          status: CorporateSponsorshipStatus.CONSUMED,
          code: mockCode({ status: CorporateCodeStatus.USED }),
        }) as any,
      );
      ledgerRepo.findBySponsorshipIdAndEvent.mockResolvedValue(null);
      ledgerRepo.createCodeConsumedEntry.mockResolvedValue({} as any);

      const result = await service.consumeAfterPayment(baseInput);

      expect(result.consumed).toBe(false);
      expect(result.idempotent).toBe(true);
      expect(ledgerRepo.findBySponsorshipIdAndEvent).toHaveBeenCalledWith(
        'sponsorship-uuid',
        'CODE_CONSUMED',
        undefined,
      );
      expect(ledgerRepo.createCodeConsumedEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-uuid',
          contractId: 'contract-uuid',
          sponsorshipId: 'sponsorship-uuid',
          codeId: 'code-uuid',
          sessionId: 'session-uuid',
          paymentId: 'payment-uuid',
          currency: 'EGP',
        }),
        undefined,
      );
    });

    it('happy path: ledger amount = coveredAmount, metadata excludes sensitive fields', async () => {
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship() as any,
      );
      codeRepo.markUsedForSession.mockResolvedValue(1);
      sponsorshipRepo.markConsumed.mockResolvedValue(1);
      ledgerRepo.findBySponsorshipIdAndEvent.mockResolvedValue(null);
      ledgerRepo.createCodeConsumedEntry.mockResolvedValue({} as any);

      await service.consumeAfterPayment(baseInput);

      expect(ledgerRepo.createCodeConsumedEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-uuid',
          contractId: 'contract-uuid',
          sponsorshipId: 'sponsorship-uuid',
          codeId: 'code-uuid',
          sessionId: 'session-uuid',
          paymentId: 'payment-uuid',
          currency: 'EGP',
        }) as any,
        undefined,
      );
      const ledgerCall = (ledgerRepo.createCodeConsumedEntry as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(ledgerCall.amount).toBeDefined();
      expect(ledgerCall.originalAmount).toBeDefined();
      expect(ledgerCall.coveredAmount).toBeDefined();
      expect(ledgerCall.patientPayAmount).toBeDefined();
      expect(ledgerCall.paymentId).toBe('payment-uuid');
      expect(ledgerCall.benefitCode).toBeUndefined();
      expect(ledgerCall.code).toBeUndefined();
      expect(ledgerCall.codeHash).toBeUndefined();
      expect(ledgerCall.codePrefix).toBeUndefined();
      expect(ledgerCall.codeLast4).toBeUndefined();
    });

    it('happy path: ledger write uses same transaction client as consume operations', async () => {
      const mockTx = {} as any;
      sponsorshipRepo.findForConsumeById.mockResolvedValue(
        mockSponsorship() as any,
      );
      codeRepo.markUsedForSession.mockResolvedValue(1);
      sponsorshipRepo.markConsumed.mockResolvedValue(1);
      ledgerRepo.findBySponsorshipIdAndEvent.mockResolvedValue(null);
      ledgerRepo.createCodeConsumedEntry.mockResolvedValue({} as any);

      await service.consumeAfterPayment(baseInput, mockTx);

      expect(ledgerRepo.findBySponsorshipIdAndEvent).toHaveBeenCalledWith(
        'sponsorship-uuid',
        'CODE_CONSUMED',
        mockTx,
      );
      expect(ledgerRepo.createCodeConsumedEntry).toHaveBeenCalledWith(
        expect.anything(),
        mockTx,
      );
    });
  });
});
