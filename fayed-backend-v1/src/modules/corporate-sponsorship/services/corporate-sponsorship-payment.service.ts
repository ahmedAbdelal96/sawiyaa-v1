import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CorporateSessionSponsorshipRepository } from '../repositories/corporate-session-sponsorship.repository';
import { CorporateBenefitCodeRepository } from '../repositories/corporate-benefit-code.repository';
import {
  CorporateOrganizationStatus,
  CorporateContractStatus,
  CorporateBenefitPlanStatus,
  CorporateBillingMode,
  CorporateSponsorshipStatus,
  CorporateCodeStatus,
} from '@prisma/client';

export interface SponsorshipPaymentContext {
  sponsorshipId: string;
  organizationId: string;
  contractId: string;
  benefitPlanId: string;
  originalAmount: string;
  coveredAmount: string;
  patientPayAmount: string;
  currency: string;
}

export interface SponsorshipPaymentEligibility {
  eligible: boolean;
  sponsorship: SponsorshipPaymentContext | null;
  error?: {
    messageKey: string;
    error: string;
  };
}

@Injectable()
export class CorporateSponsorshipPaymentService {
  constructor(
    private readonly sponsorshipRepository: CorporateSessionSponsorshipRepository,
    private readonly codeRepository: CorporateBenefitCodeRepository,
  ) {}

  /**
   * Check if a session has an active corporate sponsorship eligible for payment initiation.
   * Returns the sponsorship context with amounts to use if eligible.
   * Does NOT consume the code or finalize the sponsorship — that happens in Phase 5B.
   */
  async checkPaymentEligibility(input: {
    sessionId: string;
    userId: string;
    paymentCurrency: string;
  }): Promise<SponsorshipPaymentEligibility> {
    const sponsorship = await this.sponsorshipRepository.findBySessionId(
      input.sessionId,
    );

    if (!sponsorship) {
      return { eligible: false, sponsorship: null };
    }

    if (sponsorship.status !== CorporateSponsorshipStatus.RESERVED) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.sponsorshipNotActive',
          error: 'SPONSORSHIP_NOT_ACTIVE',
        },
      };
    }

    if (sponsorship.patientPayAmount.lt(0)) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.invalidSponsorshipAmount',
          error: 'SPONSORSHIP_INVALID_AMOUNT',
        },
      };
    }

    if (sponsorship.coveredAmount.gt(sponsorship.originalAmount)) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.invalidSponsorshipAmount',
          error: 'SPONSORSHIP_INVALID_AMOUNT',
        },
      };
    }

    if (sponsorship.organization.status !== CorporateOrganizationStatus.ACTIVE) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.organizationNotActive',
          error: 'SPONSORSHIP_ORGANIZATION_INACTIVE',
        },
      };
    }

    if (sponsorship.contract.status !== CorporateContractStatus.ACTIVE) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.contractNotActive',
          error: 'SPONSORSHIP_CONTRACT_INACTIVE',
        },
      };
    }

    if (sponsorship.contract.billingMode !== CorporateBillingMode.PREPAID) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.postpaidNotSupported',
          error: 'SPONSORSHIP_POSTPAID_NOT_SUPPORTED',
        },
      };
    }

    if (sponsorship.contract.currency !== input.paymentCurrency) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.currencyMismatch',
          error: 'SPONSORSHIP_CURRENCY_MISMATCH',
        },
      };
    }

    if (sponsorship.benefitPlan.status !== CorporateBenefitPlanStatus.ACTIVE) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.benefitPlanNotActive',
          error: 'SPONSORSHIP_BENEFIT_PLAN_INACTIVE',
        },
      };
    }

    const code = await this.codeRepository.findById(sponsorship.codeId);
    if (!code) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.codeNotFound',
          error: 'SPONSORSHIP_CODE_NOT_FOUND',
        },
      };
    }

    if (code.status !== CorporateCodeStatus.RESERVED) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.codeNotReserved',
          error: 'SPONSORSHIP_CODE_NOT_RESERVED',
        },
      };
    }

    if (code.reservedSessionId !== input.sessionId) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.codeSessionMismatch',
          error: 'SPONSORSHIP_CODE_SESSION_MISMATCH',
        },
      };
    }

    if (code.reservedByUserId !== input.userId) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.codeUserMismatch',
          error: 'SPONSORSHIP_CODE_USER_MISMATCH',
        },
      };
    }

    const now = new Date();
    if (code.reservedUntil && code.reservedUntil <= now) {
      return {
        eligible: false,
        sponsorship: null,
        error: {
          messageKey: 'sponsorship.errors.reservationExpired',
          error: 'SPONSORSHIP_RESERVATION_EXPIRED',
        },
      };
    }

    return {
      eligible: true,
      sponsorship: {
        sponsorshipId: sponsorship.id,
        organizationId: sponsorship.organizationId,
        contractId: sponsorship.contractId,
        benefitPlanId: sponsorship.benefitPlanId,
        originalAmount: sponsorship.originalAmount.toFixed(2),
        coveredAmount: sponsorship.coveredAmount.toFixed(2),
        patientPayAmount: sponsorship.patientPayAmount.toFixed(2),
        currency: sponsorship.currency,
      },
    };
  }
}