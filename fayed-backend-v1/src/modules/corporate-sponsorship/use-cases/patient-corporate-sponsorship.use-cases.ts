import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, SessionFlowType, SessionMode } from '@prisma/client';
import { CorporateCodeHashService } from '../services/corporate-code-hash.service';
import { CorporateBenefitCodeRepository } from '../repositories/corporate-benefit-code.repository';
import { CorporateSessionSponsorshipRepository } from '../repositories/corporate-session-sponsorship.repository';
import { CorporateOrganizationRepository } from '../repositories/corporate-organization.repository';
import { CorporateContractRepository } from '../repositories/corporate-contract.repository';
import { CorporateBenefitPlanRepository } from '../repositories/corporate-benefit-plan.repository';
import { CorporateSponsorshipPreviewResponseDto } from '../dto/patient-corporate-sponsorship-response.dto';
import {
  CorporateCoverageType,
  CorporateOrganizationStatus,
  CorporateContractStatus,
  CorporateBenefitPlanStatus,
  CorporateCodeStatus,
  CorporateSponsorshipStatus,
  CorporateBillingMode,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CalculateSessionFinancialBreakdownService } from '@modules/financial-rules/services/calculate-session-financial-breakdown.service';

@Injectable()
export class PreviewCorporateSponsorshipUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeHashService: CorporateCodeHashService,
    private readonly codeRepository: CorporateBenefitCodeRepository,
    private readonly organizationRepository: CorporateOrganizationRepository,
    private readonly contractRepository: CorporateContractRepository,
    private readonly benefitPlanRepository: CorporateBenefitPlanRepository,
    private readonly calculateFinancialBreakdown: CalculateSessionFinancialBreakdownService,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    companyCode: string;
    benefitCode: string;
  }): Promise<CorporateSponsorshipPreviewResponseDto> {
    const session = await this.prisma.session.findUnique({
      where: { id: input.sessionId },
      include: {
        patient: {
          include: {
            user: { select: { id: true } },
          },
        },
        practitioner: {
          select: {
            id: true,
            publicSlug: true,
            sessionPrice30: true,
            sessionPrice60: true,
            sessionPrice30Egp: true,
            sessionPrice60Egp: true,
            sessionPrice30Usd: true,
            sessionPrice60Usd: true,
            country: { select: { isoCode: true, currencyCode: true } },
            specialties: true,
          },
        },
        corporateSponsorship: true,
      },
    });

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.notFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    if (session.patient?.user?.id !== input.userId) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.notFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    const validStatuses: SessionStatus[] = [
      SessionStatus.PENDING_PAYMENT,
      SessionStatus.PENDING_PRACTITIONER_RESPONSE,
      SessionStatus.CONFIRMED,
    ];
    if (!validStatuses.includes(session.status)) {
      return {
        eligible: false,
        organizationName: '',
        planName: '',
        coverageType: 'FREE_SESSION' as CorporateCoverageType,
        originalAmount: '0',
        coveredAmount: '0',
        patientPayAmount: '0',
        currency: '',
        reservationTtlMinutes: 0,
        message: 'sponsorship.errors.sessionNotEligible',
      };
    }

    if (session.corporateSponsorship) {
      return {
        eligible: false,
        organizationName: '',
        planName: '',
        coverageType: 'FREE_SESSION' as CorporateCoverageType,
        originalAmount: '0',
        coveredAmount: '0',
        patientPayAmount: '0',
        currency: '',
        reservationTtlMinutes: 0,
        message: 'sponsorship.errors.sessionAlreadyHasSponsorship',
      };
    }

    const { codeHash } = this.codeHashService.hashCode(
      input.companyCode,
      input.benefitCode,
    );

    const code = await this.codeRepository.findByHash(codeHash);
    if (!code) {
      return this.notEligibleGeneric();
    }

    const orgValidation = await this.validateOrganization(code.benefitPlan.contract.organization.id);
    if (!orgValidation.valid) return this.notEligibleGeneric(orgValidation.message);

    const contractValidation = await this.validateContract(code.contractId);
    if (!contractValidation.valid) return this.notEligibleGeneric(contractValidation.message);

    const planValidation = await this.validateBenefitPlan(code.benefitPlanId);
    if (!planValidation.valid) return this.notEligibleGeneric(planValidation.message);

    const now = new Date();
    if (code.status !== CorporateCodeStatus.AVAILABLE) {
      return this.notEligibleGeneric();
    }
    if (code.expiresAt && code.expiresAt <= now) {
      return this.notEligibleGeneric();
    }

    const plan = code.benefitPlan;
    const contract = code.benefitPlan.contract;

    const financialResult = await this.calculateFinancialBreakdown.calculate({
      session: {
        id: session.id,
        flowType: session.flowType as SessionFlowType,
        sessionMode: session.sessionMode as SessionMode,
        durationMinutes: session.durationMinutes,
        practitioner: {
          id: session.practitioner.id,
          publicSlug: session.practitioner.publicSlug,
          sessionPrice30: session.practitioner.sessionPrice30,
          sessionPrice60: session.practitioner.sessionPrice60,
          sessionPrice30Egp: session.practitioner.sessionPrice30Egp,
          sessionPrice60Egp: session.practitioner.sessionPrice60Egp,
          sessionPrice30Usd: session.practitioner.sessionPrice30Usd,
          sessionPrice60Usd: session.practitioner.sessionPrice60Usd,
          countryId: session.practitioner.country?.isoCode ?? null,
          country: session.practitioner.country,
          specialties: session.practitioner.specialties ?? [],
        },
        patient: {
          id: session.patient.id,
          countryId: null,
          country: null,
        },
        payments: [],
      },
    });

    const originalAmount = financialResult.amountTotal;

    if (originalAmount === '0.00' || originalAmount === '0') {
      return this.notEligibleGeneric('sponsorship.errors.pricingUnavailable');
    }

    const coverage = this.calculateCoverage({
      coverageType: plan.coverageType as CorporateCoverageType,
      coveragePercent: plan.coveragePercent ?? 100,
      maxCoverageAmount: plan.maxCoverageAmount,
      originalAmount,
    });

    return {
      eligible: true,
      organizationName: code.benefitPlan.contract.organization.name,
      planName: plan.name,
      coverageType: plan.coverageType as CorporateCoverageType,
      originalAmount: coverage.originalAmount,
      coveredAmount: coverage.coveredAmount,
      patientPayAmount: coverage.patientPayAmount,
      currency: contract.currency,
      reservationTtlMinutes: plan.codeReservationTtlMinutes,
    };
  }

  private async validateOrganization(orgId: string): Promise<{ valid: boolean; message?: string }> {
    const org = await this.organizationRepository.findById(orgId);
    if (!org || org.status !== CorporateOrganizationStatus.ACTIVE) {
      return { valid: false };
    }
    return { valid: true };
  }

  private async validateContract(contractId: string): Promise<{ valid: boolean; message?: string }> {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) return { valid: false };
    if (contract.status !== CorporateContractStatus.ACTIVE) return { valid: false };
    const now = new Date();
    if (contract.startDate && contract.startDate > now) return { valid: false };
    if (contract.endDate && contract.endDate < now) return { valid: false };
    if (contract.billingMode !== CorporateBillingMode.PREPAID) {
      return { valid: false, message: 'sponsorship.errors.postpaidNotSupported' };
    }
    return { valid: true };
  }

  private async validateBenefitPlan(planId: string): Promise<{ valid: boolean; message?: string }> {
    const plan = await this.benefitPlanRepository.findById(planId);
    if (!plan) return { valid: false };
    if (plan.status !== CorporateBenefitPlanStatus.ACTIVE) return { valid: false };
    return { valid: true };
  }

  private calculateCoverage(input: {
    coverageType: CorporateCoverageType;
    coveragePercent: number;
    maxCoverageAmount: Prisma.Decimal | null;
    originalAmount: string;
  }): { originalAmount: string; coveredAmount: string; patientPayAmount: string } {
    const original = new Prisma.Decimal(input.originalAmount ?? '0');
    let covered: Prisma.Decimal;
    let patientPay: Prisma.Decimal;

    switch (input.coverageType) {
      case CorporateCoverageType.FREE_SESSION:
        covered = original;
        break;
      case CorporateCoverageType.DISCOUNT_PERCENT:
        covered = original.mul(input.coveragePercent).div(100);
        break;
      case CorporateCoverageType.FIXED_AMOUNT:
        covered = input.maxCoverageAmount
          ? Prisma.Decimal.min(input.maxCoverageAmount, original)
          : original;
        break;
      default:
        covered = original;
    }

    if (input.maxCoverageAmount && covered.gt(input.maxCoverageAmount)) {
      covered = input.maxCoverageAmount;
    }

    if (covered.gt(original)) covered = original;
    patientPay = original.sub(covered);
    if (patientPay.lt(0)) patientPay = new Prisma.Decimal(0);

    return {
      originalAmount: original.toFixed(2),
      coveredAmount: covered.toFixed(2),
      patientPayAmount: patientPay.toFixed(2),
    };
  }

  private notEligibleGeneric(message?: string): CorporateSponsorshipPreviewResponseDto {
    return {
      eligible: false,
      organizationName: '',
      planName: '',
      coverageType: 'FREE_SESSION' as CorporateCoverageType,
      originalAmount: '0',
      coveredAmount: '0',
      patientPayAmount: '0',
      currency: '',
      reservationTtlMinutes: 0,
      message: message ?? 'sponsorship.errors.codeNotAvailable',
    };
  }
}

@Injectable()
export class ReserveCorporateSponsorshipUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeHashService: CorporateCodeHashService,
    private readonly codeRepository: CorporateBenefitCodeRepository,
    private readonly sponsorshipRepository: CorporateSessionSponsorshipRepository,
    private readonly organizationRepository: CorporateOrganizationRepository,
    private readonly contractRepository: CorporateContractRepository,
    private readonly benefitPlanRepository: CorporateBenefitPlanRepository,
    private readonly calculateFinancialBreakdown: CalculateSessionFinancialBreakdownService,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    companyCode: string;
    benefitCode: string;
  }): Promise<{ sponsorshipId: string; reservedUntil: Date; originalAmount: string; coveredAmount: string; patientPayAmount: string; currency: string; coverageType: CorporateCoverageType; planName: string; organizationName: string }> {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: input.sessionId },
        include: {
          patient: {
            include: {
              user: { select: { id: true } },
              country: true,
            },
          },
          practitioner: {
            select: {
              id: true,
              publicSlug: true,
              sessionPrice30: true,
              sessionPrice60: true,
              sessionPrice30Egp: true,
              sessionPrice60Egp: true,
              sessionPrice30Usd: true,
              sessionPrice60Usd: true,
              country: { select: { isoCode: true, currencyCode: true } },
              specialties: true,
            },
          },
          corporateSponsorship: true,
        },
      });

      if (!session) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.notFound',
          error: 'SESSION_NOT_FOUND',
        });
      }

      if (session.patient?.user?.id !== input.userId) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.notFound',
          error: 'SESSION_NOT_FOUND',
        });
      }

      const validStatuses: SessionStatus[] = [
        SessionStatus.PENDING_PAYMENT,
        SessionStatus.PENDING_PRACTITIONER_RESPONSE,
        SessionStatus.CONFIRMED,
      ];
      if (!validStatuses.includes(session.status)) {
        throw new BadRequestException({
          messageKey: 'sponsorship.errors.sessionNotEligible',
          error: 'SPONSORSHIP_SESSION_NOT_ELIGIBLE',
        });
      }

      if (session.corporateSponsorship) {
        const existing = session.corporateSponsorship;
        if (existing.status === CorporateSponsorshipStatus.RESERVED) {
          throw new ConflictException({
            messageKey: 'sponsorship.errors.sessionAlreadyHasSponsorship',
            error: 'SPONSORSHIP_ALREADY_EXISTS',
          });
        }
        throw new ConflictException({
          messageKey: 'sponsorship.errors.sessionAlreadyHasSponsorship',
          error: 'SPONSORSHIP_ALREADY_EXISTS',
        });
      }

      const { codeHash } = this.codeHashService.hashCode(
        input.companyCode,
        input.benefitCode,
      );

      const code = await this.codeRepository.findByHash(codeHash, tx);
      if (!code) {
        throw new BadRequestException({
          messageKey: 'sponsorship.errors.codeNotAvailable',
          error: 'SPONSORSHIP_CODE_NOT_FOUND',
        });
      }

      const now = new Date();

      if (code.benefitPlan.contract.organization.status !== CorporateOrganizationStatus.ACTIVE) {
        throw new BadRequestException({
          messageKey: 'sponsorship.errors.codeNotAvailable',
          error: 'SPONSORSHIP_CODE_NOT_AVAILABLE',
        });
      }

      const contract = code.benefitPlan.contract;
      if (contract.status !== CorporateContractStatus.ACTIVE) {
        throw new BadRequestException({
          messageKey: 'sponsorship.errors.codeNotAvailable',
          error: 'SPONSORSHIP_CODE_NOT_AVAILABLE',
        });
      }
      if (contract.startDate && contract.startDate > now) {
        throw new BadRequestException({
          messageKey: 'sponsorship.errors.codeNotAvailable',
          error: 'SPONSORSHIP_CODE_NOT_AVAILABLE',
        });
      }
      if (contract.endDate && contract.endDate < now) {
        throw new BadRequestException({
          messageKey: 'sponsorship.errors.codeNotAvailable',
          error: 'SPONSORSHIP_CODE_NOT_AVAILABLE',
        });
      }
      if (contract.billingMode !== CorporateBillingMode.PREPAID) {
        throw new BadRequestException({
          messageKey: 'sponsorship.errors.postpaidNotSupported',
          error: 'SPONSORSHIP_POSTPAID_NOT_SUPPORTED',
        });
      }

      if (code.benefitPlan.status !== CorporateBenefitPlanStatus.ACTIVE) {
        throw new BadRequestException({
          messageKey: 'sponsorship.errors.codeNotAvailable',
          error: 'SPONSORSHIP_CODE_NOT_AVAILABLE',
        });
      }

      if (code.status === CorporateCodeStatus.RESERVED) {
        if (code.reservedUntil && code.reservedUntil > now) {
          throw new ConflictException({
            messageKey: 'sponsorship.errors.codeAlreadyReserved',
            error: 'SPONSORSHIP_CODE_ALREADY_RESERVED',
          });
        }
        const reclaimed = await this.codeRepository.reclaimExpiredCode({
          codeHash,
          reservedByUserId: input.userId,
          reservedSessionId: input.sessionId,
          reservedUntil: new Date(Date.now() + code.benefitPlan.codeReservationTtlMinutes * 60 * 1000),
        }, tx);
        if (reclaimed.count === 0) {
          throw new ConflictException({
            messageKey: 'sponsorship.errors.codeNotAvailable',
            error: 'SPONSORSHIP_CODE_NOT_AVAILABLE',
          });
        }
      } else if (code.status === CorporateCodeStatus.AVAILABLE) {
        const reservedUntil = new Date(Date.now() + code.benefitPlan.codeReservationTtlMinutes * 60 * 1000);
        const result = await this.codeRepository.reserveCode({
          codeHash,
          reservedByUserId: input.userId,
          reservedSessionId: input.sessionId,
          reservedUntil,
        }, tx);
        if (result.count === 0) {
          throw new ConflictException({
            messageKey: 'sponsorship.errors.codeNotAvailable',
            error: 'SPONSORSHIP_CODE_NOT_AVAILABLE',
          });
        }
      } else {
        throw new BadRequestException({
          messageKey: 'sponsorship.errors.codeNotAvailable',
          error: 'SPONSORSHIP_CODE_NOT_AVAILABLE',
        });
      }

      const financialResult = await this.calculateFinancialBreakdown.calculate({
        session: {
          id: session.id,
          flowType: session.flowType as SessionFlowType,
          sessionMode: session.sessionMode as SessionMode,
          durationMinutes: session.durationMinutes,
          practitioner: {
            id: session.practitioner.id,
            publicSlug: session.practitioner.publicSlug,
            sessionPrice30: session.practitioner.sessionPrice30,
            sessionPrice60: session.practitioner.sessionPrice60,
            sessionPrice30Egp: session.practitioner.sessionPrice30Egp,
            sessionPrice60Egp: session.practitioner.sessionPrice60Egp,
            sessionPrice30Usd: session.practitioner.sessionPrice30Usd,
            sessionPrice60Usd: session.practitioner.sessionPrice60Usd,
            countryId: session.practitioner.country?.isoCode ?? null,
            country: session.practitioner.country,
            specialties: session.practitioner.specialties ?? [],
          },
          patient: {
            id: session.patient.id,
            countryId: session.patient.country?.id ?? null,
            country: session.patient.country,
          },
          payments: [],
        },
      });

      const originalAmount = financialResult.amountTotal;

      if (originalAmount === '0.00' || originalAmount === '0') {
        throw new BadRequestException({
          messageKey: 'sponsorship.errors.pricingUnavailable',
          error: 'SPONSORSHIP_PRICING_UNAVAILABLE',
        });
      }

      const coverage = this.calculateCoverage({
        coverageType: code.benefitPlan.coverageType as CorporateCoverageType,
        coveragePercent: code.benefitPlan.coveragePercent ?? 100,
        maxCoverageAmount: code.benefitPlan.maxCoverageAmount,
        originalAmount,
      });

      const reservedUntil = new Date(Date.now() + code.benefitPlan.codeReservationTtlMinutes * 60 * 1000);

      const sponsorship = await this.sponsorshipRepository.create({
        sessionId: input.sessionId,
        organizationId: code.organizationId,
        contractId: code.contractId,
        benefitPlanId: code.benefitPlanId,
        codeId: code.id,
        coverageType: code.benefitPlan.coverageType,
        billingMode: contract.billingMode,
        market: contract.market ?? undefined,
        originalAmount: new Prisma.Decimal(coverage.originalAmount),
        coveredAmount: new Prisma.Decimal(coverage.coveredAmount),
        patientPayAmount: new Prisma.Decimal(coverage.patientPayAmount),
        currency: contract.currency,
        snapshotJson: {
          organizationName: code.benefitPlan.contract.organization.name,
          companyCode: input.companyCode.toUpperCase().trim(),
          planName: code.benefitPlan.name,
          contractCurrency: contract.currency,
          calculatedAt: new Date().toISOString(),
          reservationTtlMinutes: code.benefitPlan.codeReservationTtlMinutes,
        },
        status: CorporateSponsorshipStatus.RESERVED,
      }, tx);

      return {
        sponsorshipId: sponsorship.id,
        reservedUntil,
        originalAmount: coverage.originalAmount,
        coveredAmount: coverage.coveredAmount,
        patientPayAmount: coverage.patientPayAmount,
        currency: contract.currency,
        coverageType: code.benefitPlan.coverageType as CorporateCoverageType,
        planName: code.benefitPlan.name,
        organizationName: code.benefitPlan.contract.organization.name,
      };
    });
  }

  private calculateCoverage(input: {
    coverageType: CorporateCoverageType;
    coveragePercent: number;
    maxCoverageAmount: Prisma.Decimal | null;
    originalAmount: string;
  }): { originalAmount: string; coveredAmount: string; patientPayAmount: string } {
    const original = new Prisma.Decimal(input.originalAmount ?? '0');
    let covered: Prisma.Decimal;

    switch (input.coverageType) {
      case CorporateCoverageType.FREE_SESSION:
        covered = original;
        break;
      case CorporateCoverageType.DISCOUNT_PERCENT:
        covered = original.mul(input.coveragePercent).div(100);
        break;
      case CorporateCoverageType.FIXED_AMOUNT:
        covered = input.maxCoverageAmount
          ? Prisma.Decimal.min(input.maxCoverageAmount, original)
          : original;
        break;
      default:
        covered = original;
    }

    if (input.maxCoverageAmount && covered.gt(input.maxCoverageAmount)) {
      covered = input.maxCoverageAmount;
    }
    if (covered.gt(original)) covered = original;

    let patientPay = original.sub(covered);
    if (patientPay.lt(0)) patientPay = new Prisma.Decimal(0);

    return {
      originalAmount: original.toFixed(2),
      coveredAmount: covered.toFixed(2),
      patientPayAmount: patientPay.toFixed(2),
    };
  }
}

@Injectable()
export class ReleaseCorporateSponsorshipUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeRepository: CorporateBenefitCodeRepository,
    private readonly sponsorshipRepository: CorporateSessionSponsorshipRepository,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
  }): Promise<{ released: boolean; previousSponsorshipId: string; message?: string }> {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: input.sessionId },
        include: {
          patient: {
            include: {
              user: { select: { id: true } },
            },
          },
          corporateSponsorship: {
            include: {
              code: {
                select: { id: true, codeHash: true, status: true, reservedSessionId: true, reservedByUserId: true },
              },
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.notFound',
          error: 'SESSION_NOT_FOUND',
        });
      }

      if (session.patient?.user?.id !== input.userId) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.notFound',
          error: 'SESSION_NOT_FOUND',
        });
      }

      const sponsorship = session.corporateSponsorship;
      if (!sponsorship) {
        return { released: true, previousSponsorshipId: '', message: 'sponsorship.messages.noReservationFound' };
      }

      if (sponsorship.status !== CorporateSponsorshipStatus.RESERVED) {
        return { released: false, previousSponsorshipId: sponsorship.id, message: 'sponsorship.errors.cannotReleaseNonReserved' };
      }

      const code = sponsorship.code;
      if (code.status === CorporateCodeStatus.USED) {
        await this.sponsorshipRepository.updateStatus(sponsorship.id, CorporateSponsorshipStatus.RELEASED, tx);
        return { released: false, previousSponsorshipId: sponsorship.id, message: 'sponsorship.errors.codeAlreadyUsed' };
      }

      if (
        code.status === CorporateCodeStatus.RESERVED &&
        code.reservedSessionId === input.sessionId &&
        code.reservedByUserId === input.userId
      ) {
        await this.codeRepository.releaseCode({
          codeHash: code.codeHash,
          sessionId: input.sessionId,
          userId: input.userId,
        }, tx);
      }

      await this.sponsorshipRepository.updateStatus(sponsorship.id, CorporateSponsorshipStatus.RELEASED, tx);

      return { released: true, previousSponsorshipId: sponsorship.id };
    });
  }
}