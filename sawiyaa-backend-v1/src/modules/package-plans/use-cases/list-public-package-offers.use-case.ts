import { Injectable } from '@nestjs/common';
import { SessionMode, Prisma } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { PackagePlanPresenter } from '../presenters/package-plan.presenter';
import { PackagePlanRepository } from '../repositories/package-plan.repository';
import { PackagePlanPolicyService } from '../services/package-plan-policy.service';
import { PackageQuoteCalculatorService } from '../services/package-quote-calculator.service';
import { PackagePlanQuotePresenter } from '../presenters/package-plan-quote.presenter';
import {
  PublicPackageOffersQueryDto,
  PackageOfferSortOption,
} from '../dto/public-package-offers-query.dto';

export interface PackageOfferItemViewModel {
  practitioner: {
    id: string;
    publicSlug: string;
    displayName: string;
    avatarUrl: string | null;
    professionalTitle: string | null;
    specialties: Array<{ id: string; name: string }>;
  };
  packagePlan: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    sessionCount: number;
    discountPercent: string;
  };
  selectedDurationMinutes: number;
  sessionMode: SessionMode;
  availableDurations: Array<{
    durationMinutes: number;
    quote: {
      currencyCode: string;
      baseSessionPrice: string;
      undiscountedTotal: string;
      discountAmount: string;
      patientPayableTotal: string;
    };
  }>;
  activeQuote: {
    currencyCode: string;
    baseSessionPrice: string;
    undiscountedTotal: string;
    discountAmount: string;
    patientPayableTotal: string;
  };
  ctaHref: string;
}

export interface PublicPackageOffersListResultViewModel {
  items: PackageOfferItemViewModel[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

@Injectable()
export class ListPublicPackageOffersUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly packagePlanRepository: PackagePlanRepository,
    private readonly packagePlanPresenter: PackagePlanPresenter,
    private readonly packagePlanQuotePresenter: PackagePlanQuotePresenter,
    private readonly packagePlanPolicyService: PackagePlanPolicyService,
    private readonly packageQuoteCalculatorService: PackageQuoteCalculatorService,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    query: PublicPackageOffersQueryDto;
    guestCountryIsoCode?: string | null;
  }): Promise<PublicPackageOffersListResultViewModel> {
    await this.packagePlanPolicyService.assertPackagesEnabled();

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 12;
    const selectedDuration = input.query.durationMinutes ?? 60;
    const sessionMode = input.query.sessionMode ?? SessionMode.VIDEO;

    // 1. Fetch active standardized plans
    let plans = await this.packagePlanRepository.listActive();
    if (input.query.sessionCount) {
      plans = plans.filter(
        (plan) => plan.sessionCount === input.query.sessionCount,
      );
    }

    if (plans.length === 0) {
      return {
        items: [],
        pagination: { page, limit, totalItems: 0, totalPages: 1 },
      };
    }

    // 2. Build practitioner query conditions
    const where: Prisma.PractitionerProfileWhereInput = {
      status: 'APPROVED',
      isPublicProfilePublished: true,
      acceptsPackages: true,
      user: {
        status: 'ACTIVE',
      },
    };

    if (input.query.search?.trim()) {
      const searchStr = input.query.search.trim();
      where.OR = [
        { user: { displayName: { contains: searchStr, mode: 'insensitive' } } },
        { professionalTitle: { contains: searchStr, mode: 'insensitive' } },
        { bio: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    if (input.query.specialtyId?.trim()) {
      where.specialties = {
        some: {
          specialtyId: input.query.specialtyId.trim(),
          specialty: { isActive: true },
        },
      };
    }

    const practitioners = await this.prisma.practitionerProfile.findMany({
      where,
      select: {
        id: true,
        publicSlug: true,
        sessionPrice30: true,
        sessionPrice60: true,
        sessionPrice30Egp: true,
        sessionPrice30Usd: true,
        sessionPrice60Egp: true,
        sessionPrice60Usd: true,
        avatarUrl: true,
        professionalTitle: true,
        acceptsPackages: true,
        countryId: true,
        country: {
          select: {
            id: true,
            isoCode: true,
            currencyCode: true,
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
            status: true,
          },
        },
        specialties: {
          where: { specialty: { isActive: true } },
          select: {
            specialtyId: true,
            specialty: {
              select: {
                id: true,
                translations: {
                  where: { locale: { in: [input.locale, 'en'] } },
                  orderBy: { locale: 'asc' },
                  select: { locale: true, title: true },
                },
              },
            },
          },
        },
      },
    });

    // 3. Generate offer combinations and calculate quotes
    const offerItems: PackageOfferItemViewModel[] = [];

    for (const practitioner of practitioners) {
      const practitionerDisplayName =
        practitioner.user.displayName?.trim() || 'Practitioner';

      const specialties = practitioner.specialties.map((s) => {
        const trans = s.specialty.translations[0];
        return {
          id: s.specialty.id,
          name: trans?.title || 'Specialty',
        };
      });

      for (const plan of plans) {
        const availableDurations: PackageOfferItemViewModel['availableDurations'] =
          [];
        const durationOptions = [30, 60];

        for (const duration of durationOptions) {
          try {
            const quote = await this.packageQuoteCalculatorService.calculate({
              plan,
              practitioner: practitioner as any,
              selectedDurationMinutes: duration,
              sessionMode,
              selectedCurrencyCode: null,
              requestCountryIsoCode: input.guestCountryIsoCode ?? null,
              operatingCountryIsoCode: practitioner.country?.isoCode ?? null,
              patient: null,
              internalBreakdownVisible: false,
            });

            availableDurations.push({
              durationMinutes: duration,
              quote: {
                currencyCode: quote.selectedCurrencyCode,
                baseSessionPrice: quote.selectedBaseSessionPrice.toString(),
                undiscountedTotal: quote.undiscountedTotal.toString(),
                discountAmount: quote.discountAmount.toString(),
                patientPayableTotal: quote.patientPayableTotal.toString(),
              },
            });
          } catch (err) {
            // Price unavailable for this duration
          }
        }

        if (availableDurations.length === 0) {
          continue;
        }

        const activeDurationQuote =
          availableDurations.find(
            (d) => d.durationMinutes === selectedDuration,
          ) || availableDurations[0];

        const planViewModel = this.packagePlanPresenter.toViewModel(plan);

        offerItems.push({
          practitioner: {
            id: practitioner.id,
            publicSlug: practitioner.publicSlug || practitioner.id,
            displayName: practitionerDisplayName,
            avatarUrl: practitioner.avatarUrl,
            professionalTitle: practitioner.professionalTitle,
            specialties,
          },
          packagePlan: {
            id: planViewModel.id,
            code: planViewModel.code,
            title: planViewModel.title,
            description: planViewModel.description,
            sessionCount: planViewModel.sessionCount,
            discountPercent: planViewModel.discountPercent,
          },
          selectedDurationMinutes: activeDurationQuote.durationMinutes,
          sessionMode,
          availableDurations,
          activeQuote: activeDurationQuote.quote,
          ctaHref: `/practitioners/${practitioner.publicSlug || practitioner.id}`,
        });
      }
    }

    // 4. Sort offer items
    const sortOption = input.query.sort ?? PackageOfferSortOption.RECOMMENDED;
    offerItems.sort((a, b) => {
      if (sortOption === PackageOfferSortOption.LOWEST_PRICE) {
        return (
          parseFloat(a.activeQuote.patientPayableTotal) -
          parseFloat(b.activeQuote.patientPayableTotal)
        );
      }
      if (sortOption === PackageOfferSortOption.HIGHEST_SAVINGS) {
        return (
          parseFloat(b.activeQuote.discountAmount) -
          parseFloat(a.activeQuote.discountAmount)
        );
      }
      // Recommended: sort by discountPercent desc then practitioner name
      return (
        parseFloat(b.packagePlan.discountPercent) -
        parseFloat(a.packagePlan.discountPercent)
      );
    });

    // 5. Server-side paginate
    const totalItems = offerItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const paginatedItems = offerItems.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }
}
