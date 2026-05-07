import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionMode } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PublicPractitionerReadRepository } from '@modules/practitioners/repositories/public-practitioner-read.repository';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PackagePlanPresenter } from '../presenters/package-plan.presenter';
import { PackagePlanQuotePresenter } from '../presenters/package-plan-quote.presenter';
import { PackagePlanRepository } from '../repositories/package-plan.repository';
import { PackagePlanPolicyService } from '../services/package-plan-policy.service';
import { PackageQuoteCalculatorService } from '../services/package-quote-calculator.service';
import { PackagePlanQuotedListResultViewModel } from '../types/package-plans.types';

type PublicPackagePricingPractitioner = {
  sessionPrice30Egp: string | { toString(): string } | null;
  sessionPrice30Usd: string | { toString(): string } | null;
  sessionPrice60Egp: string | { toString(): string } | null;
  sessionPrice60Usd: string | { toString(): string } | null;
};

@Injectable()
export class ListPublicPackagePlansUseCase {
  constructor(
    private readonly packagePlanRepository: PackagePlanRepository,
    private readonly packagePlanPresenter: PackagePlanPresenter,
    private readonly packagePlanQuotePresenter: PackagePlanQuotePresenter,
    private readonly packagePlanPolicyService: PackagePlanPolicyService,
    private readonly publicPractitionerReadRepository: PublicPractitionerReadRepository,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly packageQuoteCalculatorService: PackageQuoteCalculatorService,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    practitionerSlug: string;
    durationMinutes?: number;
    sessionMode?: SessionMode;
    currencyCode?: string;
  }): Promise<PackagePlanQuotedListResultViewModel> {
    await this.packagePlanPolicyService.assertPackagesEnabled();

    const practitioner = await this.publicPractitionerReadRepository.findByPublicSlug(
      input.practitionerSlug,
      input.locale,
    );

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
      return { items: [] };
    }

    const plans = await this.packagePlanRepository.listActive();
    const durationMinutes = input.durationMinutes ?? 60;
    const sessionMode = input.sessionMode ?? SessionMode.VIDEO;
    const currencyCode =
      input.currencyCode?.trim().toUpperCase() ||
      this.packagePlanPolicyService.resolveDefaultPreviewCurrency({
        practitionerCurrencyCode: practitioner.country?.currencyCode ?? null,
      });

    const items = await Promise.all(
      plans.map(async (plan) => {
        try {
          const pricingPractitioner =
            practitioner as typeof practitioner & PublicPackagePricingPractitioner;
          const quote = await this.packageQuoteCalculatorService.calculate({
            plan,
            practitioner: pricingPractitioner,
            selectedDurationMinutes: durationMinutes,
            sessionMode,
            selectedCurrencyCode: currencyCode,
            patient: null,
            internalBreakdownVisible: false,
          });

          return this.packagePlanQuotePresenter.toPublicQuotedItem(
            this.packagePlanPresenter.toViewModel(plan),
            quote,
          );
        } catch (error) {
          const code = (error as { response?: { error?: string } } | null)?.response
            ?.error;

          if (code === 'PACKAGE_PLAN_CURRENCY_PRICE_UNAVAILABLE') {
            return null;
          }

          throw error;
        }
      }),
    );

    return {
      items: items.filter((item): item is NonNullable<typeof item> => item !== null),
    };
  }
}
