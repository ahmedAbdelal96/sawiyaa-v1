import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityExceptionRepository } from '@modules/availability/repositories/availability-exception.repository';
import { AvailabilitySlotRepository } from '@modules/availability/repositories/availability-slot.repository';
import { BuildAvailabilityWindowsService } from '@modules/availability/services/build-availability-windows.service';
import { ResolvePractitionerTimezoneService } from '@modules/availability/services/resolve-practitioner-timezone.service';
import { isPresenceEffectivelyOnline } from '@modules/presence/utils/presence-liveness';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import {
  InstantBookingEligiblePractitionerPricingViewModel,
  InstantBookingEligiblePractitionerViewModel,
  InstantBookingEligiblePractitionersListViewModel,
} from '../types/instant-booking.types';
import { InstantBookingDiscoveryDuration } from '../dto/list-patient-instant-booking-practitioners.dto';

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
    private readonly availabilitySlotRepository: AvailabilitySlotRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly buildAvailabilityWindowsService: BuildAvailabilityWindowsService,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    duration?: InstantBookingDiscoveryDuration;
    currency?: CurrencyCode;
    page: number;
    limit: number;
  }): Promise<InstantBookingEligiblePractitionersListViewModel> {
    const now = new Date();
    const candidateRows =
      await this.instantBookingPractitionerRepository.listEligibleDiscoveryCandidates(
        {
          locale: input.locale,
          currencyCode: input.currency ?? null,
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
      };
    }

    const practitionerIds = candidateRows.map((row) => row.id);
    const [weeklySlots, exceptions, blockingSessions, completedSessionsMap] =
      await Promise.all([
        this.availabilitySlotRepository.listActiveByPractitioners(
          practitionerIds,
        ),
        this.availabilityExceptionRepository.listActiveForPractitionersBetween(
          practitionerIds,
          now,
          new Date(now.getTime() + WINDOW_LOOKAHEAD_MS),
        ),
        this.sessionRepository.listBlockingSessionsInRangeForPractitioners({
          practitionerIds,
          startsBefore: new Date(now.getTime() + WINDOW_LOOKAHEAD_MS),
          endsAfter: now,
          now,
        }),
        this.sessionRepository.countCompletedSessionsByPractitioners(
          practitionerIds,
        ),
      ]);

    const slotsByPractitionerId = groupByPractitionerId(weeklySlots);
    const exceptionsByPractitionerId = groupByPractitionerId(exceptions);
    const blockingSessionsByPractitionerId = groupByPractitionerId(
      blockingSessions,
    );

    const eligibleItems = candidateRows
      .map((row) =>
        this.buildEligibleItem({
          row,
          now,
          locale: input.locale,
          slots: slotsByPractitionerId.get(row.id) ?? [],
          exceptions: exceptionsByPractitionerId.get(row.id) ?? [],
          blockingSessions: blockingSessionsByPractitionerId.get(row.id) ?? [],
          completedSessionsCount: completedSessionsMap.get(row.id) ?? 0,
          currency: input.currency ?? null,
          requestedDuration: input.duration ?? null,
        }),
      )
      .filter((item): item is InstantBookingEligiblePractitionerViewModel =>
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
    };
  }

  private buildEligibleItem(input: {
    row: DiscoveryCandidate;
    now: Date;
    locale: SupportedLocale;
    slots: Array<
      Awaited<
        ReturnType<AvailabilitySlotRepository['listActiveByPractitioners']>
      >[number]
    >;
    exceptions: Array<
      Awaited<
        ReturnType<AvailabilityExceptionRepository['listActiveForPractitionersBetween']>
      >[number]
    >;
    blockingSessions: Array<
      Awaited<
        ReturnType<SessionRepository['listBlockingSessionsInRangeForPractitioners']>
      >[number]
    >;
    completedSessionsCount: number;
    currency: CurrencyCode | null;
    requestedDuration: InstantBookingDiscoveryDuration | null;
  }): InstantBookingEligiblePractitionerViewModel | null {
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
      weeklySlots: input.slots,
      fallbackTimezone: input.row.user.timezone,
    });
    const queryStartUtc = input.now;
    const queryEndUtc = new Date(input.now.getTime() + WINDOW_LOOKAHEAD_MS);

    const currentWindows =
      this.buildAvailabilityWindowsService
        .buildForRange({
          timezone,
          weeklySlots: input.slots,
          exceptions: input.exceptions,
          bookedSessions: input.blockingSessions
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
      rating:
        input.row.ratingSummary?.averageRating === null ||
        input.row.ratingSummary?.averageRating === undefined
          ? null
          : Number(input.row.ratingSummary.averageRating),
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

function groupByPractitionerId<T extends { practitionerId: string }>(
  rows: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const current = grouped.get(row.practitionerId) ?? [];
    current.push(row);
    grouped.set(row.practitionerId, current);
  }

  return grouped;
}
