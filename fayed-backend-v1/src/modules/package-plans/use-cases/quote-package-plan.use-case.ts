import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionMode } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { PublicPractitionerReadRepository } from '@modules/practitioners/repositories/public-practitioner-read.repository';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PackagePlanPresenter } from '../presenters/package-plan.presenter';
import { PackagePlanQuotePresenter } from '../presenters/package-plan-quote.presenter';
import { PackagePlanRepository } from '../repositories/package-plan.repository';
import { PackagePlanPolicyService } from '../services/package-plan-policy.service';
import { PackageQuoteCalculatorService } from '../services/package-quote-calculator.service';
import { PackagePlanQuotedResultViewModel } from '../types/package-plans.types';

type PublicPackagePricingPractitioner = {
  sessionPrice30Egp: string | { toString(): string } | null;
  sessionPrice30Usd: string | { toString(): string } | null;
  sessionPrice60Egp: string | { toString(): string } | null;
  sessionPrice60Usd: string | { toString(): string } | null;
  country?: {
    isoCode?: string | null;
  } | null;
};

@Injectable()
export class QuotePackagePlanUseCase {
  constructor(
    private readonly packagePlanRepository: PackagePlanRepository,
    private readonly packagePlanPresenter: PackagePlanPresenter,
    private readonly packagePlanQuotePresenter: PackagePlanQuotePresenter,
    private readonly packagePlanPolicyService: PackagePlanPolicyService,
    private readonly publicPractitionerReadRepository: PublicPractitionerReadRepository,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly packageQuoteCalculatorService: PackageQuoteCalculatorService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    packagePlanCode: string;
    practitionerSlug: string;
    durationMinutes: number;
    sessionMode: SessionMode;
    requestedCurrencyCode?: string | null;
  }): Promise<PackagePlanQuotedResultViewModel> {
    await this.packagePlanPolicyService.assertPackagesEnabled();
    await this.packagePlanPolicyService.assertPurchasesEnabled();

    const [patientProfile, practitioner, plan] = await Promise.all([
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

    if (!plan) {
      throw new NotFoundException({
        messageKey: 'packagePlans.errors.notFound',
        error: 'PACKAGE_PLAN_NOT_FOUND',
      });
    }

    if (!plan.isActive || plan.archivedAt) {
      throw new BadRequestException({
        messageKey: 'packagePlans.errors.inactivePlan',
        error: 'PACKAGE_PLAN_INACTIVE',
      });
    }

    const quote = await this.packageQuoteCalculatorService.calculate({
      plan,
      practitioner: practitioner as typeof practitioner &
        PublicPackagePricingPractitioner,
      selectedDurationMinutes: input.durationMinutes,
      sessionMode: input.sessionMode,
      selectedCurrencyCode: null,
      patientCountryIsoCode: patientProfile.country?.isoCode ?? null,
      operatingCountryIsoCode: practitioner.country?.isoCode ?? null,
      patient: {
        id: patientProfile.id,
        countryId: patientProfile.countryId,
      },
      internalBreakdownVisible: false,
    });

    return this.packagePlanQuotePresenter.toResult(
      this.packagePlanPresenter.toViewModel(plan),
      quote,
      { internalBreakdownVisible: false },
    );
  }
}
