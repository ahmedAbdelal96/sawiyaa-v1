import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerMarketingPlacementRepository } from '@modules/marketing-practitioner-placements/repositories/practitioner-marketing-placement.repository';
import { PatientJourneyPatientRepository } from '../repositories/patient-journey-patient.repository';
import { PatientHomeRepository } from '../repositories/patient-home.repository';
import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';

const FEATURED_LIMIT = 5;
const MOST_BOOKED_LIMIT = 10;
const TOP_RATED_LIMIT = 5;
const MIN_TOP_RATED_REVIEWS = 5;
const TOP_RATED_PRIOR_REVIEWS = 20;
const HOME_DEFAULT_TIMEZONE = 'Africa/Cairo';

@Injectable()
export class GetMyPatientHomeUseCase {
  constructor(
    private readonly patientRepository: PatientJourneyPatientRepository,
    private readonly patientHomeRepository: PatientHomeRepository,
    private readonly practitionerMarketingPlacementRepository: PractitionerMarketingPlacementRepository,
  ) {}

  private getCopy(locale: SupportedLocale) {
    if (locale === 'ar') {
      return {
        featuredLabel: 'مختصين مميزين',
        recentlyVisitedLabel: 'مختصين زرتهم',
        mostBookedTodayLabel: 'الأكثر حجزًا اليوم',
        topRatedLabel: 'الأعلى تقييمًا',
        matchingLabel: 'خلّينا نساعدك تختار',
        matchingDescription: 'جاوب على كام سؤال ونرشح لك مختصين مناسبين.',
        supportLabel: 'تحتاج مساعدة؟',
        supportDescription: 'فريق الدعم هنا لمساعدتك.',
      };
    }

    return {
      featuredLabel: 'Featured specialists',
      recentlyVisitedLabel: 'Specialists you visited',
      mostBookedTodayLabel: 'Most booked today',
      topRatedLabel: 'Top rated',
      matchingLabel: "Let's help you choose",
      matchingDescription:
        'Answer a few quick questions and we will recommend suitable specialists.',
      supportLabel: 'Need help?',
      supportDescription: 'Our support team is here for you.',
    };
  }

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    requestCountryIsoCode: string | null;
  }) {
    const patient = await this.patientRepository.findByUserId(input.userId);
    if (!patient) {
      throw new NotFoundException({
        messageKey: 'patientJourney.errors.patientProfileNotFound',
        error: 'PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const copy = this.getCopy(input.locale);
    const pricing = resolvePaymentRegionalResolution({
      requestCountryIsoCode: input.requestCountryIsoCode,
    });
    const viewedRows = await this.patientHomeRepository.listRecentlyVisited(
      patient.id,
      input.locale,
      pricing.currencyCode,
    );

    const { startUtc, endUtcExclusive } = this.getDayUtcRange(
      patient.user?.timezone ?? HOME_DEFAULT_TIMEZONE,
      new Date(),
    );

    const [featuredRows, mostBookedRows, topRatedRows] = await Promise.all([
      this.practitionerMarketingPlacementRepository.listActiveHomeFeaturedPractitioners(
        {
          locale: input.locale,
          now: new Date(),
          limit: FEATURED_LIMIT,
          currencyCode: pricing.currencyCode,
        },
      ),
      this.patientHomeRepository.listMostBookedToday({
        locale: input.locale,
        fromUtc: startUtc,
        toUtc: endUtcExclusive,
        limit: MOST_BOOKED_LIMIT,
        currencyCode: pricing.currencyCode,
      }),
      this.patientHomeRepository.listTopRated({
        locale: input.locale,
        limit: TOP_RATED_LIMIT,
        minimumReviews: MIN_TOP_RATED_REVIEWS,
        priorReviews: TOP_RATED_PRIOR_REVIEWS,
        currencyCode: pricing.currencyCode,
      }),
    ]);

    const deduped = new Map<string, (typeof viewedRows)[number]>();

    for (const row of viewedRows) {
      if (deduped.has(row.slug)) {
        continue;
      }

      deduped.set(row.slug, row);

      if (deduped.size === 5) {
        break;
      }
    }

    return {
      currencyCode: pricing.currencyCode,
      featuredPractitioners: {
        currencyCode: pricing.currencyCode,
        label: copy.featuredLabel,
        status: 'IMPLEMENTED' as const,
        items: featuredRows,
      },
      recentlyVisitedPractitioners: {
        currencyCode: pricing.currencyCode,
        label: copy.recentlyVisitedLabel,
        status: 'READY' as const,
        items: Array.from(deduped.values()).map((item) => ({
          ...item,
          lastViewedAt: item.lastViewedAt.toISOString(),
        })),
      },
      mostBookedTodayPractitioners: {
        currencyCode: pricing.currencyCode,
        label: copy.mostBookedTodayLabel,
        status: 'IMPLEMENTED' as const,
        items: mostBookedRows,
      },
      topRatedPractitioners: {
        currencyCode: pricing.currencyCode,
        label: copy.topRatedLabel,
        status: 'IMPLEMENTED' as const,
        items: topRatedRows,
      },
      matchingCard: {
        label: copy.matchingLabel,
        title: copy.matchingLabel,
        description: copy.matchingDescription,
        ctaKey: 'MATCHING_INTRO' as const,
      },
      supportCard: {
        label: copy.supportLabel,
        title: copy.supportLabel,
        description: copy.supportDescription,
        ctaKey: 'SUPPORT_HOME' as const,
      },
    };
  }

  private getDayUtcRange(timezone: string, referenceDate: Date) {
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(referenceDate);

    const year = Number(dateParts.find((part) => part.type === 'year')?.value);
    const month = Number(
      dateParts.find((part) => part.type === 'month')?.value,
    );
    const day = Number(dateParts.find((part) => part.type === 'day')?.value);

    return {
      startUtc: this.getUtcInstantForLocalTime(
        timezone,
        year,
        month,
        day,
        0,
        0,
        0,
      ),
      endUtcExclusive: this.getUtcInstantForLocalTime(
        timezone,
        year,
        month,
        day + 1,
        0,
        0,
        0,
      ),
    };
  }

  private getUtcInstantForLocalTime(
    timezone: string,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
  ) {
    const utcGuess = new Date(
      Date.UTC(year, month - 1, day, hour, minute, second),
    );
    const offsetMinutes = this.getTimezoneOffsetMinutes(utcGuess, timezone);
    return new Date(utcGuess.getTime() - offsetMinutes * 60 * 1000);
  }

  private getTimezoneOffsetMinutes(date: Date, timezone: string) {
    const offsetPart = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value;

    if (!offsetPart || offsetPart === 'GMT') {
      return 0;
    }

    const match = offsetPart.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) {
      return 0;
    }

    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number(match[2] ?? '0');
    const minutes = Number(match[3] ?? '0');
    return sign * (hours * 60 + minutes);
  }
}
