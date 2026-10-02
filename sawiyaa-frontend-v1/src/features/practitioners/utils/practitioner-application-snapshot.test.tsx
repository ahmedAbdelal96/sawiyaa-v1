import { normalizePractitionerApplicationSnapshot } from './practitioner-application-snapshot';
import { describe, expect, it } from 'vitest';

describe('normalizePractitionerApplicationSnapshot', () => {
  it('reads applicant and profile fields from the canonical nested snapshot shape', () => {
    const result = normalizePractitionerApplicationSnapshot({
      applicant: { displayName: 'Submitted name', locale: 'ar', timezone: 'Africa/Cairo' },
      profile: {
        practitionerType: 'PSYCHOLOGIST',
        practitionerTypeExplicit: true,
        practitionerGender: 'FEMALE',
        countryCode: 'EG',
        professionalTitle: 'Clinical psychologist',
        bio: 'Submitted bio',
        yearsOfExperience: 8,
      },
      languageCodes: ['ar', 'en'],
      specialtySelection: {
        primarySpecialtyCategoryId: 'category-1',
        specialties: [{ specialtyId: 'specialty-1', isPrimary: true }],
      },
    });

    expect(result).toEqual({
      displayName: 'Submitted name',
      locale: 'ar',
      timezone: 'Africa/Cairo',
      practitionerType: 'PSYCHOLOGIST',
      practitionerTypeExplicit: true,
      practitionerGender: 'FEMALE',
      countryCode: 'EG',
      professionalTitle: 'Clinical psychologist',
      bio: 'Submitted bio',
      yearsOfExperience: 8,
      languageCodes: ['ar', 'en'],
      primarySpecialtyCategoryId: 'category-1',
      specialtyIds: ['specialty-1'],
      specialtySelection: {
        primarySpecialtyCategoryId: 'category-1',
        specialties: [{ specialtyId: 'specialty-1', isPrimary: true }],
      },
    });
  });
});
