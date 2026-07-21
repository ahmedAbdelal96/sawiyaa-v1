import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityExceptionRepository } from '@modules/availability/repositories/availability-exception.repository';
import { PractitionerAvailabilityWeekRepository } from '@modules/availability/repositories/practitioner-availability-week.repository';
import { BuildPublishedWeekAvailabilityWindowsService } from '@modules/availability/services/build-published-week-availability-windows.service';
import { AvailabilityWeekCalendarService } from '@modules/availability/services/availability-week-calendar.service';
import { ResolvePractitionerTimezoneService } from '@modules/availability/services/resolve-practitioner-timezone.service';
import { isPresenceEffectivelyOnline } from '@modules/presence/utils/presence-liveness';
import { SessionReviewRatingAggregationService } from '@modules/reviews/services/session-review-rating-aggregation.service';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import {
  InstantBookingEligiblePractitionerPricingViewModel,
  InstantBookingEligiblePractitionerViewModel,
  InstantBookingEligiblePractitionersListViewModel,
} from '../types/instant-booking.types';
import { InstantBookingDiscoveryDuration } from '../dto/list-patient-instant-booking-practitioners.dto';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';

type DiscoveryCandidate = Awaited<
  ReturnType<
    InstantBookingPractitionerRepository['listEligibleDiscoveryCandidates']
  >
>[number];

type CurrencyCode = 'EGP' | 'USD';

const SUPPORTED_DURATIONS = [30, 60] as const;
const WINDOW_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

/**
 * Phase 2 discovery endpoint for instant booking exposes only practitioners that are truly available now.
 * The use case keeps backend as source of truth for presence, availability, conflicts, and pricing.
 */
@Injectable()
export class ListPatientInstantBookingPractitionersUseCase {
  constructor(
    private readonly instantBookingPractitionerRepository: InstantBookingPractitionerRepository,
    private readonly practitionerAvailabilityWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly availabilityWeekCalendarService: AvailabilityWeekCalendarService,
    private readonly buildPublishedWeekAvailabilityWindowsService: BuildPublishedWeekAvailabilityWindowsService,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly sessionReviewRatingAggregationService: SessionReviewRatingAggregationService,
    @Optional() private readonly patientProfileRepository?: PatientProfileRepository,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    currentUserId?: string;
    guestCountryIsoCode?: string | null;
    duration?: InstantBookingDiscoveryDuration;
    currency?: CurrencyCode;
    page: number;
    limit: number;
  }): Promise<InstantBookingEligiblePractitionersListViewModel> {
    const patientProfile = input.currentUserId && this.patientProfileRepository
      ? await this.patientProfileRepository.findByUserId(input.currentUserId)
      : null;
    const regionalResolution = resolvePaymentRegionalResolution({
      requestCountryIsoCode: input.guestCountryIsoCode ?? null,
    });
    const resolvedCurrency = regionalResolution.currencyCode as CurrencyCode;
    const now = new Date();
    const candidateRows =
      await this.instantBookingPractitionerRepository.listEligibleDiscoveryCandidates(
        {
          locale: input.locale,
          currencyCode: resolvedCurrency,
          durationMinutes: input.duration ?? null,
        },
      );

    if (candidateRows.length === 0) {
      return {
        items: [],
        meta: {
          page: input.page,
          limit: input.limit,
          total: 0,
          hasMore: false,
          generatedAt: now.toISOString(),
        },
        currencyCode: resolvedCurrency,
      };
    }

    const practitionerIds = candidateRows.map((row) => row.id);
    const ratingSummaries =
      await this.sessionReviewRatingAggregationService.aggregateByPractitionerIds(
        practitionerIds,
      );
    const completedSessionsMap =
      await this.sessionRepository.countCompletedSessionsByPractitioners(
        practitionerIds,
      );

    const sortedCandidateRows = [...candidateRows].sort((left, right) => {
      const leftRating = ratingSummaries.get(left.id)?.averageRating ?? -1;
      const rightRating = ratingSummaries.get(right.id)?.averageRating ?? -1;
      if (rightRating !== leftRating) {
        return rightRating - leftRating;
      }

      const leftExperience = left.yearsOfExperience ?? -1;
      const rightExperience = right.yearsOfExperience ?? -1;
      if (rightExperience !== leftExperience) {
        return rightExperience - leftExperience;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    });

    const eligibleItems = (
      await Promise.all(
        sortedCandidateRows.map((row) =>
          this.buildEligibleItem({
            row,
            now,
            locale: input.locale,
            rating: ratingSummaries.get(row.id)?.averageRating ?? null,
            completedSessionsCount: completedSessionsMap.get(row.id) ?? 0,
            currency: resolvedCurrency ?? input.currency ?? null,
            requestedDuration: input.duration ?? null,
          }),
        ),
      )
    ).filter((item): item is InstantBookingEligiblePractitionerViewModel =>
      Boolean(item),
    );

    const total = eligibleItems.length;
    const skip = (input.page - 1) * input.limit;
    const items = eligibleItems.slice(skip, skip + input.limit);

    return {
      items,
      meta: {
        page: input.page,
        limit: input.limit,
        total,
        hasMore: skip + items.length < total,
        generatedAt: now.toISOString(),
      },
      currencyCode: resolvedCurrency,
    };
  }

  private async buildEligibleItem(input: {
    row: DiscoveryCandidate;
    now: Date;
    locale: SupportedLocale;
    completedSessionsCount: number;
    rating: number | null;
    currency: CurrencyCode | null;
    requestedDuration: InstantBookingDiscoveryDuration | null;
  }): Promise<InstantBookingEligiblePractitionerViewModel | null> {
    const visibility = this.publicPractitionerVisibilityPolicy.evaluate({
      practitionerStatus: input.row.status,
      userStatus: input.row.user.status,
      isPublicProfilePublished: input.row.isPublicProfilePublished,
      hasPublicSlug: Boolean(input.row.publicSlug?.trim()),
      hasDisplayName: Boolean(input.row.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(input.row.professionalTitle?.trim()),
      hasBio: Boolean(input.row.bio?.trim()),
      hasAtLeastOneActiveSpecialty: input.row.specialties.length > 0,
    });

    if (!visibility.isVisible) {
      return null;
    }

    const presence = input.row.presence;
    if (!presence?.isInstantBookingEnabled) {
      return null;
    }

    if (!isPresenceEffectivelyOnline(presence, input.now)) {
      return null;
    }

    const timezone = this.resolvePractitionerTimezoneService.resolve({
      fallbackTimezone: input.row.user.timezone,
    });
    const queryStartUtc = input.now;
    const queryEndUtc = new Date(input.now.getTime() + WINDOW_LOOKAHEAD_MS);
    const weekWindow =
      this.availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow({
        timezone,
        now: input.now,
      });

    const [publishedWeeks, exceptions, blockingSessions] = await Promise.all([
      this.practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts(
        input.row.id,
        [weekWindow.currentWeek.startDate, weekWindow.nextWeek.startDate],
      ),
      this.availabilityExceptionRepository.listActiveForRange(
        input.row.id,
        queryStartUtc,
        queryEndUtc,
      ),
      this.sessionRepository.listBlockingSessionRangesInRangeForPractitioner(
        input.row.id,
        queryEndUtc,
        queryStartUtc,
        queryStartUtc,
      ),
    ]);

    if (publishedWeeks.length === 0) {
      return null;
    }

    const currentWindows =
      this.buildPublishedWeekAvailabilityWindowsService
        .buildForRange({
          timezone,
          weeks: publishedWeeks,
          exceptions,
          bookedSessions: blockingSessions
            .filter(
              (session): session is {
                practitionerId: string;
                scheduledStartAt: Date;
                scheduledEndAt: Date;
              } =>
                session.scheduledStartAt instanceof Date &&
                session.scheduledEndAt instanceof Date,
            )
            .map((session) => ({
              startsAt: session.scheduledStartAt,
              endsAt: session.scheduledEndAt,
            })),
          fromUtc: queryStartUtc,
          toUtc: queryEndUtc,
          now: queryStartUtc,
        })
        .filter((window) => {
          const startsAt = new Date(window.startsAt);
          const endsAt = new Date(window.endsAt);
          return startsAt.getTime() <= input.now.getTime() && endsAt > input.now;
        });

    if (currentWindows.length === 0) {
      return null;
    }

    const currentWindowEndsAt = currentWindows.reduce((latest, window) => {
      const windowEnd = new Date(window.endsAt);
      return !latest || windowEnd > latest ? windowEnd : latest;
    }, null as Date | null);

    if (!currentWindowEndsAt) {
      return null;
    }

    const candidatePrices = {
      30: {
        EGP: normalizeInstantPrice(input.row.instantBookingPrice30Egp),
        USD: normalizeInstantPrice(input.row.instantBookingPrice30Usd),
      },
      60: {
        EGP: normalizeInstantPrice(input.row.instantBookingPrice60Egp),
        USD: normalizeInstantPrice(input.row.instantBookingPrice60Usd),
      },
    } as const;

    const supportedDurations: number[] = [];
    const pricing: InstantBookingEligiblePractitionerPricingViewModel = {};

    for (const duration of SUPPORTED_DURATIONS) {
      const fitsNow = currentWindows.some((window) => {
        const startsAt = new Date(window.startsAt).getTime();
        const endsAt = new Date(window.endsAt).getTime();
        return (endsAt - startsAt) / 60000 >= duration;
      });

      if (!fitsNow) {
        continue;
      }

      const durationPrices: Record<string, string> = {};
      if (input.currency) {
        const price = candidatePrices[duration][input.currency];
        if (!price) {
          continue;
        }

        durationPrices[duration] = price;
        pricing[input.currency] = {
          ...(pricing[input.currency] ?? {}),
          ...durationPrices,
        };
        supportedDurations.push(duration);
        continue;
      }

      for (const currency of ['EGP', 'USD'] as const) {
        const price = candidatePrices[duration][currency];
        if (!price) {
          continue;
        }

        durationPrices[duration] = price;
        pricing[currency] = {
          ...(pricing[currency] ?? {}),
          ...durationPrices,
        };
      }

      if (Object.keys(durationPrices).length > 0) {
        supportedDurations.push(duration);
      }
    }

    if (supportedDurations.length === 0) {
      return null;
    }

    const primarySpecialty =
      input.row.specialties.find((specialty) => specialty.isPrimary) ??
      input.row.specialties[0];

    return {
      practitionerId: input.row.id,
      slug: input.row.publicSlug,
      displayName: input.row.user.displayName!.trim(),
      avatarUrl: input.row.avatarUrl ?? null,
      primarySpecialty: primarySpecialty
        ? this.pickLocalizedSpecialtyTitle(primarySpecialty.specialty.translations, input.locale)
        : null,
      title: input.row.professionalTitle?.trim() ?? null,
      isOnline: true,
      availableNow: true,
      instantBookingEnabled: true,
      earliestStartAt: input.now.toISOString(),
      currentWindowEndsAt: currentWindowEndsAt.toISOString(),
      supportedDurations,
      instantBookingPricing: pricing,
      shortBio: this.toBioSnippet(input.row.bio),
      rating: input.rating,
      completedSessionsCount: input.completedSessionsCount,
    };
  }

  private pickLocalizedSpecialtyTitle(
    translations: Array<{ locale: string; title: string }>,
    locale: SupportedLocale,
  ) {
    return (
      translations.find((item) => item.locale === locale)?.title ??
      translations.find((item) => item.locale === 'en')?.title ??
      null
    );
  }

  private toBioSnippet(fullBio: string | null): string | null {
    if (!fullBio) {
      return null;
    }

    const maxLength = 180;
    if (fullBio.length <= maxLength) {
      return fullBio;
    }

    return `${fullBio.slice(0, maxLength).trim()}...`;
  }
}

function normalizeInstantPrice(
  value: string | { toString(): string } | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.toString().trim();
  if (normalized.length === 0) {
    return null;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return normalized;
}
