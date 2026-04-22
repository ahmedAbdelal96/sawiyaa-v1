import { SessionMode } from '@prisma/client';
import { NormalizeMatchingInputService } from './normalize-matching-input.service';
import {
  MatchingUrgencyPreference,
  PractitionerGenderPreference,
} from '../types/matching.types';

describe('NormalizeMatchingInputService', () => {
  const service = new NormalizeMatchingInputService();

  it('normalizes text/slug/language and default preferences', () => {
    const { normalized } = service.normalize({
      primaryConcern: '  Anxiety  ',
      preferredSpecialtySlug: 'Anxiety-Care',
      preferredLanguage: 'AR',
      sessionMode: SessionMode.VIDEO,
    });

    expect(normalized.primaryConcern).toBe('Anxiety');
    expect(normalized.preferredSpecialtySlug).toBe('anxiety-care');
    expect(normalized.preferredLanguage).toBe('ar');
    expect(normalized.preferredPractitionerGender).toBe(
      PractitionerGenderPreference.ANY,
    );
    expect(normalized.urgency).toBe(MatchingUrgencyPreference.FLEXIBLE);
  });

  it('swaps invalid reversed budget boundaries', () => {
    const { normalized } = service.normalize({
      budgetRange: {
        min: 1000,
        max: 300,
      },
    });

    expect(normalized.budgetRange.min).toBe(300);
    expect(normalized.budgetRange.max).toBe(1000);
  });

  it('uses shared care-signal fallback country/timezone when payload omits them', () => {
    const { normalized } = service.normalize(
      {},
      {
        countryCode: 'eg',
        timezone: 'Africa/Cairo',
      },
    );

    expect(normalized.countryCode).toBe('EG');
    expect(normalized.timezone).toBe('Africa/Cairo');
  });
});
