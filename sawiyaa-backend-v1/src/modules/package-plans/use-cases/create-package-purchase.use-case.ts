import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  PackageSchedulePolicy,
  PatientPackagePurchaseStatus,
  SessionFlowType,
  SessionPaymentCoverageType,
  SessionMode,
  SessionStatus,
} from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { PublicPractitionerReadRepository } from '@modules/practitioners/repositories/public-practitioner-read.repository';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { PackagePurchasePresenter } from '../presenters/package-purchase.presenter';
import { PackagePlanRepository } from '../repositories/package-plan.repository';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';
import { PackagePlanPolicyService } from '../services/package-plan-policy.service';
import { PackageQuoteCalculatorService } from '../services/package-quote-calculator.service';
import { ValidatePackagePurchaseSlotsService } from '../services/validate-package-purchase-slots.service';
import { toSessionOverlapConflictException } from '@modules/sessions/utils/session-overlap-conflict.util';
import { PatientPackagePurchaseResultViewModel } from '../types/package-purchases.types';

type CreatedSessionRecord = Awaited<
  ReturnType<SessionRepository['createSession']>
>;

type PackagePurchasePractitioner = {
  id: string;
  publicSlug: string;
  user: {
    timezone: string | null;
  };
  countryId: string | null;
  country: {
    isoCode: string | null;
    currencyCode: string | null;
  } | null;
  acceptsPackages: boolean;
  sessionPrice30Egp: string | { toString(): string } | null;
  sessionPrice30Usd: string | { toString(): string } | null;
  sessionPrice60Egp: string | { toString(): string } | null;
  sessionPrice60Usd: string | { toString(): string } | null;
  status: string;
  isPublicProfilePublished: boolean;
  specialties: Array<{
    specialtyId: string;
    isPrimary: boolean;
  }>;
};

@Injectable()
export class CreatePackagePurchaseUseCase {
  private readonly paymentReservationMinutes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly publicPractitionerReadRepository: PublicPractitionerReadRepository,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly packagePlanRepository: PackagePlanRepository,
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly packagePurchasePresenter: PackagePurchasePresenter,
    private readonly packagePlanPolicyService: PackagePlanPolicyService,
    private readonly packageQuoteCalculatorService: PackageQuoteCalculatorService,
    private readonly validatePackagePurchaseSlotsService: ValidatePackagePurchaseSlotsService,
    private readonly sessionRepository: SessionRepository,
  ) {
    this.paymentReservationMinutes = this.configService.get<number>(
      'session.paymentReservationMinutes',
      15,
    );
  }

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    packagePlanCode: string;
    practitionerSlug: string;
    durationMinutes: 30 | 60;
    sessionMode: SessionMode;
    requestCountryIsoCode?: string | null;
    selectedSessionSlots: Array<{
      scheduledStartAt: string;
    }>;
  }): Promise<PatientPackagePurchaseResultViewModel> {
    await this.packagePlanPolicyService.assertPackagesEnabled();
    await this.packagePlanPolicyService.assertPurchasesEnabled();

    const [patientProfile, practitioner, packagePlan] = await Promise.all([
      this.patientProfileRepository.findByUserId(input.userId),
      this.publicPractitionerReadRepository.findByPublicSlug(
        input.practitionerSlug,
        input.locale,
      ),
      this.packagePlanRepository.findByCode(
        input.packagePlanCode.trim().toUpperCase(),
      ),
    ]);

    if (!patientProfile) {
      throw new NotFoundException({
        messageKey: 'patients.errors.notFound',
        error: 'PATIENT_PROFILE_NOT_FOUND',
      });
    }

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.notFound',
        error: 'PRACTITIONER_NOT_FOUND',
      });
    }

    const visibility = this.publicPractitionerVisibilityPolicy.evaluate({
      practitionerStatus: practitioner.status,
      userStatus: practitioner.user.status,
      isPublicProfilePublished: practitioner.isPublicProfilePublished,
      hasPublicSlug: Boolean(practitioner.publicSlug?.trim()),
      hasDisplayName: Boolean(practitioner.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(practitioner.professionalTitle?.trim()),
      hasBio: Boolean(practitioner.bio?.trim()),
      hasAtLeastOneActiveSpecialty: practitioner.specialties.length > 0,
    });

    if (!visibility.isVisible || !practitioner.acceptsPackages) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.practitionerNotEligible',
        error: 'PACKAGE_PLAN_PRACTITIONER_NOT_ELIGIBLE',
      });
    }

    if (!packagePlan) {
      throw new NotFoundException({
        messageKey: 'packagePlans.errors.notFound',
        error: 'PACKAGE_PLAN_NOT_FOUND',
      });
    }

    if (!packagePlan.isActive || packagePlan.archivedAt) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.inactivePlan',
        error: 'PACKAGE_PLAN_INACTIVE',
      });
    }

    const quote = await this.packageQuoteCalculatorService.calculate({
      plan: packagePlan,
      practitioner: practitioner as PackagePurchasePractitioner,
      selectedDurationMinutes: input.durationMinutes,
      sessionMode: input.sessionMode,
      selectedCurrencyCode: null,
      requestCountryIsoCode: input.requestCountryIsoCode,
      patientCountryIsoCode: patientProfile.country?.isoCode ?? null,
      operatingCountryIsoCode: practitioner.country?.isoCode ?? null,
      patient: {
        id: patientProfile.id,
        countryId: patientProfile.countryId,
      },
      internalBreakdownVisible: true,
    });

    this.assertInternalQuoteFields(quote);

    const paymentExpiresAt = new Date(
      Date.now() + this.paymentReservationMinutes * 60 * 1000,
    );

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const validatedSlots =
          await this.validatePackagePurchaseSlotsService.validate({
            practitionerId: practitioner.id,
            practitionerTimezone: practitioner.user.timezone,
            patientId: patientProfile.id,
            durationMinutes: input.durationMinutes,
            sessionMode: input.sessionMode,
            expectedSlotCount: packagePlan.sessionCount,
            selectedSessionSlots: input.selectedSessionSlots,
            tx,
          });

        const purchase = await this.packagePurchaseRepository.create(
          {
            packagePlanId: packagePlan.id,
            practitionerId: practitioner.id,
            patientId: patientProfile.id,
            paymentId: null,
            status: PatientPackagePurchaseStatus.PENDING_PAYMENT,
            paymentInitiatedAt: null,
            paymentExpiresAt,
            paidAt: null,
            activatedAt: null,
            completedAt: null,
            expiredAt: null,
            cancelledAt: null,
            refundedAt: null,
            titleSnapshot: packagePlan.title,
            descriptionSnapshot: packagePlan.description,
            slugSnapshot: packagePlan.code,
            packageVersionSnapshot: 1,
            planIdSnapshot: packagePlan.id,
            planCodeSnapshot: packagePlan.code,
            sessionCountSnapshot: packagePlan.sessionCount,
            discountPercentSnapshot: quote.discountPercent,
            baseSessionPriceEgpSnapshot: quote.baseSessionPriceEgp ?? null,
            baseSessionPriceUsdSnapshot: quote.baseSessionPriceUsd ?? null,
            currencyCodeSnapshot: quote.selectedCurrencyCode,
            selectedBaseSessionPriceSnapshot: quote.selectedBaseSessionPrice,
            undiscountedTotalSnapshot: quote.undiscountedTotal,
            discountAmountSnapshot: quote.discountAmount,
            patientPayableTotalSnapshot: quote.patientPayableTotal,
            platformDiscountShareSnapshot: quote.platformDiscountShare,
            practitionerDiscountShareSnapshot: quote.practitionerDiscountShare,
            commissionModeSnapshot: quote.commissionMode,
            platformOriginalShareSnapshot: quote.platformOriginalShare,
            practitionerOriginalShareSnapshot: quote.practitionerOriginalShare,
            platformFinalShareSnapshot: quote.platformFinalShare,
            practitionerFinalShareSnapshot: quote.practitionerFinalShare,
            sessionDurationMinutesSnapshot: input.durationMinutes,
            sessionModeSnapshot: input.sessionMode,
            schedulePolicySnapshot:
              PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
            priceEgpSnapshot: quote.baseSessionPriceEgp ?? null,
            priceUsdSnapshot: quote.baseSessionPriceUsd ?? null,
            selectedCurrencyCode: quote.selectedCurrencyCode,
            selectedAmountSnapshot: quote.patientPayableTotal,
            metadataJson: {
              source: 'package-purchase',
              packagePlanCode: packagePlan.code,
              practitionerSlug: practitioner.publicSlug,
              selectedSessionSlots: validatedSlots.slots.map((slot) => ({
                scheduledStartAt: slot.scheduledStartAt.toISOString(),
                scheduledEndAt: slot.scheduledEndAt.toISOString(),
              })),
            },
          },
          tx,
        );

        const createdSessions: CreatedSessionRecord[] = [];
        for (const [index, slot] of validatedSlots.slots.entries()) {
          const sessionCode =
            await this.sessionRepository.reserveNextSessionCode(
              slot.scheduledStartAt,
              tx,
            );

          const createdSession = await this.sessionRepository.createSession(
            {
              sessionCode,
              patientId: patientProfile.id,
              practitionerId: practitioner.id,
              flowType: SessionFlowType.SCHEDULED,
              sessionMode: input.sessionMode,
              durationMinutes: input.durationMinutes,
              status: SessionStatus.PENDING_PAYMENT,
              requestedStartAt: slot.scheduledStartAt,
              scheduledStartAt: slot.scheduledStartAt,
              scheduledEndAt: slot.scheduledEndAt,
              expiresAt: paymentExpiresAt,
              timezoneSnapshot: validatedSlots.timezone,
              packagePurchaseId: purchase.id,
              packageSessionIndex: index + 1,
              packageSessionCount: packagePlan.sessionCount,
              paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
            },
            tx,
          );

          createdSessions.push(createdSession);
        }

        return {
          purchase,
          sessions: createdSessions,
        };
      });

      return {
        item: this.packagePurchasePresenter.toViewModel({
          purchase: created.purchase,
          sessions: created.sessions,
        }),
      };
    } catch (error) {
      const overlapConflict = toSessionOverlapConflictException(error);
      if (overlapConflict) {
        throw overlapConflict;
      }

      throw error;
    }
  }

  private assertInternalQuoteFields(quote: {
    discountPercent: string;
    baseSessionPriceEgp?: string | null;
    baseSessionPriceUsd?: string | null;
    selectedBaseSessionPrice: string;
    selectedCurrencyCode: string;
    undiscountedTotal: string;
    discountAmount: string;
    patientPayableTotal: string;
    platformDiscountShare?: string | null;
    practitionerDiscountShare?: string | null;
    commissionMode?: string | null;
    platformOriginalShare?: string | null;
    practitionerOriginalShare?: string | null;
    platformFinalShare?: string | null;
    practitionerFinalShare?: string | null;
  }): asserts quote is typeof quote & {
    platformDiscountShare: string;
    practitionerDiscountShare: string;
    commissionMode: string;
    platformOriginalShare: string;
    practitionerOriginalShare: string;
    platformFinalShare: string;
    practitionerFinalShare: string;
  } {
    const required = [
      quote.platformDiscountShare,
      quote.practitionerDiscountShare,
      quote.commissionMode,
      quote.platformOriginalShare,
      quote.practitionerOriginalShare,
      quote.platformFinalShare,
      quote.practitionerFinalShare,
    ];

    if (required.some((value) => value === null || value === undefined)) {
      throw new BadRequestException({
        messageKey: 'packagePurchases.errors.financialContextUnavailable',
        error: 'PACKAGE_PURCHASE_FINANCIAL_CONTEXT_UNAVAILABLE',
      });
    }
  }
}
