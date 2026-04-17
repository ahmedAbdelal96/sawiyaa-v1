import { BuildMatchingRationaleService } from './build-matching-rationale.service';

describe('BuildMatchingRationaleService', () => {
  const service = new BuildMatchingRationaleService();

  it('builds explanatory notes from score signals', () => {
    const result = service.build({
      signals: {
        matchedSpecialty: true,
        matchedLanguage: true,
        matchedGenderPreference: false,
        matchedSessionMode: true,
        matchedBudget: true,
        matchedUrgency: false,
        matchedProviderType: true,
        matchedInstantBooking: true,
        matchedFirstTimePreference: true,
      },
      breakdown: {
        specialty: { earned: 24, max: 24 },
        language: { earned: 16, max: 16 },
        budget: { earned: 18, max: 18 },
        urgency: { earned: 10, max: 10 },
        providerType: { earned: 8, max: 8 },
        instantBooking: { earned: 5, max: 5 },
        firstTime: { earned: 5, max: 5 },
        sessionMode: { earned: 4, max: 4 },
        experienceDepth: { earned: 5, max: 6 },
        availabilityReadiness: { earned: 4, max: 4 },
        total: 95,
      },
      preferredLanguage: 'ar',
      preferredSpecialtySlug: 'anxiety',
      prefersInstantBooking: true,
    });

    expect(result.notes).toContain('Matches your preferred language');
    expect(result.notes).toContain(
      'Works with your selected concern/specialty',
    );
    expect(result.notes).toContain('Fits your budget range');
    expect(result.notes).toContain(
      'Backed by strong experience depth for this care path',
    );
    expect(result.notes).toContain(
      'Practitioner gender preference is not fully supported in V1 profile data',
    );
  });
});
