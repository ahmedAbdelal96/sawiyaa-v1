import { localizeSpecialtyTitle } from './localize-specialty-title.util';

describe('localizeSpecialtyTitle', () => {
  const translations = [
    { locale: 'ar', title: 'علاج القلق' },
    { locale: 'en', title: 'Anxiety Therapy' },
  ];

  it('prefers the requested Arabic translation', () => {
    expect(
      localizeSpecialtyTitle({
        locale: 'ar',
        translations,
        nameAr: 'Legacy Arabic',
        nameEn: 'Legacy English',
        fallback: 'anxiety-therapy',
      }),
    ).toBe('علاج القلق');
  });

  it('prefers the requested English translation', () => {
    expect(
      localizeSpecialtyTitle({
        locale: 'en',
        translations,
        nameAr: 'Legacy Arabic',
        nameEn: 'Legacy English',
        fallback: 'anxiety-therapy',
      }),
    ).toBe('Anxiety Therapy');
  });

  it('falls back deterministically when the requested row is missing', () => {
    expect(
      localizeSpecialtyTitle({
        locale: 'ar',
        translations: [{ locale: 'en', title: 'Anxiety Therapy' }],
        nameAr: null,
        nameEn: 'Legacy English',
        fallback: 'anxiety-therapy',
      }),
    ).toBe('Anxiety Therapy');

    expect(
      localizeSpecialtyTitle({
        locale: 'en',
        translations: [{ locale: 'ar', title: 'علاج القلق' }],
        nameAr: 'Legacy Arabic',
        nameEn: null,
        fallback: 'anxiety-therapy',
      }),
    ).toBe('علاج القلق');
  });
});
