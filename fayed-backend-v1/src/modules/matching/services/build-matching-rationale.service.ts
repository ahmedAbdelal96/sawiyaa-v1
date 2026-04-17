import { Injectable } from '@nestjs/common';
import {
  MatchingScoreBreakdown,
  MatchingScoreSignals,
} from '../types/matching.types';

@Injectable()
export class BuildMatchingRationaleService {
  build(input: {
    signals: MatchingScoreSignals;
    breakdown: MatchingScoreBreakdown;
    preferredLanguage: string | null;
    preferredSpecialtySlug: string | null;
    prefersInstantBooking: boolean | null;
  }) {
    const notes: string[] = [];

    if (input.signals.matchedLanguage && input.preferredLanguage) {
      notes.push('Matches your preferred language');
    }

    if (input.signals.matchedSpecialty && input.preferredSpecialtySlug) {
      notes.push('Works with your selected concern/specialty');
    }

    if (input.signals.matchedBudget) {
      notes.push('Fits your budget range');
    }

    if (input.signals.matchedUrgency) {
      notes.push('Compatible with your urgency preference');
    }

    if (input.prefersInstantBooking && input.signals.matchedInstantBooking) {
      notes.push('Currently supports instant booking preference');
    }

    if (input.breakdown.experienceDepth.earned >= 4) {
      notes.push('Backed by strong experience depth for this care path');
    }

    if (input.breakdown.availabilityReadiness.earned >= 3) {
      notes.push(
        'Shows high readiness for booking based on current availability',
      );
    }

    if (!input.signals.matchedGenderPreference) {
      notes.push(
        'Practitioner gender preference is not fully supported in V1 profile data',
      );
    }

    return {
      matchedSpecialty: input.signals.matchedSpecialty,
      matchedLanguage: input.signals.matchedLanguage,
      matchedGenderPreference: input.signals.matchedGenderPreference,
      matchedSessionMode: input.signals.matchedSessionMode,
      matchedBudget: input.signals.matchedBudget,
      matchedUrgency: input.signals.matchedUrgency,
      matchedProviderType: input.signals.matchedProviderType,
      matchedInstantBooking: input.signals.matchedInstantBooking,
      scoreBreakdown: input.breakdown,
      notes,
    };
  }
}
