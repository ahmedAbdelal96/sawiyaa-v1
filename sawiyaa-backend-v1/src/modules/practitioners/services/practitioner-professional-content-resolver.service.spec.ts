import { PractitionerProfessionalContentResolver } from './practitioner-professional-content-resolver.service';
import { isProfessionalContentLocaleComplete } from '../utils/practitioner-professional-content.util';

describe('PractitionerProfessionalContentResolver', () => {
  const resolver = new PractitionerProfessionalContentResolver();

  it('prefers the requested Arabic translation', () => {
    expect(
      resolver.resolve({
        requestedLocale: 'ar',
        translations: [
          { locale: 'ar', professionalTitle: 'اختصاصي', bio: 'نبذة عربية' },
          { locale: 'en', professionalTitle: 'Specialist', bio: 'English bio' },
        ],
        legacyProfessionalTitle: 'Legacy title',
        legacyBio: 'Legacy bio',
      }),
    ).toEqual({ professionalTitle: 'اختصاصي', bio: 'نبذة عربية' });
  });

  it('prefers the requested English translation', () => {
    expect(
      resolver.resolve({
        requestedLocale: 'en',
        translations: [
          { locale: 'ar', professionalTitle: 'اختصاصي', bio: 'نبذة عربية' },
          { locale: 'en', professionalTitle: 'Specialist', bio: 'English bio' },
        ],
      }),
    ).toEqual({ professionalTitle: 'Specialist', bio: 'English bio' });
  });

  it('falls back per field when the requested locale is partial', () => {
    expect(
      resolver.resolve({
        requestedLocale: 'ar',
        translations: [
          { locale: 'ar', professionalTitle: 'اختصاصي', bio: null },
          { locale: 'en', professionalTitle: 'Specialist', bio: 'English bio' },
        ],
      }),
    ).toEqual({ professionalTitle: 'اختصاصي', bio: 'English bio' });
  });

  it('falls back to the other supported locale when requested content is absent', () => {
    expect(
      resolver.resolve({
        requestedLocale: 'ar',
        translations: [
          { locale: 'en', professionalTitle: 'Specialist', bio: 'English bio' },
        ],
      }),
    ).toEqual({ professionalTitle: 'Specialist', bio: 'English bio' });
  });

  it('uses legacy fields when there are no translation rows', () => {
    expect(
      resolver.resolve({
        requestedLocale: 'en',
        translations: [],
        legacyProfessionalTitle: 'Legacy title',
        legacyBio: 'Legacy bio',
      }),
    ).toEqual({ professionalTitle: 'Legacy title', bio: 'Legacy bio' });
  });

  it('treats blank translated values as missing', () => {
    expect(
      resolver.resolve({
        requestedLocale: 'ar',
        translations: [
          { locale: 'ar', professionalTitle: '  ', bio: '\n' },
          { locale: 'en', professionalTitle: 'Specialist', bio: 'English bio' },
        ],
        legacyProfessionalTitle: 'Legacy title',
        legacyBio: 'Legacy bio',
      }),
    ).toEqual({ professionalTitle: 'Specialist', bio: 'English bio' });
  });

  it('uses the safe primary locale before the other supported locale', () => {
    expect(
      resolver.resolve({
        requestedLocale: 'ar',
        primaryContentLocale: 'en',
        translations: [
          {
            locale: 'en',
            professionalTitle: 'Primary title',
            bio: 'Primary bio',
          },
        ],
      }),
    ).toEqual({ professionalTitle: 'Primary title', bio: 'Primary bio' });
  });

  it('uses the configured default locale when no primary locale is available', () => {
    expect(
      resolver.resolve({
        requestedLocale: 'ar',
        defaultLocale: 'en',
        translations: [
          {
            locale: 'en',
            professionalTitle: 'Default title',
            bio: 'Default bio',
          },
        ],
      }),
    ).toEqual({ professionalTitle: 'Default title', bio: 'Default bio' });
  });

  it('returns the safe nullable contract when no content exists', () => {
    expect(
      resolver.resolve({ requestedLocale: 'ar', translations: [] }),
    ).toEqual({ professionalTitle: null, bio: null });
  });

  it('does not accept or return displayName as professional content', () => {
    const result = resolver.resolve({
      requestedLocale: 'en',
      translations: [],
      legacyProfessionalTitle: null,
      legacyBio: null,
      ...({ displayName: 'Dr. Identity' } as Record<string, string>),
    });

    expect(result).toEqual({ professionalTitle: null, bio: null });
    expect(result).not.toHaveProperty('displayName');
  });
});

describe('isProfessionalContentLocaleComplete', () => {
  it('requires both trimmed fields', () => {
    expect(
      isProfessionalContentLocaleComplete({
        professionalTitle: ' Specialist ',
        bio: ' A short bio ',
      }),
    ).toBe(true);
    expect(
      isProfessionalContentLocaleComplete({
        professionalTitle: 'Specialist',
        bio: '  ',
      }),
    ).toBe(false);
    expect(
      isProfessionalContentLocaleComplete({
        professionalTitle: null,
        bio: 'A short bio',
      }),
    ).toBe(false);
  });
});
