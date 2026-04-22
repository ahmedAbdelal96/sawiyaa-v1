import { Injectable } from '@nestjs/common';
import {
  MatchingAnswerKey,
  PractitionerType,
  SessionMode,
} from '@prisma/client';
import {
  MatchingAnswerPayload,
  MatchingUrgencyPreference,
  NormalizedMatchingInput,
  PractitionerGenderPreference,
} from '../types/matching.types';
import { CreateMatchingSessionDto } from '../dto/create-matching-session.dto';

/**
 * Normalizes intake payload into a stable internal shape before scoring.
 * This keeps scoring deterministic and prepares answer persistence for future assessments integration.
 */
@Injectable()
export class NormalizeMatchingInputService {
  normalize(
    input: CreateMatchingSessionDto,
    fallback?: {
      countryCode?: string | null;
      timezone?: string | null;
    },
  ): {
    normalized: NormalizedMatchingInput;
    answers: MatchingAnswerPayload[];
  } {
    const normalized: NormalizedMatchingInput = {
      primaryConcern: input.primaryConcern?.trim() || null,
      preferredSpecialtySlug:
        input.preferredSpecialtySlug?.trim().toLowerCase() || null,
      preferredLanguage: input.preferredLanguage?.trim().toLowerCase() || null,
      preferredPractitionerGender:
        input.preferredPractitionerGender ?? PractitionerGenderPreference.ANY,
      sessionMode: this.normalizeSessionMode(input.sessionMode),
      urgency: input.urgency ?? MatchingUrgencyPreference.FLEXIBLE,
      budgetRange: {
        min: input.budgetRange?.min ?? null,
        max: input.budgetRange?.max ?? null,
      },
      firstTimeInTherapy:
        typeof input.firstTimeInTherapy === 'boolean'
          ? input.firstTimeInTherapy
          : null,
      preferredProviderType: input.preferredProviderType ?? null,
      preferInstantBooking:
        typeof input.preferInstantBooking === 'boolean'
          ? input.preferInstantBooking
          : null,
      countryCode:
        input.countryCode?.trim().toUpperCase() ||
        fallback?.countryCode?.trim().toUpperCase() ||
        null,
      timezone: input.timezone?.trim() || fallback?.timezone?.trim() || null,
    };

    if (
      normalized.budgetRange.min != null &&
      normalized.budgetRange.max != null &&
      normalized.budgetRange.max < normalized.budgetRange.min
    ) {
      const previousMax = normalized.budgetRange.max;
      normalized.budgetRange.max = normalized.budgetRange.min;
      normalized.budgetRange.min = previousMax;
    }

    const answers: MatchingAnswerPayload[] = [
      {
        key: MatchingAnswerKey.PRIMARY_CONCERN,
        valueJson: normalized.primaryConcern,
      },
      {
        key: MatchingAnswerKey.PREFERRED_SPECIALTY,
        valueJson: normalized.preferredSpecialtySlug,
      },
      {
        key: MatchingAnswerKey.PREFERRED_LANGUAGE,
        valueJson: normalized.preferredLanguage,
      },
      {
        key: MatchingAnswerKey.PREFERRED_PRACTITIONER_GENDER,
        valueJson: normalized.preferredPractitionerGender,
      },
      {
        key: MatchingAnswerKey.SESSION_MODE,
        valueJson: normalized.sessionMode,
      },
      {
        key: MatchingAnswerKey.URGENCY,
        valueJson: normalized.urgency,
      },
      {
        key: MatchingAnswerKey.BUDGET_RANGE,
        valueJson: normalized.budgetRange,
      },
      {
        key: MatchingAnswerKey.FIRST_TIME_IN_THERAPY,
        valueJson: normalized.firstTimeInTherapy,
      },
      {
        key: MatchingAnswerKey.PREFERRED_PROVIDER_TYPE,
        valueJson: normalized.preferredProviderType,
      },
      {
        key: MatchingAnswerKey.PREFER_INSTANT_BOOKING,
        valueJson: normalized.preferInstantBooking,
      },
      {
        key: MatchingAnswerKey.COUNTRY_CODE,
        valueJson: normalized.countryCode,
      },
      {
        key: MatchingAnswerKey.TIMEZONE,
        valueJson: normalized.timezone,
      },
    ];

    return { normalized, answers };
  }

  private normalizeSessionMode(
    mode: SessionMode | undefined,
  ): SessionMode | null {
    if (mode === SessionMode.VIDEO || mode === SessionMode.AUDIO) {
      return mode;
    }
    return null;
  }
}
