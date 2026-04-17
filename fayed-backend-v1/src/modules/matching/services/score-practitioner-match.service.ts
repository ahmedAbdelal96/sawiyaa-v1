import { Injectable } from '@nestjs/common';
import { PresenceStatus } from '@prisma/client';
import {
  MatchingScoreBreakdown,
  MatchingScoreResult,
  MatchingUrgencyPreference,
  NormalizedMatchingInput,
  PractitionerGenderPreference,
} from '../types/matching.types';

/**
 * Deterministic scoring baseline for guided matching.
 * We keep weights explicit so recommendations remain explainable and safe to audit.
 */
@Injectable()
export class ScorePractitionerMatchService {
  private static readonly SCORE_WEIGHTS = {
    specialty: 24,
    language: 16,
    budget: 18,
    urgency: 10,
    providerType: 8,
    instantBooking: 5,
    firstTime: 5,
    sessionMode: 4,
    experienceDepth: 6,
    availabilityReadiness: 4,
  } as const;

  score(input: {
    candidate: {
      practitionerType: string;
      sessionPrice30: unknown;
      sessionPrice60: unknown;
      languages: string[];
      specialtySlugs: string[];
      hasAnyAvailability: boolean;
      presenceStatus: PresenceStatus | null;
      isInstantBookingEnabled: boolean;
      yearsOfExperience: number | null;
    };
    preferences: NormalizedMatchingInput;
  }): MatchingScoreResult {
    const weights = ScorePractitionerMatchService.SCORE_WEIGHTS;
    let score = 0;

    const hasSpecialtyPreference = Boolean(
      input.preferences.preferredSpecialtySlug,
    );
    const hasLanguagePreference = Boolean(input.preferences.preferredLanguage);
    const hasProviderTypePreference = Boolean(
      input.preferences.preferredProviderType,
    );
    const hasBudgetPreference =
      input.preferences.budgetRange.min != null ||
      input.preferences.budgetRange.max != null;

    const matchedSpecialty =
      !input.preferences.preferredSpecialtySlug ||
      input.candidate.specialtySlugs.includes(
        input.preferences.preferredSpecialtySlug,
      );
    const specialtyScore = hasSpecialtyPreference
      ? matchedSpecialty
        ? weights.specialty
        : 0
      : 8;
    score += specialtyScore;

    const matchedLanguage =
      !input.preferences.preferredLanguage ||
      input.candidate.languages.includes(input.preferences.preferredLanguage);
    const languageScore = hasLanguagePreference
      ? matchedLanguage
        ? weights.language
        : 0
      : 5;
    score += languageScore;

    // V1 schema does not persist practitioner gender yet, so explicit preference can be acknowledged but not scored.
    const matchedGenderPreference =
      input.preferences.preferredPractitionerGender ===
      PractitionerGenderPreference.ANY;

    const selectedPrice =
      input.preferences.sessionMode === 'VIDEO'
        ? this.toNumberOrNull(input.candidate.sessionPrice60)
        : (this.toNumberOrNull(input.candidate.sessionPrice30) ??
          this.toNumberOrNull(input.candidate.sessionPrice60));

    const matchedSessionMode =
      input.preferences.sessionMode == null
        ? true
        : selectedPrice != null && selectedPrice > 0;
    const sessionModeScore =
      input.preferences.sessionMode == null
        ? 1
        : matchedSessionMode
          ? weights.sessionMode
          : 0;
    score += sessionModeScore;

    const budget = input.preferences.budgetRange;
    const matchedBudget =
      selectedPrice == null
        ? false
        : (budget.min == null || selectedPrice >= budget.min) &&
          (budget.max == null || selectedPrice <= budget.max);
    const budgetScore = hasBudgetPreference
      ? matchedBudget
        ? weights.budget
        : this.computeNearBudgetScore({
            selectedPrice,
            min: budget.min,
            max: budget.max,
            maxScore: weights.budget,
          })
      : 6;
    score += budgetScore;

    const matchedUrgency =
      input.preferences.urgency === MatchingUrgencyPreference.FLEXIBLE
        ? true
        : input.preferences.urgency ===
            MatchingUrgencyPreference.EARLIEST_AVAILABLE
          ? input.candidate.hasAnyAvailability
          : input.candidate.presenceStatus === PresenceStatus.ONLINE &&
            input.candidate.isInstantBookingEnabled;
    const urgencyScore =
      input.preferences.urgency === MatchingUrgencyPreference.FLEXIBLE
        ? input.candidate.hasAnyAvailability
          ? 7
          : 4
        : input.preferences.urgency ===
            MatchingUrgencyPreference.EARLIEST_AVAILABLE
          ? matchedUrgency
            ? weights.urgency
            : 1
          : matchedUrgency
            ? weights.urgency
            : input.candidate.hasAnyAvailability
              ? 3
              : 0;
    score += urgencyScore;

    const matchedProviderType =
      !input.preferences.preferredProviderType ||
      input.preferences.preferredProviderType ===
        input.candidate.practitionerType;
    const providerTypeScore = hasProviderTypePreference
      ? matchedProviderType
        ? weights.providerType
        : 0
      : 3;
    score += providerTypeScore;

    const matchedInstantBooking =
      input.preferences.preferInstantBooking !== true ||
      (input.candidate.presenceStatus === PresenceStatus.ONLINE &&
        input.candidate.isInstantBookingEnabled);
    const instantBookingScore =
      input.preferences.preferInstantBooking === true
        ? matchedInstantBooking
          ? weights.instantBooking
          : 0
        : 2;
    score += instantBookingScore;

    const matchedFirstTimePreference =
      input.preferences.firstTimeInTherapy !== true ||
      (input.candidate.yearsOfExperience != null &&
        input.candidate.yearsOfExperience >= 2);
    const firstTimeScore =
      input.preferences.firstTimeInTherapy === true
        ? matchedFirstTimePreference
          ? weights.firstTime
          : 0
        : 2;
    score += firstTimeScore;

    const experienceDepthScore = this.computeExperienceDepthScore(
      input.candidate.yearsOfExperience,
      weights.experienceDepth,
    );
    score += experienceDepthScore;

    const availabilityReadinessScore = this.computeAvailabilityReadinessScore({
      hasAnyAvailability: input.candidate.hasAnyAvailability,
      presenceStatus: input.candidate.presenceStatus,
      isInstantBookingEnabled: input.candidate.isInstantBookingEnabled,
      maxScore: weights.availabilityReadiness,
    });
    score += availabilityReadinessScore;

    const clampedScore = Math.max(0, Math.min(100, score));
    const breakdown: MatchingScoreBreakdown = {
      specialty: { earned: specialtyScore, max: weights.specialty },
      language: { earned: languageScore, max: weights.language },
      budget: { earned: budgetScore, max: weights.budget },
      urgency: { earned: urgencyScore, max: weights.urgency },
      providerType: { earned: providerTypeScore, max: weights.providerType },
      instantBooking: {
        earned: instantBookingScore,
        max: weights.instantBooking,
      },
      firstTime: { earned: firstTimeScore, max: weights.firstTime },
      sessionMode: { earned: sessionModeScore, max: weights.sessionMode },
      experienceDepth: {
        earned: experienceDepthScore,
        max: weights.experienceDepth,
      },
      availabilityReadiness: {
        earned: availabilityReadinessScore,
        max: weights.availabilityReadiness,
      },
      total: clampedScore,
    };

    return {
      score: clampedScore,
      signals: {
        matchedSpecialty,
        matchedLanguage,
        matchedGenderPreference,
        matchedSessionMode,
        matchedBudget,
        matchedUrgency,
        matchedProviderType,
        matchedInstantBooking,
        matchedFirstTimePreference,
      },
      breakdown,
    };
  }

  private computeNearBudgetScore(input: {
    selectedPrice: number | null;
    min: number | null;
    max: number | null;
    maxScore: number;
  }): number {
    if (input.selectedPrice == null) {
      return 0;
    }

    if (input.min != null && input.selectedPrice < input.min) {
      const gap = input.min - input.selectedPrice;
      const tolerance = Math.max(input.min * 0.2, 100);
      return gap <= tolerance ? Math.round(input.maxScore * 0.35) : 0;
    }

    if (input.max != null && input.selectedPrice > input.max) {
      const gap = input.selectedPrice - input.max;
      const tolerance = Math.max(input.max * 0.2, 100);
      return gap <= tolerance ? Math.round(input.maxScore * 0.35) : 0;
    }

    return 0;
  }

  private computeExperienceDepthScore(
    yearsOfExperience: number | null,
    maxScore: number,
  ): number {
    if (yearsOfExperience == null || yearsOfExperience <= 0) {
      return 0;
    }

    if (yearsOfExperience >= 15) return maxScore;
    if (yearsOfExperience >= 10) return 5;
    if (yearsOfExperience >= 7) return 4;
    if (yearsOfExperience >= 4) return 3;
    if (yearsOfExperience >= 2) return 2;
    return 1;
  }

  private computeAvailabilityReadinessScore(input: {
    hasAnyAvailability: boolean;
    presenceStatus: PresenceStatus | null;
    isInstantBookingEnabled: boolean;
    maxScore: number;
  }): number {
    if (
      input.presenceStatus === PresenceStatus.ONLINE &&
      input.isInstantBookingEnabled
    ) {
      return input.maxScore;
    }

    if (input.hasAnyAvailability) {
      return 2;
    }

    return 0;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value == null) {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof value === 'object' && value !== null && 'toString' in value) {
      const parsed = Number((value as { toString: () => string }).toString());
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }
}
