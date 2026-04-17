import { PresenceStatus, SessionMode } from '@prisma/client';
import { ScorePractitionerMatchService } from './score-practitioner-match.service';
import {
  MatchingUrgencyPreference,
  PractitionerGenderPreference,
} from '../types/matching.types';

describe('ScorePractitionerMatchService', () => {
  const service = new ScorePractitionerMatchService();

  it('produces higher score for strong match signals', () => {
    const result = service.score({
      candidate: {
        practitionerType: 'PSYCHOLOGIST',
        sessionPrice30: 500,
        sessionPrice60: 900,
        languages: ['ar', 'en'],
        specialtySlugs: ['anxiety'],
        hasAnyAvailability: true,
        presenceStatus: PresenceStatus.ONLINE,
        isInstantBookingEnabled: true,
        yearsOfExperience: 6,
      },
      preferences: {
        primaryConcern: 'stress',
        preferredSpecialtySlug: 'anxiety',
        preferredLanguage: 'ar',
        preferredPractitionerGender: PractitionerGenderPreference.ANY,
        sessionMode: SessionMode.VIDEO,
        urgency: MatchingUrgencyPreference.AVAILABLE_NOW,
        budgetRange: { min: 300, max: 1000 },
        firstTimeInTherapy: true,
        preferredProviderType: null,
        preferInstantBooking: true,
        countryCode: null,
        timezone: null,
      },
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.breakdown.total).toBe(result.score);
    expect(result.breakdown.specialty.earned).toBeGreaterThan(0);
    expect(result.signals.matchedSpecialty).toBe(true);
    expect(result.signals.matchedLanguage).toBe(true);
    expect(result.signals.matchedUrgency).toBe(true);
  });

  it('reduces score when preferences mismatch', () => {
    const result = service.score({
      candidate: {
        practitionerType: 'PSYCHIATRIST',
        sessionPrice30: 1500,
        sessionPrice60: 2500,
        languages: ['en'],
        specialtySlugs: ['sleep'],
        hasAnyAvailability: false,
        presenceStatus: PresenceStatus.OFFLINE,
        isInstantBookingEnabled: false,
        yearsOfExperience: 1,
      },
      preferences: {
        primaryConcern: null,
        preferredSpecialtySlug: 'anxiety',
        preferredLanguage: 'ar',
        preferredPractitionerGender: PractitionerGenderPreference.FEMALE,
        sessionMode: SessionMode.AUDIO,
        urgency: MatchingUrgencyPreference.EARLIEST_AVAILABLE,
        budgetRange: { min: 200, max: 800 },
        firstTimeInTherapy: true,
        preferredProviderType: 'PSYCHOLOGIST',
        preferInstantBooking: true,
        countryCode: null,
        timezone: null,
      },
    });

    expect(result.score).toBeLessThan(40);
    expect(result.signals.matchedSpecialty).toBe(false);
    expect(result.signals.matchedLanguage).toBe(false);
    expect(result.signals.matchedBudget).toBe(false);
    expect(result.breakdown.budget.earned).toBeLessThanOrEqual(6);
  });
});
